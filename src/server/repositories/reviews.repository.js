import { supabaseReviewsAdapter } from "../adapters/supabase/reviews.adapter";

export const reviewsRepository = {
  listReviews: (filters) => supabaseReviewsAdapter.listReviews(filters),
  getReviewById: (reviewId) => supabaseReviewsAdapter.getReviewById(reviewId),
  createReview: (payload) => supabaseReviewsAdapter.createReview(payload),
  updateReview: (reviewId, payload) =>
    supabaseReviewsAdapter.updateReview(reviewId, payload),
  deleteReview: (reviewId) => supabaseReviewsAdapter.deleteReview(reviewId),

  listReviewReports: (filters) =>
    supabaseReviewsAdapter.listReviewReports(filters),
  createReviewReport: (payload) =>
    supabaseReviewsAdapter.createReviewReport(payload),
  updateReviewReport: (reportId, payload) =>
    supabaseReviewsAdapter.updateReviewReport(reportId, payload),

  listNotifications: (userId, filters) =>
    supabaseReviewsAdapter.listNotifications(userId, filters),
  markNotificationRead: (userId, notificationId, isRead) =>
    supabaseReviewsAdapter.markNotificationRead(userId, notificationId, isRead),
  deleteNotification: (userId, notificationId) =>
    supabaseReviewsAdapter.deleteNotification(userId, notificationId),
};
