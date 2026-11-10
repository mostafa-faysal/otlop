import crypto from "crypto";
import { createSupabaseRequestClient } from "./client.js";
import { getSupabaseAdminClient } from "./adminClient.js";
import { normalizeSupabaseError } from "./errorNormalizer.js";
import { AppError } from "../../http/AppError.js";
import {
  mapDbCategoryToDomain,
  mapDbOfferToDomain,
  mapDbProductToDomain,
  mapDbStoreToDomain,
  mapDomainCategoryToDb,
  mapDomainOfferToDb,
  mapDomainProductToDb,
  mapDomainStoreToDb,
  unpackProductDescriptionAndMeta,
} from "./mappers/catalog.mapper.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getCategoryDefaultImages(slugOrName) {
  const text = String(slugOrName || "").toLowerCase();
  if (text.includes("مشو") || text.includes("grill") || text.includes("كباب")) {
    return {
      cover: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("فطير") || text.includes("مخبوز") || text.includes("pie") || text.includes("bake") || text.includes("بيتزا")) {
    return {
      cover: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("برجر") || text.includes("سريع") || text.includes("سندوتش") || text.includes("fast")) {
    return {
      cover: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("بقالة") || text.includes("سوبر") || text.includes("groc")) {
    return {
      cover: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("سمك") || text.includes("بحر") || text.includes("sea")) {
    return {
      cover: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("حلو") || text.includes("sweet") || text.includes("كنافة")) {
    return {
      cover: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("عصير") || text.includes("مشروب") || text.includes("drink")) {
    return {
      cover: "https://images.unsplash.com/photo-1546173159-315724a31696?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
    };
  }
  if (text.includes("كشري") || text.includes("koshary")) {
    return {
      cover: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80",
      logo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    };
  }
  return {
    cover: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=80",
    logo: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80",
  };
}

export const supabaseCatalogAdapter = {
  /**
   * جلب الأقسام والتصنيفات حصرياً من Supabase Database
   */
  async listCategories({ activeOnly = true } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      throw normalizeSupabaseError(error, "categories_fetch_failed");
    }

    return (data || []).map(mapDbCategoryToDomain);
  },

  /**
   * إنشاء تصنيف جديد في قاعدة البيانات
   */
  async createCategory(domainInput) {
    const adminClient = getSupabaseAdminClient();
    const row = mapDomainCategoryToDb(domainInput);
    const { data, error } = await adminClient
      .from("categories")
      .insert(row)
      .select("*")
      .single();

    if (error) throw normalizeSupabaseError(error, "category_create_failed");
    return mapDbCategoryToDomain(data);
  },

  /**
   * تحديث تصنيف في قاعدة البيانات
   */
  async updateCategory(id, domainInput) {
    const adminClient = getSupabaseAdminClient();
    const isUuid = UUID_REGEX.test(String(id || ""));
    const row = mapDomainCategoryToDb(domainInput);
    delete row.id;

    let query = adminClient.from("categories").update(row);
    query = isUuid ? query.eq("id", id) : query.eq("slug", id);
    const { data, error } = await query.select("*").single();

    if (error) throw normalizeSupabaseError(error, "category_update_failed");
    return mapDbCategoryToDomain(data);
  },

  /**
   * حذف تصنيف من قاعدة البيانات
   */
  async deleteCategory(id) {
    const adminClient = getSupabaseAdminClient();
    const isUuid = UUID_REGEX.test(String(id || ""));
    let query = adminClient.from("categories").delete();
    query = isUuid ? query.eq("id", id) : query.eq("slug", id);
    const { error } = await query;
    if (error) throw normalizeSupabaseError(error, "category_delete_failed");
    return true;
  },

  /**
   * جلب قائمة المتاجر الحقيقية حصرياً من Supabase Database
   */
  async listStores({
    categorySlug,
    search,
    isOpen,
    includeInactive = false,
    page = 1,
    limit = 12,
    sort = "rating",
  } = {}) {
    const supabase = includeInactive
      ? getSupabaseAdminClient()
      : await createSupabaseRequestClient();
    let storeIdsByCategory = null;

    if (categorySlug) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (cat) {
        const { data: links } = await supabase
          .from("store_categories")
          .select("store_id")
          .eq("category_id", cat.id);

        storeIdsByCategory = (links || []).map((l) => l.store_id);
      } else {
        storeIdsByCategory = [];
      }
    }

    if (storeIdsByCategory && storeIdsByCategory.length === 0) {
      return { rows: [], total: 0 };
    }

    let query = supabase.from("stores").select("*", { count: "exact" });

    // استبعاد المتاجر المحذوفة إدارياً من كافة الاستعلامات (سواء للعملاء أو في لوحة الإدارة)
    query = query.or("suspension_reason.is.null,suspension_reason.neq.محذوف إدارياً من المنصة");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    if (typeof isOpen === "boolean") {
      query = query.eq("is_open", isOpen);
    }
    if (storeIdsByCategory && storeIdsByCategory.length > 0) {
      query = query.in("id", storeIdsByCategory);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (sort === "delivery_fee") {
      query = query.order("delivery_fee", { ascending: true });
    } else if (sort === "delivery_minutes") {
      query = query.order("delivery_minutes", { ascending: true });
    } else {
      query = query
        .order("is_open", { ascending: false })
        .order("rating", { ascending: false });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: storeRows, error, count } = await query.range(from, to);

    if (error) throw normalizeSupabaseError(error);

    const storeIds = (storeRows || []).map((r) => r.id);
    let categoriesByStore = new Map();
    let offersByStore = new Map();

    if (storeIds.length > 0) {
      try {
        const [
          { data: storeCatLinks },
          { data: allCats },
          { data: activeOffers },
        ] = await Promise.all([
          adminClient
            .from("store_categories")
            .select("store_id, category_id")
            .in("store_id", storeIds),
          adminClient.from("categories").select("*"),
          adminClient
            .from("offers")
            .select("*")
            .in("store_id", storeIds)
            .eq("status", "active"),
        ]);

        const catMap = new Map((allCats || []).map((c) => [c.id, c]));
        (storeCatLinks || []).forEach((link) => {
          const catRow = catMap.get(link.category_id);
          if (catRow) {
            const prev = categoriesByStore.get(link.store_id) || [];
            prev.push(catRow);
            categoriesByStore.set(link.store_id, prev);
          }
        });

        const now = Date.now();
        (activeOffers || []).forEach((off) => {
          if (off.store_id) {
            const startTs = off.starts_at ? new Date(off.starts_at).getTime() : 0;
            const endTs = off.ends_at ? new Date(off.ends_at).getTime() : Infinity;
            if (now >= startTs && now <= endTs) {
              const prev = offersByStore.get(off.store_id) || [];
              prev.push(off);
              offersByStore.set(off.store_id, prev);
            }
          }
        });
      } catch {}
    }

    const domainStores = (storeRows || []).map((row) =>
      mapDbStoreToDomain(row, {
        categories: categoriesByStore.get(row.id) || [],
        activeOffers: offersByStore.get(row.id) || [],
      })
    );

    return {
      rows: domainStores,
      total: count || domainStores.length,
    };
  },

  /**
   * جلب تفاصيل متجر بالمعرف أو الـ slug من Supabase Database
   */
  async getStoreBySlugOrId(slugOrId) {
    const adminClient = getSupabaseAdminClient();
    const isUuid = UUID_REGEX.test(slugOrId);

    let query = adminClient.from("stores").select("*");
    query = isUuid ? query.eq("id", slugOrId) : query.eq("slug", slugOrId);

    const { data: storeRow, error } = await query.maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!storeRow) {
      throw new AppError({
        code: "store_not_found",
        message: "المتجر المطلوب غير موجود.",
        status: 404,
      });
    }

    const [{ data: storeCats }, { data: rawActiveOffers }] = await Promise.all([
      adminClient
        .from("store_categories")
        .select("category_id, categories(id, name, slug, image_url, sort_order, is_active)")
        .eq("store_id", storeRow.id),
      adminClient
        .from("offers")
        .select("*, offer_products(product_id)")
        .eq("store_id", storeRow.id)
        .eq("status", "active"),
    ]);

    const now = Date.now();
    const activeOffers = (rawActiveOffers || []).filter((off) => {
      const startTs = off.starts_at ? new Date(off.starts_at).getTime() : 0;
      const endTs = off.ends_at ? new Date(off.ends_at).getTime() : Infinity;
      return now >= startTs && now <= endTs;
    });

    const categoryRows = (storeCats || [])
      .map((sc) => sc.categories)
      .filter(Boolean);

    const storeEntity = mapDbStoreToDomain(storeRow, {
      categories: categoryRows,
      activeOffers: activeOffers || [],
    });

    return {
      store: storeEntity,
      categories: storeEntity.categories || [],
      activeOffers: storeEntity.activeOffers || [],
    };
  },

  /**
   * إنشاء متجر في Supabase
   */
  async createStore(domainInput, categoryIds = []) {
    const adminClient = getSupabaseAdminClient();
    const row = mapDomainStoreToDb({
      ...domainInput,
      isActive: domainInput.isActive !== undefined ? domainInput.isActive : true,
      isOpen: domainInput.isOpen !== undefined ? domainInput.isOpen : true,
    });

    const { data: storeRow, error } = await adminClient
      .from("stores")
      .insert(row)
      .select("*")
      .single();

    if (error) throw normalizeSupabaseError(error, "store_create_failed");

    const effectiveCategoryIds = Array.isArray(categoryIds) ? [...categoryIds] : [];
    if (effectiveCategoryIds.length === 0 && domainInput.categorySlug) {
      const { data: cat } = await adminClient
        .from("categories")
        .select("id")
        .eq("slug", domainInput.categorySlug)
        .maybeSingle();
      if (cat?.id) {
        effectiveCategoryIds.push(cat.id);
      }
    }
    if (storeRow && effectiveCategoryIds.length > 0) {
      const links = effectiveCategoryIds.map((categoryId) => ({
        store_id: storeRow.id,
        category_id: categoryId,
      }));
      await adminClient.from("store_categories").insert(links);
    }

    return mapDbStoreToDomain(storeRow);
  },

  /**
   * تحديث متجر في Supabase
   */
  async updateStore(slugOrId, domainInput, categoryIds = null) {
    const adminClient = getSupabaseAdminClient();
    const isUuid = UUID_REGEX.test(slugOrId);
    const updateColumns = mapDomainStoreToDb(domainInput);

    let query = adminClient.from("stores").update(updateColumns);
    query = isUuid ? query.eq("id", slugOrId) : query.eq("slug", slugOrId);

    const { data: storeRow, error } = await query.select("*").single();
    if (error) throw normalizeSupabaseError(error, "store_update_failed");

    if (Array.isArray(categoryIds) && storeRow) {
      await adminClient
        .from("store_categories")
        .delete()
        .eq("store_id", storeRow.id);
      if (categoryIds.length > 0) {
        await adminClient.from("store_categories").insert(
          categoryIds.map((categoryId) => ({
            store_id: storeRow.id,
            category_id: categoryId,
          }))
        );
      }
    }

    return mapDbStoreToDomain(storeRow);
  },

  /**
   * حذف متجر من Supabase (تنظيف السجلات التابعة مع الحذف الفيزيائي أو الحجب الإداري الحاسم)
   */
  async deleteStore(slugOrId) {
    const adminClient = getSupabaseAdminClient();
    const isUuid = UUID_REGEX.test(slugOrId);

    // 1) جلب معرف المتجر للتأكد من وجوده
    let storeQuery = adminClient.from("stores").select("id, slug, name");
    storeQuery = isUuid ? storeQuery.eq("id", slugOrId) : storeQuery.eq("slug", slugOrId);
    const { data: store, error: findErr } = await storeQuery.maybeSingle();
    if (findErr) throw normalizeSupabaseError(findErr, "store_fetch_failed");
    if (!store) return true;

    const storeId = store.id;

    // 2) تنظيف الجداول التابعة بالكامل لتفادي أي تعارض في قيود المفاتيح الأجنبية (Foreign Key Constraints)
    try {
      // تنظيف الطلبات التابعة للمتجر (إن وجدت)
      const { data: storeOrders } = await adminClient
        .from("orders")
        .select("id")
        .eq("store_id", storeId);

      if (storeOrders && storeOrders.length > 0) {
        const orderIds = storeOrders.map((o) => o.id);
        await adminClient.from("order_items").delete().in("order_id", orderIds);
        await adminClient.from("order_tracking_tokens").delete().in("order_id", orderIds);
        await adminClient.from("order_events").delete().in("order_id", orderIds);
        await adminClient.from("orders").delete().eq("store_id", storeId);
      }

      // تنظيف السجلات الإدارية والمالية
      await adminClient.from("merchant_commission_ledger").delete().eq("store_id", storeId);
      await adminClient.from("merchant_monthly_statements").delete().eq("store_id", storeId);
      await adminClient.from("merchant_settlement_payouts").delete().eq("store_id", storeId);
      await adminClient.from("store_status_logs").delete().eq("store_id", storeId);
      await adminClient.from("admin_audit_logs").delete().eq("store_id", storeId);

      // تنظيف العروض والمنتجات والأقسام والتقييمات
      await adminClient.from("offers").delete().eq("store_id", storeId);
      await adminClient.from("products").delete().eq("store_id", storeId);
      await adminClient.from("store_categories").delete().eq("store_id", storeId);
      await adminClient.from("reviews").delete().eq("store_id", storeId);

      // 3) الحذف الفيزيائي المباشر للمتجر من جدول stores
      const { error: deleteErr } = await adminClient.from("stores").delete().eq("id", storeId);
      if (deleteErr) {
        // حجب إداري بديل في حال وجود قيد خارجي يمنع الحذف الفيزيائي
        await adminClient
          .from("stores")
          .update({
            is_active: false,
            is_open: false,
            suspension_reason: "محذوف إدارياً من المنصة",
            suspended_at: new Date().toISOString(),
          })
          .eq("id", storeId);
      }
    } catch (err) {
      console.warn("Delete store cascade fallback:", err?.message || err);
      await adminClient
        .from("stores")
        .update({
          is_active: false,
          is_open: false,
          suspension_reason: "محذوف إدارياً من المنصة",
          suspended_at: new Date().toISOString(),
        })
        .eq("id", storeId);
    }

    return true;
  },

  /**
   * جلب المنتجات حصرياً من Supabase Database
   */
  async listProducts({
    storeId,
    categoryId,
    search,
    availableOnly = false,
  } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("products")
      .select("*, stores(id, name, slug), categories(id, name, slug)")
      .order("created_at", { ascending: false });

    if (storeId) {
      if (UUID_REGEX.test(storeId)) {
        query = query.eq("store_id", storeId);
      } else {
        const { data: st } = await supabase
          .from("stores")
          .select("id")
          .eq("slug", storeId)
          .maybeSingle();
        if (st) query = query.eq("store_id", st.id);
      }
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (availableOnly) {
      query = query.eq("is_available", true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);

    return (data || []).map((row) =>
      mapDbProductToDomain(row, {
        store: row.stores || null,
        category: row.categories || null,
      })
    );
  },

  /**
   * جلب تفاصيل منتج بالمعرف من Supabase
   */
  async getProductById(id) {
    if (!id || !UUID_REGEX.test(String(id))) {
      throw new AppError({
        code: "product_not_found",
        message: "المنتج المطلوب غير موجود.",
        status: 404,
      });
    }

    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, stores(id, name, slug), categories(id, name, slug)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) {
      throw new AppError({
        code: "product_not_found",
        message: "المنتج المطلوب غير موجود.",
        status: 404,
      });
    }

    return mapDbProductToDomain(data, {
      store: data.stores || null,
      category: data.categories || null,
    });
  },

  /**
   * إنشاء منتج جديد في Supabase
   */
  async createProduct(domainInput) {
    const adminClient = getSupabaseAdminClient();
    const row = mapDomainProductToDb(domainInput);
    const { data, error } = await adminClient
      .from("products")
      .insert(row)
      .select("*, stores(id, name, slug), categories(id, name, slug)")
      .single();

    if (error) throw normalizeSupabaseError(error, "product_create_failed");
    return mapDbProductToDomain(data, {
      store: data.stores || null,
      category: data.categories || null,
    });
  },

  /**
   * تحديث منتج في Supabase
   */
  async updateProduct(id, domainInput, existingDomainProduct = null) {
    const adminClient = getSupabaseAdminClient();
    let existingMeta = null;

    if (existingDomainProduct) {
      existingMeta = {
        description: existingDomainProduct.description,
        categoryName: existingDomainProduct.categoryName,
        sizes: existingDomainProduct.sizes || [],
        extras: existingDomainProduct.extras || existingDomainProduct.addOns || [],
        discountType: existingDomainProduct.discountType,
        discountValue: existingDomainProduct.discountValue,
      };
    } else {
      const { data: existingRow } = await adminClient
        .from("products")
        .select("description")
        .eq("id", id)
        .maybeSingle();

      if (existingRow?.description) {
        const unpacked = unpackProductDescriptionAndMeta(existingRow.description);
        existingMeta = {
          description: unpacked.description,
          ...unpacked.meta,
        };
      }
    }

    const row = mapDomainProductToDb(domainInput, existingMeta);
    delete row.id;

    const { data, error } = await adminClient
      .from("products")
      .update(row)
      .eq("id", id)
      .select("*, stores(id, name, slug), categories(id, name, slug)")
      .single();

    if (error) throw normalizeSupabaseError(error, "product_update_failed");
    return mapDbProductToDomain(data, {
      store: data.stores || null,
      category: data.categories || null,
    });
  },

  /**
   * حذف منتج من Supabase
   */
  async deleteProduct(id) {
    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.from("products").delete().eq("id", id);
    if (error) throw normalizeSupabaseError(error, "product_delete_failed");
    return true;
  },

  /**
   * جلب العروض والخصومات الحقيقية حصرياً من Supabase
   */
  async listOffers({ storeId, type, includeAllStatuses = false } = {}) {
    const adminClient = getSupabaseAdminClient();
    let query = adminClient
      .from("offers")
      .select("*, stores(id, name, slug), offer_products(product_id)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (storeId && UUID_REGEX.test(storeId)) query = query.eq("store_id", storeId);
    if (!includeAllStatuses) query = query.eq("status", "active");
    if (type === "coupon") query = query.not("code", "is", null);
    if (type === "auto") query = query.is("code", null);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);

    const now = Date.now();
    const validRows = (data || []).filter((r) => {
      if (includeAllStatuses) return true;
      if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
      if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
      return true;
    });

    return validRows.map((row) =>
      mapDbOfferToDomain(row, {
        store: row.stores || null,
      })
    );
  },

  /**
   * جلب تفاصيل عرض بالمعرف من Supabase
   */
  async getOfferById(id) {
    if (!UUID_REGEX.test(String(id || ""))) {
      return null;
    }
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("offers")
      .select("*, stores(id, name, slug), offer_products(product_id)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) {
      throw new AppError({
        code: "offer_not_found",
        message: "العرض المطلوب غير موجود.",
        status: 404,
      });
    }

    return mapDbOfferToDomain(data, {
      store: data.stores || null,
    });
  },

  /**
   * إنشاء عرض جديد في Supabase
   */
  async createOffer(domainInput, productIds = []) {
    const adminClient = getSupabaseAdminClient();
    const newId =
      domainInput.id && UUID_REGEX.test(domainInput.id)
        ? domainInput.id
        : crypto.randomUUID();
    const domainRecord = { ...domainInput, id: newId, productIds };
    const row = mapDomainOfferToDb(domainRecord);

    const { data: offerRow, error } = await adminClient
      .from("offers")
      .insert(row)
      .select("*, stores(id, name, slug)")
      .single();

    if (error) throw normalizeSupabaseError(error, "offer_create_failed");

    if (
      offerRow &&
      offerRow.applies_to === "specific" &&
      Array.isArray(productIds) &&
      productIds.length > 0
    ) {
      const links = productIds.map((pid) => ({
        offer_id: offerRow.id,
        product_id: pid,
      }));
      await adminClient.from("offer_products").insert(links);
    }

    return mapDbOfferToDomain(offerRow, { store: offerRow.stores || null });
  },

  /**
   * تحديث عرض في Supabase
   */
  async updateOffer(id, domainInput, productIds = null) {
    const adminClient = getSupabaseAdminClient();
    const row = mapDomainOfferToDb(domainInput);
    delete row.id;

    // حماية قيد check (starts_at is null or ends_at is null or starts_at <= ends_at) في PostgreSQL
    if (row.ends_at !== undefined && row.ends_at !== null) {
      const { data: currentOffer } = await adminClient
        .from("offers")
        .select("starts_at")
        .eq("id", id)
        .maybeSingle();

      const effectiveStartsAt = row.starts_at || currentOffer?.starts_at;
      if (
        effectiveStartsAt &&
        row.ends_at &&
        new Date(row.ends_at).getTime() < new Date(effectiveStartsAt).getTime()
      ) {
        row.ends_at = effectiveStartsAt;
      }
    }

    const { data: updatedRow, error } = await adminClient
      .from("offers")
      .update(row)
      .eq("id", id)
      .select("*, stores(id, name, slug)")
      .single();

    if (error) throw normalizeSupabaseError(error, "offer_update_failed");

    if (Array.isArray(productIds)) {
      await adminClient.from("offer_products").delete().eq("offer_id", id);
      if (domainInput.appliesTo === "specific" && productIds.length > 0) {
        await adminClient.from("offer_products").insert(
          productIds.map((pid) => ({
            offer_id: id,
            product_id: pid,
          }))
        );
      }
    }

    return mapDbOfferToDomain(updatedRow, { store: updatedRow.stores || null });
  },

  /**
   * حذف عرض من Supabase
   */
  async deleteOffer(id) {
    if (!UUID_REGEX.test(String(id || ""))) {
      return true;
    }
    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.from("offers").delete().eq("id", id);
    if (error) throw normalizeSupabaseError(error, "offer_delete_failed");
    return true;
  },
};
