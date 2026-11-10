import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

export const reviewsService = {
  /**
   * جلب تقييمات متجر محدد
   * @param {{ storeId: string, page?: number, limit?: number }} params
   */
  async getReviews(params = {}) {
    return axiosClient.get(ENDPOINTS.REVIEWS.LIST, { params });
  },

  /**
   * جلب كافة التقييمات للإدارة العامة (سوبر أدمن)
   */
  async listAllReviews(params = {}) {
    try {
      
      const res = await axiosClient.get(ENDPOINTS.REVIEWS.LIST, { params });
      if (res?.reviews) return res;
      if (res?.data?.items) return { reviews: res.data.items };
      if (Array.isArray(res?.items)) return { reviews: res.items };
    } catch {}
    return { reviews: [] };
  },

  /**
   * إضافة تقييم على طلب مكتمل التسليم (خلال 7 أيام)
   * @param {{ orderId: string, rating: number, comment?: string }} payload
   */
  async createReview(payload) {
    return axiosClient.post(ENDPOINTS.REVIEWS.CREATE, payload);
  },

  /**
   * تعديل تقييم (خلال 24 ساعة من إنشائه)
   * @param {string} reviewId
   * @param {{ rating: number, comment?: string, isVisible?: boolean }} payload
   */
  async updateReview(reviewId, payload) {
    return axiosClient.patch(ENDPOINTS.REVIEWS.BY_ID(reviewId), payload);
  },

  /**
   * إدارة ظهور التقييم (للسوبر أدمن: حجب أو إظهار)
   */
  async moderateReview(reviewId, { isHidden, isVisible } = {}) {
    const visible = isVisible !== undefined ? Boolean(isVisible) : !Boolean(isHidden);
    return this.updateReview(reviewId, { isVisible: visible, asAdmin: true });
  },

  /**
   * حذف تقييم نهائياً (للسوبر أدمن)
   */
  async deleteReview(reviewId) {
    return axiosClient.delete(ENDPOINTS.REVIEWS.BY_ID(reviewId), {
      data: { asAdmin: true },
    });
  },

  /**
   * جلب بلاغات التقييمات (للتاجر أو السوبر أدمن)
   */
  async getReviewReports(params = {}) {
    return axiosClient.get(ENDPOINTS.REVIEW_REPORTS.LIST, { params });
  },

  /**
   * تقديم بلاغ من التاجر ضد تقييم مسيء
   * @param {{ reviewId: string, reason: string }} payload
   */
  async createReviewReport(payload) {
    return axiosClient.post(ENDPOINTS.REVIEW_REPORTS.CREATE, payload);
  },

  /**
   * البت في بلاغ تقييم (للسوبر أدمن: resolved / dismissed)
   */
  async resolveReviewReport(reportId, payload) {
    return axiosClient.patch(ENDPOINTS.REVIEW_REPORTS.BY_ID(reportId), payload);
  },

  /**
   * جلب إشعارات المستخدم الحالي
   * @param {{ unreadOnly?: boolean, limit?: number }} [params]
   */
  async getNotifications(params = {}) {
    return axiosClient.get(ENDPOINTS.NOTIFICATIONS.LIST, { params });
  },

  /**
   * تحديد إشعار كمقروء
   */
  async markNotificationRead(notificationId) {
    return axiosClient.patch(ENDPOINTS.NOTIFICATIONS.BY_ID(notificationId), {
      isRead: true,
    });
  },

  /**
   * حذف إشعار
   */
  async deleteNotification(notificationId) {
    return axiosClient.delete(ENDPOINTS.NOTIFICATIONS.BY_ID(notificationId));
  },
};

