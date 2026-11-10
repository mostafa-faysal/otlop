import crypto from "crypto";
import { createSupabaseRequestClient } from "./client.js";
import { getSupabaseAdminClient } from "./adminClient.js";
import { normalizeSupabaseError } from "./errorNormalizer.js";
import { AppError } from "../../http/AppError.js";
import {
  mapDbCreateOrderResultToDomain,
  mapDbOrderToDomain,
} from "./mappers/orders.mapper.js";
import { calculateOrderFinancials } from "../../../lib/financialMath.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const supabaseOrdersAdapter = {
  /**
   * حساب المعاملات المالية وإنشاء الطلب من جهة السيرفر وقاعدة البيانات حصراً
   */
  async createOrderRpc(params) {
    const supabase = await createSupabaseRequestClient();
    const rpcItems = (params.items || []).map((item) => ({
      product_id: String(item.productId || item.product_id),
      quantity: Math.max(1, Math.min(50, Number(item.quantity) || 1)),
    }));

    const baseRpcPayload = {
      p_store_id: params.storeId,
      p_items: rpcItems,
      p_customer_name: params.customerName,
      p_customer_phone: params.customerPhone,
      p_delivery_address: params.deliveryAddress,
      p_address_id: params.addressId ?? null,
      p_notes: params.notes ?? null,
      p_coupon_code: params.couponCode ?? null,
      p_delivery_lat: params.deliveryLat ?? null,
      p_delivery_lng: params.deliveryLng ?? null,
    };

    const isStoreParamUuid = UUID_REGEX.test(String(params.storeId || ""));
    const validUuidProductIds = rpcItems
      .map((i) => i.product_id)
      .filter((pid) => UUID_REGEX.test(String(pid || "")));

    // 1) جلب بيانات المتجر والمنتجات مباشرة من قاعدة البيانات للتحقق الأمني
    const [{ data: initialStoreRow }, { data: prodRows }] = await Promise.all([
      supabase
        .from("stores")
        .select(
          "id, name, slug, logo_url, address, delivery_fee, min_order, commission_rate, is_active, is_open"
        )
        .eq(isStoreParamUuid ? "id" : "slug", params.storeId)
        .maybeSingle(),
      validUuidProductIds.length > 0
        ? supabase
            .from("products")
            .select("id, name, price, store_id, is_available")
            .in("id", validUuidProductIds)
        : Promise.resolve({ data: [] }),
    ]);

    const productOwnedStoreId =
      prodRows?.find((p) => p?.store_id)?.store_id || null;
    const resolvedStoreId =
      productOwnedStoreId || initialStoreRow?.id || params.storeId;

    let storeRow = initialStoreRow;
    if (
      (!storeRow || (resolvedStoreId && storeRow.id !== resolvedStoreId)) &&
      UUID_REGEX.test(String(resolvedStoreId || ""))
    ) {
      const { data: actualStoreRow } = await supabase
        .from("stores")
        .select(
          "id, name, slug, logo_url, address, delivery_fee, min_order, commission_rate, is_active, is_open"
        )
        .eq("id", resolvedStoreId)
        .maybeSingle();
      if (actualStoreRow) {
        storeRow = actualStoreRow;
      }
    }

    if (storeRow) {
      if (storeRow.is_active === false) {
        throw new AppError({
          code: "store_suspended",
          message: "عذراً، هذا المتجر موقوف حالياً ولا يمكن استقبال طلبات جديدة منه.",
          status: 422,
        });
      }
      if (storeRow.is_open === false) {
        throw new AppError({
          code: "store_closed",
          message: "عذراً، هذا المتجر مغلق مؤقتاً في الوقت الحالي.",
          status: 422,
        });
      }
    }

    baseRpcPayload.p_store_id = storeRow?.id || resolvedStoreId;

    // 2) ربط الأسعار الحقيقية من قاعدة البيانات وتجاهل أي أسعار مرسلة من العميل
    const dbPriceMap = new Map();
    const dbNameMap = new Map();
    (prodRows || []).forEach((p) => {
      dbPriceMap.set(String(p.id), Number(p.price) || 0);
      dbNameMap.set(String(p.id), p.name || "صنف");
    });

    const sanitizedItemsForCalc = (params.items || []).map((it) => {
      const pid = String(it.productId || it.product_id);
      const verifiedDbPrice = dbPriceMap.has(pid) ? dbPriceMap.get(pid) : 25;
      const verifiedName = it.name || dbNameMap.get(pid) || "وجبة من القائمة";
      return {
        productId: pid,
        productName: verifiedName,
        quantity: Math.max(1, Math.min(50, Number(it.quantity) || 1)),
        unitPrice: verifiedDbPrice,
      };
    });

    // 3) التحقق الأمني من كود الخصم أو عروض المتجر التلقائية
    let verifiedOffer = null;
    const rawCoupon = params.couponCode ? String(params.couponCode).trim() : null;
    const isSyntheticCoupon =
      rawCoupon && (rawCoupon === "خصم تلقائي" || rawCoupon.startsWith("خصم"));
    const cleanCouponCode = !isSyntheticCoupon && rawCoupon ? rawCoupon.toUpperCase() : null;
    baseRpcPayload.p_coupon_code = cleanCouponCode;

    if (cleanCouponCode) {
      try {
        const { data: offerRow } = await supabase
          .from("offers")
          .select("*")
          .ilike("code", cleanCouponCode)
          .eq("status", "active")
          .maybeSingle();

        if (offerRow) {
          const now = new Date();
          const startsValid = !offerRow.starts_at || new Date(offerRow.starts_at) <= now;
          const endsValid = !offerRow.ends_at || new Date(offerRow.ends_at) > now;
          const usageValid = offerRow.usage_limit == null || offerRow.used_count < offerRow.usage_limit;
          const storeValid = !offerRow.store_id || offerRow.store_id === storeRow?.id;

          if (startsValid && endsValid && usageValid && storeValid) {
            verifiedOffer = offerRow;
          }
        }
      } catch {}
    }

    if (!verifiedOffer && storeRow?.id) {
      try {
        const { data: storeAutoOffer } = await supabase
          .from("offers")
          .select("*")
          .eq("store_id", storeRow.id)
          .eq("status", "active")
          .is("code", null)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (storeAutoOffer) {
          const now = new Date();
          const startsValid = !storeAutoOffer.starts_at || new Date(storeAutoOffer.starts_at) <= now;
          const endsValid = !storeAutoOffer.ends_at || new Date(storeAutoOffer.ends_at) > now;
          const usageValid = storeAutoOffer.usage_limit == null || storeAutoOffer.used_count < storeAutoOffer.usage_limit;
          if (startsValid && endsValid && usageValid) {
            verifiedOffer = storeAutoOffer;
          }
        }
      } catch {}
    }

    // 4) إجراء العمليات الحسابية
    const financials = calculateOrderFinancials({
      items: sanitizedItemsForCalc,
      storeDeliveryFee: Number(storeRow?.delivery_fee ?? 15),
      storeCommissionRate: Number(storeRow?.commission_rate ?? 5),
      verifiedOffer,
    });

    // 5) التحقق من الحد الأدنى للطلب
    const minOrderVal = Number(storeRow?.min_order || 0);
    if (minOrderVal > 0 && financials.subtotal < minOrderVal) {
      throw new AppError({
        code: "below_min_order",
        message:
          "قيمة الطلب (" +
          financials.subtotal +
          " ج.م) أقل من الحد الأدنى للطلب في هذا المتجر (" +
          minOrderVal +
          " ج.م).",
        status: 422,
      });
    }

    // 6) استدعاء الدالة الذرية في قاعدة بيانات Supabase
    if (!UUID_REGEX.test(String(baseRpcPayload.p_store_id || ""))) {
      throw new AppError({
        code: "store_not_found",
        message: "المتجر المحدد غير صالح.",
        status: 404,
      });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_order",
      baseRpcPayload
    );

    if (rpcError) {
      throw normalizeSupabaseError(rpcError, "order_creation_failed");
    }

    // التحقق الصارم من انطباق الحسابات المالية وسقف الخصم (max_discount) على السجل المحفوظ في Supabase
    if (rpcData?.order_id) {
      const needsSync =
        Number(rpcData.discount || 0) !== Number(financials.discount || 0) ||
        Number(rpcData.total || 0) !== Number(financials.total || 0) ||
        Number(rpcData.subtotal || 0) !== Number(financials.subtotal || 0);

      if (needsSync) {
        try {
          const adminClient = getSupabaseAdminClient();
          await adminClient
            .from("orders")
            .update({
              original_subtotal: financials.subtotal,
              subtotal: financials.subtotal,
              discount: financials.discount,
              delivery_fee: financials.deliveryFee,
              total: financials.total,
              offer_id: financials.appliedOfferId || rpcData.offer_id || null,
              commission_base_amount: financials.commissionBaseAmount,
              platform_commission: financials.commissionAmount,
            })
            .eq("id", rpcData.order_id);

          rpcData.original_subtotal = financials.subtotal;
          rpcData.subtotal = financials.subtotal;
          rpcData.discount = financials.discount;
          rpcData.delivery_fee = financials.deliveryFee;
          rpcData.total = financials.total;
        } catch (syncErr) {
          console.warn("Could not sync capped financials to order:", syncErr?.message || syncErr);
        }
      }
    }

    const mappedResult = mapDbCreateOrderResultToDomain(rpcData);
    return mappedResult;
  },

  /**
   * جلب قائمة الطلبات حصرياً من Supabase Database
   */
  async listOrders({ storeId, customerId, customerPhone, status, page = 1, limit = 20 } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("orders")
      .select(
        "*, stores(id, name, slug, logo_url, address), order_items(id, order_id, product_id, product_name, original_price, unit_price, discount_amount, offer_id, quantity, line_total)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (storeId) {
      const isUuid = UUID_REGEX.test(String(storeId));
      if (isUuid) {
        query = query.eq("store_id", storeId);
      } else {
        const { data: stRow } = await supabase
          .from("stores")
          .select("id")
          .eq("slug", storeId)
          .maybeSingle();
        if (stRow) {
          query = query.eq("store_id", stRow.id);
        }
      }
    }

    if (customerId && UUID_REGEX.test(String(customerId))) {
      query = query.eq("customer_id", customerId);
    }

    if (customerPhone) {
      query = query.eq("customer_phone", customerPhone);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw normalizeSupabaseError(error, "orders_fetch_failed");
    }

    return {
      rows: (data || []).map((row) => mapDbOrderToDomain(row)),
      total: count || (data ? data.length : 0),
    };
  },

  /**
   * جلب تفاصيل طلب بالمعرف من قاعدة البيانات
   */
  async getOrderById(orderId) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("orders")
      .select("*, stores(id, name, slug, logo_url, address)");

    if (UUID_REGEX.test(String(orderId))) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", String(orderId));
    }

    const { data: orderRow, error } = await query.maybeSingle();
    if (error) throw normalizeSupabaseError(error);
    if (!orderRow) {
      throw new AppError({
        code: "order_not_found",
        message: "الطلب المطلوب غير موجود.",
        status: 404,
      });
    }

    const [{ data: items }, { data: events }] = await Promise.all([
      supabase
        .from("order_items")
        .select(
          "id, order_id, product_id, product_name, original_price, unit_price, discount_amount, offer_id, quantity, line_total"
        )
        .eq("order_id", orderRow.id)
        .order("product_name", { ascending: true }),
      supabase
        .from("order_events")
        .select("id, order_id, status, actor_id, created_at")
        .eq("order_id", orderRow.id)
        .order("created_at", { ascending: true }),
    ]);

    const orderEntity = mapDbOrderToDomain(orderRow, {
      items: items || [],
      events: events || [],
    });

    return {
      order: orderEntity,
      items: orderEntity.items || [],
      events: orderEntity.events || [],
    };
  },

  /**
   * تحديث حالة الطلب في قاعدة البيانات
   */
  async updateOrderStatus(orderId, { status }) {
    const supabase = await createSupabaseRequestClient();
    const isUuid = UUID_REGEX.test(String(orderId));
    let query = supabase.from("orders").update({ status });

    if (isUuid) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", String(orderId));
    }

    const { data, error } = await query
      .select("*, stores(id, name, slug, logo_url, address)")
      .maybeSingle();

    if (error) {
      throw normalizeSupabaseError(error, "invalid_status_transition");
    }

    if (!data) {
      throw new AppError({
        code: "order_not_found",
        message: "الطلب غير موجود في قاعدة البيانات.",
        status: 404,
      });
    }

    return mapDbOrderToDomain(data);
  },

  /**
   * تتبع طلب الضيف من قاعدة البيانات
   */
  async trackGuestOrderRpc({ orderNumber, phone, token }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNumber,
      p_phone: phone,
      p_token: token,
    });

    if (error) {
      throw normalizeSupabaseError(error, "invalid_tracking_credentials");
    }
    if (!data) {
      throw new AppError({
        code: "invalid_tracking_credentials",
        message: "رقم الطلب أو رقم الموبايل أو رمز التتبع غير صحيح.",
        status: 404,
      });
    }

    return mapDbOrderToDomain(data);
  },

  /**
   * ربط طلب الضيف بحساب مسجل في Supabase
   */
  async claimGuestOrderRpc({ orderNumber, phone, token }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("link_guest_order", {
      p_order_number: orderNumber,
      p_phone: phone,
      p_token: token,
    });

    if (error) {
      throw normalizeSupabaseError(error, "claim_guest_order_failed");
    }

    return Boolean(data);
  },
};
