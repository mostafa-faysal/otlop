"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/common/ProductCard";
import StoreCard from "@/components/common/StoreCard";
import { storesService } from "@/services/stores.service";
import { productsService } from "@/services/products.service";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery =
    searchParams.get("search") || searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("all");
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async (rawTerm) => {
    const term = (rawTerm ?? "").trim();
    if (!term) {
      setStores([]);
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const [storesRes, prodsRes] = await Promise.all([
        storesService.getStores({ search: term }),
        productsService.getProducts({ search: term }),
      ]);
      setStores(Array.isArray(storesRes?.stores) ? storesRes.stores : []);
      setProducts(Array.isArray(prodsRes?.products) ? prodsRes.products : []);
    } catch {
      setStores([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(initialQuery);
    runSearch(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const term = query.trim();
    if (!term) return;
    runSearch(term);
    router.replace(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
        <div className="relative">
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن أكلة، وجبة، أو اسم مطعم..."
            className="w-full px-5 py-3.5 pl-12 text-sm bg-white border border-gray-200 rounded-full focus:outline-none focus:border-teal-700 shadow-sm"
          />
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-[#0D5C58]"
            aria-label="بحث"
          >
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </button>
        </div>
      </form>

      {/* Suggested Search Terms */}
      <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-gray-500">
        <span className="font-bold text-gray-700">أكثر ما يبحث عنه الناس:</span>
        {["كشري", "حواوشي", "بيتزا", "مشويات", "طاجن مكرونة", "سمك مشوي"].map((tag, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setQuery(tag);
              router.push(`/search?q=${encodeURIComponent(tag)}`);
            }}
            className="px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-teal-700 hover:text-teal-800 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 pt-4 border-b border-gray-100 pb-3">
        {[
          { id: "all", label: "الكل" },
          { id: "meals", label: `الوجبات (${products.length})` },
          { id: "stores", label: `المطاعم (${stores.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-teal-800 text-white shadow-md shadow-teal-900/10"
                : "bg-white text-gray-700 border border-gray-200 hover:border-teal-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading or Results */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-teal-900">جاري البحث في قاعدة البيانات...</p>
        </div>
      ) : (
        <div className="space-y-8 pt-4">
          {/* Stores Section */}
          {(activeTab === "all" || activeTab === "stores") && stores.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-store text-[#0D5C58] text-sm"></i>
                <span>المطاعم والمحلات المطابقة ({stores.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            </div>
          )}

          {/* Meals Section */}
          {(activeTab === "all" || activeTab === "meals") && products.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-utensils text-[#0D5C58] text-sm"></i>
                <span>الوجبات والأصناف المطابقة ({products.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>
          )}

          {products.length === 0 && stores.length === 0 && initialQuery && (
            <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 space-y-2">
              <div className="text-4xl text-gray-300">
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">
                لا توجد نتائج بحث تطابق "{initialQuery}"
              </h4>
              <p className="text-xs text-gray-500">
                تأكد من كتابة الكلمات بشكل صحيح أو جرب البحث بكلمات عامة مثل كشري أو بيتزا
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-teal-800 font-bold">جاري البحث...</div>}>
      <SearchContent />
    </Suspense>
  );
}
