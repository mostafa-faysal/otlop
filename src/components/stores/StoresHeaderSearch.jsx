"use client";

import Link from "next/link";
import ProductCard from "@/components/common/ProductCard";

export default function StoresHeaderSearch({
  searchInput = "",
  onSearchChange = () => {},
  onSearchKeyDown = () => {},
  onSearchSubmit = () => {},
  onClear = () => {},
  matchedProducts = [],
  searchingProducts = false,
  totalStoresCount = 0,
}) {
  return (
    <div className="space-y-4">
      {/* Page Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900">
          محلات بلدنا، كلها قريبة منك
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {totalStoresCount} متجر ومطعم محلي معتمد • أكل سخن وطازة لحد باب بيتك
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={onSearchSubmit} className="space-y-2">
        <label className="block text-xs font-bold text-gray-700">
          ابحث عن متجر أو أكلة أو صنف
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="search"
              name="search"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="ابحث عن وجبة أو صنف أو اسم المحل (كشري، حواوشي، مشويات، سمك...)"
              className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-8 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0D5C58]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={onClear}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                aria-label="مسح البحث"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shrink-0"
          >
            بحث
          </button>
        </div>
      </form>

      {/* Matched Dishes Section */}
      {searchInput.trim() && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-utensils text-[#0D5C58]"></i>
              <span>وجبات وأصناف مطابقة للبحث</span>
            </span>
            <span className="text-gray-400">
              {searchingProducts ? "جاري البحث..." : `${matchedProducts.length} وجبة`}
            </span>
          </div>

          {matchedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {matchedProducts.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : !searchingProducts ? (
            <p className="text-xs text-gray-400 py-1">
              لا توجد وجبات مسجلة بهذا الاسم تحديداً، لكن المتاجر أدناه قد توفر طلبك.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

