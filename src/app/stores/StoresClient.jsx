"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StoreCard from "@/components/common/StoreCard";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import StoresHeaderSearch from "@/components/stores/StoresHeaderSearch";
import StoresFilterSidebar from "@/components/stores/StoresFilterSidebar";
import StoresMobileFilterModal from "@/components/stores/StoresMobileFilterModal";
import { storeMatchesCategory } from "@/services/stores.service";
import { productsService } from "@/services/products.service";
import { useStores, useCategories } from "@/hooks";

const SORT_OPTIONS = [
  { id: "rating", label: "الأعلى تقييماً" },
  { id: "delivery_minutes", label: "الأسرع توصيلاً" },
  { id: "delivery_fee", label: "الأقل رسوم توصيل" },
  { id: "min_order", label: "الأقل حداً أدنى" },
];

function StoresContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || "";

  const { stores: allStores, loading: storesLoading } = useStores();
  const { categories: dbCategories } = useCategories({ activeOnly: true });
  const loading = storesLoading && (!allStores || allStores.length === 0);

  const [searchInput, setSearchInput] = useState("");
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filters & Sort
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [minRating4, setMinRating4] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);
  const [deliveryTimeLimit, setDeliveryTimeLimit] = useState("any");
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    setActiveCategory(categoryParam);
  }, [categoryParam]);

  const fetchProductsBySearch = async (rawTerm) => {
    const term = (rawTerm ?? searchInput).trim();
    if (!term) {
      setMatchedProducts([]);
      setSearchingProducts(false);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await productsService.getProducts({ search: term });
      setMatchedProducts(Array.isArray(res?.products) ? res.products : []);
    } catch {
      setMatchedProducts([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  useEffect(() => {
    const term = searchInput.trim();
    if (!term) {
      setMatchedProducts([]);
      setSearchingProducts(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchProductsBySearch(term);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // الأقسام المتاحة من قاعدة البيانات
  const availableCategories = useMemo(() => {
    const list = [{ id: "all", name: "كل المتاجر", slug: "" }];
    (dbCategories || [])
      .filter((cat) => cat.isActive !== false)
      .forEach((cat) => {
        list.push({ id: cat.id || cat.slug, name: cat.name, slug: cat.slug });
      });
    return list;
  }, [dbCategories]);

  const filteredStores = useMemo(() => {
    let result = [...allStores];

    if (activeCategory) {
      result = result.filter((s) => storeMatchesCategory(s, activeCategory));
    }

    const q = searchInput.trim().toLowerCase();
    if (q) {
      const productStoreIds = new Set(
        matchedProducts.map((p) => p.storeId || p.storeSlug).filter(Boolean)
      );
      result = result.filter((s) => {
        const catsText = (Array.isArray(s.categories) ? s.categories : [])
          .map((c) => (typeof c === "string" ? c : c?.name || ""))
          .join(" ")
          .toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.address || "").toLowerCase().includes(q) ||
          catsText.includes(q) ||
          productStoreIds.has(s.id) ||
          productStoreIds.has(s.slug)
        );
      });
    }

    if (onlyOpen) {
      result = result.filter((s) => s.isOpen !== false);
    }

    if (freeDelivery) {
      result = result.filter(
        (s) =>
          Number(s.deliveryFee) === 0 ||
          Boolean(s.hasFreeDeliveryOffer) ||
          (s.offerText || "").includes("توصيل مجاني")
      );
    }

    if (hasOffers) {
      result = result.filter((s) => Boolean(s.hasOffer || s.offerText));
    }

    if (minRating4) {
      result = result.filter((s) => (Number(s.rating) || 0) >= 4);
    }

    if (deliveryTimeLimit === "30") {
      result = result.filter((s) => Number(s.deliveryMinutes ?? 30) <= 30);
    }

    result.sort((a, b) => {
      if (sortBy === "delivery_minutes") {
        return (Number(a.deliveryMinutes) || 30) - (Number(b.deliveryMinutes) || 30);
      }
      if (sortBy === "delivery_fee") {
        return (Number(a.deliveryFee) || 0) - (Number(b.deliveryFee) || 0);
      }
      if (sortBy === "min_order") {
        return (
          (Number(a.minOrderAmount ?? a.minOrder) || 0) -
          (Number(b.minOrderAmount ?? b.minOrder) || 0)
        );
      }
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });

    return result;
  }, [
    allStores,
    activeCategory,
    searchInput,
    matchedProducts,
    onlyOpen,
    freeDelivery,
    hasOffers,
    minRating4,
    deliveryTimeLimit,
    sortBy,
  ]);

  const activeFiltersCount = [
    Boolean(activeCategory),
    onlyOpen,
    freeDelivery,
    minRating4,
    hasOffers,
    deliveryTimeLimit !== "any",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchInput("");
    setActiveCategory("");
    setOnlyOpen(false);
    setFreeDelivery(false);
    setMinRating4(false);
    setHasOffers(false);
    setDeliveryTimeLimit("any");
    setSortBy("rating");
    setVisibleCount(12);
  };

  const displayedStores = filteredStores.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          الرئيسية
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-bold">دليل المتاجر</span>
      </div>

      {/* Search Header */}
      <StoresHeaderSearch
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onSearchKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            fetchProductsBySearch(searchInput);
          }
        }}
        onSearchSubmit={(e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          fetchProductsBySearch(searchInput);
        }}
        onClear={() => setSearchInput("")}
        matchedProducts={matchedProducts}
        searchingProducts={searchingProducts}
        totalStoresCount={allStores.length}
      />

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {availableCategories.map((cat) => {
          const isActive = cat.slug === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-[#0D5C58] text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Quick Mobile Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="lg:hidden px-3.5 py-2 rounded-xl font-bold bg-[#E6F4F1] text-[#0D5C58] border border-teal-200 whitespace-nowrap flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <i className="fa-solid fa-sliders text-xs"></i>
          <span>فلترة وترتيب</span>
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#0D5C58] text-white text-[10px] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setOnlyOpen((prev) => !prev)}
          className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
            onlyOpen
              ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          }`}
        >
          <i className="fa-regular fa-clock text-[10px]"></i>
          <span>مفتوح الآن</span>
        </button>

        <button
          type="button"
          onClick={() => setHasOffers((prev) => !prev)}
          className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
            hasOffers
              ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          }`}
        >
          <i className="fa-solid fa-ticket-simple text-[10px]"></i>
          <span>عروض وخصومات</span>
        </button>

        <button
          type="button"
          onClick={() => setFreeDelivery((prev) => !prev)}
          className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
            freeDelivery
              ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          }`}
        >
          <i className="fa-solid fa-motorcycle text-[10px]"></i>
          <span>توصيل مجاني</span>
        </button>

        <button
          type="button"
          onClick={() => setMinRating4((prev) => !prev)}
          className={`px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
            minRating4
              ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
          }`}
        >
          <i className="fa-solid fa-star text-[10px] text-amber-500"></i>
          <span>تقييم ٤+</span>
        </button>

        {(activeFiltersCount > 0 || searchInput.trim()) && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <i className="fa-solid fa-rotate-left text-[10px]"></i>
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      {/* Grid Layout: Main Stores + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main Stores List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between gap-2 text-xs text-gray-500 pb-2">
            <span className="font-medium">
              {filteredStores.length} متجر متاح الآن
            </span>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 hidden sm:inline">ترتيب حسب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#0D5C58]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader
              type="store"
              count={6}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            />
          ) : filteredStores.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center text-2xl mx-auto">
                <i className="fa-solid fa-store-slash"></i>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                لا توجد متاجر مطابقة لبحثك
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                جرب تغيير خيارات الفلترة أو البحث بكلمات أخرى.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-block px-5 py-2 rounded-xl bg-[#0D5C58] text-white text-xs font-bold hover:bg-[#0A4845] transition-colors cursor-pointer"
              >
                عرض كل المتاجر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredStores.length && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:border-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
              >
                عرض المزيد من المتاجر ({filteredStores.length - visibleCount} إضافية)
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Filters */}
        <StoresFilterSidebar
          onlyOpen={onlyOpen}
          onToggleOnlyOpen={() => setOnlyOpen((v) => !v)}
          hasOffers={hasOffers}
          onToggleHasOffers={() => setHasOffers((v) => !v)}
          freeDelivery={freeDelivery}
          onToggleFreeDelivery={() => setFreeDelivery((v) => !v)}
          minRating4={minRating4}
          onToggleMinRating4={() => setMinRating4((v) => !v)}
          deliveryTimeLimit={deliveryTimeLimit}
          onChangeDeliveryTime={setDeliveryTimeLimit}
          onResetFilters={resetFilters}
        />
      </div>

      {/* Mobile Drawer Filter */}
      <StoresMobileFilterModal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        sortBy={sortBy}
        sortOptions={SORT_OPTIONS}
        onSelectSort={setSortBy}
        onlyOpen={onlyOpen}
        onToggleOnlyOpen={() => setOnlyOpen((v) => !v)}
        freeDelivery={freeDelivery}
        onToggleFreeDelivery={() => setFreeDelivery((v) => !v)}
        hasOffers={hasOffers}
        onToggleHasOffers={() => setHasOffers((v) => !v)}
        minRating4={minRating4}
        onToggleMinRating4={() => setMinRating4((v) => !v)}
        deliveryTimeLimit={deliveryTimeLimit}
        onChangeDeliveryTime={setDeliveryTimeLimit}
        onResetFilters={resetFilters}
        resultsCount={filteredStores.length}
      />
    </div>
  );
}

export default function StoresPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-gray-400">
          جاري تحميل المتاجر...
        </div>
      }
    >
      <StoresContent />
    </Suspense>
  );
}
