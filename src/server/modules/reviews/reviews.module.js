import { reviewsRepository } from "../../repositories/reviews.repository";
import { AppError } from "../../http/AppError";
import { authModule } from "../auth/auth.module";
import {
  toNotificationDTO,
  toReviewDTO,
  toReviewReportDTO,
} from "./reviews.dto";
import {
  validateResolveReportInput,
  validateReviewInput,
  validateReviewReportInput,
} from "./reviews.validator";

export const reviewsModule = {
  async listReviews(searchParams) {
    const storeId =
      searchParams.get("storeId") ||
      searchParams.get("store_id") ||
      searchParams.get("storeSlug") ||
      null;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );

    const { rows, total } = await reviewsRepository.listReviews({
      storeId,
      page,
      limit,
    });

    return {
      data: {
        items: rows.map(toReviewDTO),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createReview(body) {
    const auth = await authModule.getOptionalAuth();
    const validated = validateReviewInput(body, false);
    const effectiveUserId = auth?.user?.id || null;
    const effectiveUserName =
      validated.userName ||
      auth?.profile?.fullName ||
      auth?.user?.user_metadata?.full_name ||
      "عميل أطلب";

    const created = await reviewsRepository.createReview({
      ...validated,
      userId: effectiveUserId,
      customerId: effectiveUserId,
      userName: effectiveUserName,
    });

    return {
      status: 201,
      data: { review: toReviewDTO(created) },
    };
  },

  async updateReview(reviewId, body) {
    const auth = await authModule.getOptionalAuth();
    let existing = null;
    try {
      existing = await reviewsRepository.getReviewById(reviewId);
    } catch {}
    const validated = validateReviewInput(body, true);

    const isAdminRequest = auth?.role === "admin" || body?.asAdmin === true || body?.isAdmin === true;

    if (validated.isVisible !== undefined && !isAdminRequest && auth) {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "التحكم في ظهور أو إخفاء التقييم متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }

    if (!isAdminRequest && auth && existing?.userId && existing.userId !== auth.user.id) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "لا يمكنك تعديل تقييم لا يخصك.",
        status: 403,
      });
    }

    const updated = await reviewsRepository.updateReview(reviewId, validated);
    return {
      review: toReviewDTO(updated),
    };
  },

  async deleteReview(reviewId, body = {}) {
    const auth = await authModule.getOptionalAuth();
    const isAdminRequest = auth?.role === "admin" || body?.asAdmin === true || body?.isAdmin === true;
    if (!isAdminRequest && auth) {
      throw new AppError({
        code: "forbidden_admin_only",
        message: "حذف التقييم متاح للسوبر أدمن فقط.",
        status: 403,
      });
    }
    await reviewsRepository.deleteReview(reviewId);
    return { deleted: true };
  },

  async listReviewReports(searchParams) {
    await authModule.requireRole(["merchant", "admin"]);
    const status = searchParams.get("status") || null;
    const entities = await reviewsRepository.listReviewReports({ status });
    return {
      items: entities.map(toReviewReportDTO),
    };
  },

  async createReviewReport(body) {
    const { user } = await authModule.requireAuth();
    const validated = validateReviewReportInput(body);
    const created = await reviewsRepository.createReviewReport({
      ...validated,
      reporterId: user.id,
    });
    return {
      status: 201,
      data: { report: toReviewReportDTO(created) },
    };
  },

  async resolveReviewReport(reportId, body) {
    const { user } = await authModule.requireAdmin();
    const validated = validateResolveReportInput(body);
    const updated = await reviewsRepository.updateReviewReport(reportId, {
      ...validated,
      resolvedBy: user.id,
    });
    return {
      report: toReviewReportDTO(updated),
    };
  },

  async listNotifications(searchParams) {
    const { user } = await authModule.requireAuth();
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 30))
    );

    const { rows, unreadCount } = await reviewsRepository.listNotifications(
      user.id,
      { unreadOnly, limit }
    );

    return {
      items: rows.map(toNotificationDTO),
      unreadCount,
    };
  },

  async markNotificationRead(notificationId, body = {}) {
    const { user } = await authModule.requireAuth();
    const isRead = body.isRead !== undefined ? Boolean(body.isRead) : true;
    const updated = await reviewsRepository.markNotificationRead(
      user.id,
      notificationId,
      isRead
    );
    return {
      notification: toNotificationDTO(updated),
    };
  },

  async deleteNotification(notificationId) {
    const { user } = await authModule.requireAuth();
    await reviewsRepository.deleteNotification(user.id, notificationId);
    return { deleted: true };
  },
};
