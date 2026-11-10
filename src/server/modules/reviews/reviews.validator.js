import { AppError } from "../../http/AppError";

const VALID_REPORT_STATUSES = [
  "pending",
  "investigating",
  "resolved",
  "dismissed",
];

export function validateReviewInput(body = {}, isPartial = false) {
  const result = {};

  if (!isPartial) {
    const orderId = String(body.orderId || body.order_id || "").trim();
    const storeId = String(body.storeId || body.store_id || body.storeSlug || "").trim();

    if (!orderId && !storeId) {
      throw new AppError({
        code: "target_not_found",
        message: "يرجى تحديد الطلب أو المتجر المراد تقييمه.",
        status: 422,
      });
    }

    if (orderId) result.orderId = orderId;
    if (storeId) result.storeId = storeId;
    if (body.userName || body.user_name || body.customerName) {
      result.userName = String(body.userName || body.user_name || body.customerName).trim();
    }
  }

  if (!isPartial || body.rating !== undefined) {
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError({
        code: "validation_error",
        message: "التقييم يجب أن يكون رقمًا صحيحًا من 1 إلى 5 نجوم.",
        status: 422,
      });
    }
    result.rating = rating;
  }

  if (body.comment !== undefined) {
    const comment = body.comment ? String(body.comment).trim() : null;
    if (comment && comment.length > 500) {
      throw new AppError({
        code: "validation_error",
        message: "نص التقييم لا يمكن أن يتجاوز 500 حرف.",
        status: 422,
      });
    }
    result.comment = comment;
  }

  if (body.isVisible !== undefined || body.is_visible !== undefined) {
    result.isVisible = Boolean(body.isVisible ?? body.is_visible);
  }

  return result;
}

export function validateReviewReportInput(body = {}) {
  const reviewId = String(body.reviewId || body.review_id || "").trim();
  const reason = String(body.reason || "").trim();

  if (!reviewId || reason.length < 5 || reason.length > 500) {
    throw new AppError({
      code: "validation_error",
      message: "يرجى تحديد التقييم وكتابة سبب البلاغ (من 5 إلى 500 حرف).",
      status: 422,
    });
  }

  return { reviewId, reason };
}

export function validateResolveReportInput(body = {}) {
  const status = String(body.status || "").trim();
  if (!VALID_REPORT_STATUSES.includes(status)) {
    throw new AppError({
      code: "validation_error",
      message:
        "حالة البلاغ يجب أن تكون إحدى القيم: pending, investigating, resolved, dismissed.",
      status: 422,
    });
  }
  const adminNotes =
    body.adminNotes !== undefined || body.admin_notes !== undefined
      ? String(body.adminNotes ?? body.admin_notes ?? "").trim() || null
      : null;

  if (adminNotes && adminNotes.length > 500) {
    throw new AppError({
      code: "validation_error",
      message: "ملاحظات الإدارة لا يمكن أن تتجاوز 500 حرف.",
      status: 422,
    });
  }

  return { status, adminNotes };
}
