"use client";

import { useState, useEffect, useCallback } from "react";
import { productsService } from "@/services/products.service";

/**
 * Hook لجلب قائمة المنتجات والأطباق مع دعم فلترة المتجر والتصنيف والبحث
 * @param {Object} options
 * @param {string} [options.storeId] - معرف المتجر
 * @param {string} [options.storeSlug] - اسم المتجر الإنجليزي (Slug)
 * @param {string} [options.category] - الفئة
 * @param {string} [options.search] - كلمة البحث
 * @param {boolean} [options.availableOnly=false] - المتاح فقط
 * @param {boolean} [options.enabled=true] - تفعيل الجلب التلقائي
 */
export function useProducts({
  storeId = "",
  storeSlug = "",
  category = "",
  search = "",
  availableOnly = false,
  enabled = true,
} = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productsService.getProducts({
        storeId: storeId || undefined,
        storeSlug: storeSlug || undefined,
        category: category || undefined,
        search: search || undefined,
        availableOnly,
      });
      const items = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res)
        ? res
        : [];
      setProducts(items);
      return items;
    } catch (err) {
      const message = err?.message || "تعذر تحميل قائمة المنتجات";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [storeId, storeSlug, category, search, availableOnly]);

  useEffect(() => {
    if (!enabled) return;
    fetchProducts();
  }, [enabled, fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}

