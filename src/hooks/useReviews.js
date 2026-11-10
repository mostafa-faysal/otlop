"use client";

import { useState, useEffect, useCallback } from "react";
import { reviewsService } from "@/services/reviews.service";

/**
 * Hook لجلب التقييمات وآراء العملاء
 * @param {Object} options
 * @param {string} [options.storeId] - فلترة لمتجر محدد
 * @param {string} [options.storeSlug] - كود المتجر
 * @param {number} [options.limit=20] - عدد التقييمات
 * @param {boolean} [options.fiveStarsOnly=false] - جلب تقييمات 5 نجوم فقط (لمربع الآراء)
 * @param {boolean} [options.enabled=true] - تفعيل الجلب التلقائي
 */
export function useReviews({
  storeId = "",
  storeSlug = "",
  limit = 20,
  fiveStarsOnly = false,
  enabled = true,
} = {}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewsService.listAllReviews({
        storeId: storeId || undefined,
        storeSlug: storeSlug || undefined,
        limit,
      });
      const items = Array.isArray(res?.reviews)
        ? res.reviews
        : Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];

      const filtered = fiveStarsOnly
        ? items.filter((r) => Number(r.rating) === 5 && r.comment)
        : items;

      setReviews(filtered);
      return filtered;
    } catch (err) {
      const message = err?.message || "تعذر تحميل التقييمات";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storeId, storeSlug, limit, fiveStarsOnly]);

  useEffect(() => {
    if (!enabled) return;
    fetchReviews();

    const handleReviewsUpdate = () => {
      fetchReviews();
    };

    window.addEventListener("otlob_reviews_updated", handleReviewsUpdate);
    window.addEventListener("storage", handleReviewsUpdate);

    return () => {
      window.removeEventListener("otlob_reviews_updated", handleReviewsUpdate);
      window.removeEventListener("storage", handleReviewsUpdate);
    };
  }, [enabled, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews,
  };
}

