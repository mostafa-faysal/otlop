import { createSupabaseRequestClient } from "./client.js";
import { normalizeSupabaseError } from "./errorNormalizer.js";
import { AppError } from "../../http/AppError.js";
import {
  mapDbNotificationToDomain,
  mapDbReviewReportToDomain,
  mapDbReviewToDomain,
} from "./mappers/reviews.mapper.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const supabaseReviewsAdapter = {
  /**
   * جلب التقييمات حصرياً ومباشرة من قاعدة بيانات Supabase
   */
  async listReviews({ storeId, storeSlug, page = 1, limit = 20 } = {}) {
    const supabase = await createSupabaseRequestClient();

    let targetStoreUuid = null;
    const targetStoreIdentifier = storeId || storeSlug || null;

    if (targetStoreIdentifier) {
      if (UUID_REGEX.test(String(targetStoreIdentifier))) {
        targetStoreUuid = targetStoreIdentifier;
      } else {
        try {
          const { data: st } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", targetStoreIdentifier)
            .maybeSingle();
          if (st) targetStoreUuid = st.id;
        } catch {}
      }
    }

    try {
      let query = supabase
        .from("reviews")
        .select("*, stores(id, name, slug)", { count: "exact" })
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (targetStoreUuid) {
        query = query.eq("store_id", targetStoreUuid);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw normalizeSupabaseError(error);

      return {
        rows: (data || []).map((row) => ({
          ...mapDbReviewToDomain(row),
          storeName: row.stores?.name || null,
          storeSlug: row.stores?.slug || null,
        })),
        total: count || (data ? data.length : 0),
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      return { rows: [], total: 0 };
    }
  },

  /**
   * جلب تفاصيل تقييم بالمعرف من قاعدة البيانات
   */
  async getReviewById(reviewId) {
    if (!reviewId || !UUID_REGEX.test(String(reviewId))) {
      throw new AppError({
        code: "review_not_found",
        message: "التقييم المطلوب غير موجود.",
        status: 404,
      });
    }

    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*, stores(id, name, slug)")
      .eq("id", reviewId)
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) {
      throw new AppError({
        code: "review_not_found",
        message: "التقييم المطلوب غير موجود.",
        status: 404,
      });
    }

    return {
      ...mapDbReviewToDomain(data),
      storeName: data.stores?.name || null,
      storeSlug: data.stores?.slug || null,
    };
  },

  /**
   * إنشاء تقييم جديد مبني على علاقة حقيقية بطلب مكتمل في قاعدة البيانات
   */
  async createReview({ orderId, storeId, customerId, userId, userName, rating, comment }) {
    const supabase = await createSupabaseRequestClient();
    let resolvedOrderId = null;
    let resolvedStoreId = null;

    if (!orderId) {
      throw new AppError({
        code: "order_id_required",
        message: "لا يمكن إضافة تقييم إلا استناداً لطلب شراء حقيقي ومكتمل.",
        status: 400,
      });
    }

    // التحقق من وجود الطلب في قاعدة البيانات
    let orderQuery = supabase
      .from("orders")
      .select("id, store_id, customer_id, status");

    if (UUID_REGEX.test(String(orderId))) {
      orderQuery = orderQuery.eq("id", orderId);
    } else {
      orderQuery = orderQuery.eq("order_number", String(orderId));
    }

    const { data: order, error: ordErr } = await orderQuery.maybeSingle();
    if (ordErr || !order) {
      throw new AppError({
        code: "order_not_found",
        message: "الطلب المراد تقييمه غير موجود في النظام.",
        status: 404,
      });
    }

    resolvedOrderId = order.id;
    resolvedStoreId = order.store_id;

    const effectiveUserId = userId || customerId || order.customer_id || null;
    const insertPayload = {
      order_id: resolvedOrderId,
      store_id: resolvedStoreId,
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      comment: comment ? String(comment).trim() : null,
      is_visible: true,
    };

    if (effectiveUserId && UUID_REGEX.test(String(effectiveUserId))) {
      insertPayload.user_id = effectiveUserId;
    }

    const { data: insertedRow, error: insErr } = await supabase
      .from("reviews")
      .insert(insertPayload)
      .select("*, stores(id, name, slug)")
      .single();

    if (insErr) {
      throw normalizeSupabaseError(insErr, "create_review_failed");
    }

    // إعادة احتساب وتحديث متوسط تقييم المتجر في قاعدة بيانات Supabase
    try {
      const { data: storeRevs } = await supabase
        .from("reviews")
        .select("rating")
        .eq("store_id", resolvedStoreId)
        .eq("is_visible", true);

      if (storeRevs && storeRevs.length > 0) {
        const count = storeRevs.length;
        const avg = Number(
          (storeRevs.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count).toFixed(1)
        );
        await supabase
          .from("stores")
          .update({ rating: avg, reviews_count: count })
          .eq("id", resolvedStoreId);
      }
    } catch (recalcErr) {
      console.warn("Store rating recalculation notice:", recalcErr.message);
    }

    return {
      ...mapDbReviewToDomain(insertedRow),
      storeName: insertedRow.stores?.name || null,
      storeSlug: insertedRow.stores?.slug || null,
    };
  },

  /**
   * تحديث حالة أو تعليق التقييم في Supabase
   */
  async updateReview(reviewId, { rating, comment, isVisible }) {
    if (!reviewId || !UUID_REGEX.test(String(reviewId))) {
      throw new AppError({
        code: "review_not_found",
        message: "التقييم المطلوب غير موجود.",
        status: 404,
      });
    }

    const supabase = await createSupabaseRequestClient();
    const updateCols = {};
    if (rating !== undefined) updateCols.rating = Math.max(1, Math.min(5, Number(rating) || 5));
    if (comment !== undefined) updateCols.comment = comment ? String(comment).trim() : null;
    if (isVisible !== undefined) updateCols.is_visible = Boolean(isVisible);

    const { data, error } = await supabase
      .from("reviews")
      .update(updateCols)
      .eq("id", reviewId)
      .select("*, stores(id, name, slug)")
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) {
      throw new AppError({
        code: "review_not_found",
        message: "التقييم المطلوب غير موجود.",
        status: 404,
      });
    }

    // إعادة حساب التقييم للمتجر
    if (data.store_id) {
      try {
        const { data: storeRevs } = await supabase
          .from("reviews")
          .select("rating")
          .eq("store_id", data.store_id)
          .eq("is_visible", true);

        const count = storeRevs ? storeRevs.length : 0;
        const avg = count > 0
          ? Number((storeRevs.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count).toFixed(1))
          : 0;

        await supabase
          .from("stores")
          .update({ rating: avg, reviews_count: count })
          .eq("id", data.store_id);
      } catch {}
    }

    return {
      ...mapDbReviewToDomain(data),
      storeName: data.stores?.name || null,
      storeSlug: data.stores?.slug || null,
    };
  },

  /**
   * حذف تقييم من Supabase
   */
  async deleteReview(reviewId) {
    if (!reviewId || !UUID_REGEX.test(String(reviewId))) {
      throw new AppError({
        code: "review_not_found",
        message: "التقييم المطلوب غير موجود.",
        status: 404,
      });
    }

    const supabase = await createSupabaseRequestClient();
    const { data: existing } = await supabase
      .from("reviews")
      .select("store_id")
      .eq("id", reviewId)
      .maybeSingle();

    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) throw normalizeSupabaseError(error);

    // إعادة حساب تقييم المتجر بعد الحذف
    if (existing?.store_id) {
      try {
        const { data: storeRevs } = await supabase
          .from("reviews")
          .select("rating")
          .eq("store_id", existing.store_id)
          .eq("is_visible", true);

        const count = storeRevs ? storeRevs.length : 0;
        const avg = count > 0
          ? Number((storeRevs.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / count).toFixed(1))
          : 0;

        await supabase
          .from("stores")
          .update({ rating: avg, reviews_count: count })
          .eq("id", existing.store_id);
      } catch {}
    }

    return true;
  },

  async listReviewReports({ status } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("review_reports")
      .select("*, reviews(id, rating, comment, store_id, is_visible)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbReviewReportToDomain);
  },

  async createReviewReport({ reviewId, reporterId, reason }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("review_reports")
      .insert({
        review_id: reviewId,
        reporter_id: reporterId,
        reason,
      })
      .select("*, reviews(id, rating, comment, store_id, is_visible)")
      .single();

    if (error) throw normalizeSupabaseError(error);
    return mapDbReviewReportToDomain(data);
  },

  async updateReviewReport(reportId, { status, adminNotes }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("review_reports")
      .update({
        status,
        admin_notes: adminNotes ?? null,
      })
      .eq("id", reportId)
      .select("*, reviews(id, rating, comment, store_id, is_visible)")
      .single();

    if (error) throw normalizeSupabaseError(error);
    return mapDbReviewReportToDomain(data);
  },

  async listNotifications(userId, { unreadOnly = false, limit = 30 } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const [{ data, error }, { count: unreadCount }] = await Promise.all([
      query,
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    ]);

    if (error) throw normalizeSupabaseError(error);
    return {
      rows: (data || []).map(mapDbNotificationToDomain),
      unreadCount: unreadCount || 0,
    };
  },

  async markNotificationRead(userId, notificationId, isRead = true) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: Boolean(isRead) })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw normalizeSupabaseError(error);
    return mapDbNotificationToDomain(data);
  },

  async deleteNotification(userId, notificationId) {
    const supabase = await createSupabaseRequestClient();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) throw normalizeSupabaseError(error);
    return true;
  },
};
