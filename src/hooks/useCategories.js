"use client";

import { useState, useEffect, useCallback } from "react";
import { storesService } from "@/services/stores.service";

/**
 * Hook لجلب تصنيفات الأطعمة والمتاجر من قاعدة البيانات
 * @param {Object} options
 * @param {boolean} [options.activeOnly=true] - جلب الفئات النشطة فقط
 * @param {boolean} [options.enabled=true] - بدء الجلب تلقائياً
 */
export function useCategories({ activeOnly = true, enabled = true } = {}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storesService.getCategories({ activeOnly });
      const items = Array.isArray(res?.categories)
        ? res.categories
        : Array.isArray(res)
        ? res
        : [];
      setCategories(items);
      return items;
    } catch (err) {
      const message =
        err?.message || "حدث خطأ أثناء تحميل أقسام وتصنيفات المتاجر";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    if (!enabled) return;
    fetchCategories();

    // الاستماع للتحديثات الفورية للفئات عبر النوافذ أو لوحة الإدارة
    const handleCategoryUpdate = () => {
      fetchCategories();
    };

    window.addEventListener("otlob_categories_updated", handleCategoryUpdate);
    window.addEventListener("storage", handleCategoryUpdate);

    return () => {
      window.removeEventListener("otlob_categories_updated", handleCategoryUpdate);
      window.removeEventListener("storage", handleCategoryUpdate);
    };
  }, [enabled, fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

