"use client";

import { useState, useEffect, useCallback } from "react";
import { productsService } from "@/services/products.service";

/**
 * Hook لجلب العروض والخصومات الفعالة
 * @param {Object} options
 * @param {string} [options.storeId] - فلترة لمتجر محدد
 * @param {boolean} [options.includeAllStatuses=false] - جلب كافة الحالات (للإدارة) أو النشطة فقط
 * @param {boolean} [options.enabled=true] - بدء الجلب التلقائي
 */
export function useOffers({
  storeId = "",
  includeAllStatuses = false,
  enabled = true,
} = {}) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsService.getOffers({
        storeId: storeId || undefined,
        includeAllStatuses,
      });
      const items = Array.isArray(res?.offers)
        ? res.offers
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      setOffers(items);
      return items;
    } catch (err) {
      const message = err?.message || "تعذر تحميل قائمة العروض الحالية";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storeId, includeAllStatuses]);

  useEffect(() => {
    if (!enabled) return;
    fetchOffers();

    const handleOffersUpdate = () => {
      fetchOffers();
    };

    window.addEventListener("otlob_offers_updated", handleOffersUpdate);
    window.addEventListener("storage", handleOffersUpdate);

    return () => {
      window.removeEventListener("otlob_offers_updated", handleOffersUpdate);
      window.removeEventListener("storage", handleOffersUpdate);
    };
  }, [enabled, fetchOffers]);

  return {
    offers,
    loading,
    error,
    refetch: fetchOffers,
  };
}

