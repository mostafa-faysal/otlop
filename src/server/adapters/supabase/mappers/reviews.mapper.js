export function mapDbReviewToDomain(row) {
  if (!row) return null;
  const userId = row.user_id || row.customer_id || null;
  return {
    id: row.id,
    orderId: row.order_id,
    storeId: row.store_id,
    userId,
    customerId: userId,
    customerName: "عميل أطلب",
    rating: Number(row.rating ?? 0),
    comment: row.comment || null,
    isVisible: row.is_visible !== undefined ? Boolean(row.is_visible) : true,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDbReviewReportToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    reviewId: row.review_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    status: row.status,
    adminNotes: row.admin_notes || null,
    resolvedBy: row.resolved_by || null,
    review: row.reviews
      ? {
          id: row.reviews.id,
          rating: Number(row.reviews.rating ?? 0),
          comment: row.reviews.comment || null,
          storeId: row.reviews.store_id,
          isVisible:
            row.reviews.is_visible !== undefined
              ? Boolean(row.reviews.is_visible)
              : true,
        }
      : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDbNotificationToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body || null,
    link: row.link || null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || null,
  };
}

