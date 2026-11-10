"use client";

import { useState, useEffect, useCallback } from "react";
import { storesService } from "@/services/stores.service";

/**
 * Hook لجلب قائمة المتاجر والمطاعم مع إمكانية الفلترة والبحث
 * @param {Object} options
 * @param {string} [options.category] - تصنيف المتجر
 * @param {string} [options.search] - كلمة البحث
 * @param {boolean} [options.activeOnly=true] - المتاجر النشطة فقط
 * @param {boolean} [options.enabled=true] - تفعيل الجلب التلقائي
 */
export function useStores({
  category = "",
  search = "",
  activeOnly = true,
  enabled = true,
} = {}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storesService.getStores({
        category: category || undefined,
        search: search || undefined,
        activeOnly,
      });
      const items = Array.isArray(res?.stores)
        ? res.stores
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      setStores(items);
      return items;
    } catch (err) {
      const message = err?.message || "تعذر تحميل قائمة المتاجر";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [category, search, activeOnly]);

  useEffect(() => {
    if (!enabled) return;
    fetchStores();

    const handleStoresUpdate = () => {
      fetchStores();
    };

    window.addEventListener("otlob_stores_updated", handleStoresUpdate);
    window.addEventListener("storage", handleStoresUpdate);

    return () => {
      window.removeEventListener("otlob_stores_updated", handleStoresUpdate);
      window.removeEventListener("storage", handleStoresUpdate);
    };
  }, [enabled, fetchStores]);

  return {
    stores,
    loading,
    error,
    refetch: fetchStores,
  };
}

