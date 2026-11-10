export function toReviewDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    orderId: entity.orderId,
    storeId: entity.storeId,
    storeName: entity.storeName || null,
    storeSlug: entity.storeSlug || null,
    userId: entity.userId || entity.customerId || null,
    customerId: entity.customerId || entity.userId || null,
    userName: entity.userName || entity.customerName || "عميل أطلب",
    customerName: entity.customerName || entity.userName || "عميل أطلب",
    rating: Number(entity.rating ?? 0),
    comment: entity.comment || null,
    isVisible: entity.isVisible !== undefined ? Boolean(entity.isVisible) : true,
    createdAt: entity.createdAt || null,
    updatedAt: entity.updatedAt || null,
  };
}

export function toReviewReportDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    reviewId: entity.reviewId,
    reporterId: entity.reporterId,
    reason: entity.reason,
    status: entity.status,
    adminNotes: entity.adminNotes || null,
    resolvedBy: entity.resolvedBy || null,
    review: entity.review
      ? {
          id: entity.review.id,
          rating: Number(entity.review.rating ?? 0),
          comment: entity.review.comment || null,
          storeId: entity.review.storeId,
          isVisible:
            entity.review.isVisible !== undefined
              ? Boolean(entity.review.isVisible)
              : true,
        }
      : null,
    createdAt: entity.createdAt || null,
    updatedAt: entity.updatedAt || null,
  };
}

export function toNotificationDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    userId: entity.userId,
    title: entity.title,
    body: entity.body || null,
    link: entity.link || null,
    isRead: Boolean(entity.isRead),
    createdAt: entity.createdAt || null,
  };
}
