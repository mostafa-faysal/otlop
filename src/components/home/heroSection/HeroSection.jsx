"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/common/ProductCard";
import StoreCard from "@/components/common/StoreCard";
import { productsService } from "@/services/products.service";
import { storesService } from "@/services/stores.service";

export default function HeroSection({ showStatsBar = true, storesCount = 10 }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [matchedStores, setMatchedStores] = useState([]);

  const executeSearch = async (rawTerm) => {
    const term = (rawTerm ?? searchQuery).trim();
    if (!term) {
      setHasSearched(false);
      setMatchedProducts([]);
      setMatchedStores([]);
      router.push("/stores");
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const [prodsRes, storesRes] = await Promise.all([
        productsService.getProducts({ search: term }),
        storesService.getStores({ search: term }),
      ]);
      setMatchedProducts(
        Array.isArray(prodsRes?.products) ? prodsRes.products : []
      );
      setMatchedStores(
        Array.isArray(storesRes?.stores) ? storesRes.stores : []
      );
    } catch {
      setMatchedProducts([]);
      setMatchedStores([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    executeSearch(searchQuery);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
    setMatchedProducts([]);
    setMatchedStores([]);
  };

  return (
    <div className="w-full bg-[#F8FAF9]">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image Column (Left in RTL is visually on the left) */}
          <div className="relative order-2 lg:order-1 flex justify-center">
            <div className="relative w-full max-w-lg aspect-4/3 rounded-3xl overflow-hidden shadow-xl border border-gray-100">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&auto=format&fit=crop&q=80"
                alt="أطباق ومأكولات مصرية طازجة من مطاعم باسوس والقليوبية"
                className="w-full h-full object-cover"
              />
              {/* Floating Delivery Card */}
              <div className="absolute bottom-5 right-5 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] flex items-center justify-center text-[#0D5C58]">
                  <i className="fa-solid fa-bicycle text-lg"></i>
                </div>
                <div>
                  <h4 className="font-black text-xs text-gray-900">طازة لحد بابك</h4>
                  <p className="text-[10px] text-gray-500 font-medium">في ٢٥-٣٥ دقيقة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content Column (Right in RTL) */}
          <div className="space-y-6 order-1 lg:order-2 text-right">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4F1] text-[#0D5C58] text-xs font-bold">
              <span>أكل بلدنا، من إيدين نعرفها</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.2]">
              جعان؟ خير بلدنا<br />
              <span className="text-gray-900">لحد باب بيتك.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl">
              من كشري الحاج سيد لعيش عم حسن السخن، كل اللي بتحبه في كفر الندى دلوقتي في مكان واحد.
            </p>

            {/* Search Input Bar */}
            <form
              action="/search"
              onSubmit={handleSearch}
              className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200/80 flex items-center gap-2 max-w-xl"
            >
              <div className="relative flex-1">
                <input
                  type="search"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ابحث عن وجبة أو صنف أو مطعم..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 text-xs"
                    aria-label="مسح البحث"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-6 py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
              >
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                <span>{searching ? "جاري البحث..." : "دور على أكلك"}</span>
              </button>
            </form>

            {/* Highlights bullet points */}
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
              <span>الدفع عند الاستلام</span>
              <span>•</span>
              <span>متاجر من بلدك</span>
              <span>•</span>
              <span>أسعار من غير مفاجآت</span>
            </div>
          </div>
        </div>

        {/* Inline Live Search Results for Products & Stores */}
        {hasSearched && (
          <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-md p-5 sm:p-6 space-y-6 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-magnifying-glass text-[#0D5C58] text-sm"></i>
                <h3 className="font-black text-base sm:text-lg text-gray-900">
                  نتائج البحث عن «{searchQuery.trim()}»
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                  className="text-xs font-bold text-[#0D5C58] hover:underline"
                >
                  فتح في صفحة البحث الكاملة
                </Link>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  إغلاق النتائج
                </button>
              </div>
            </div>

            {searching ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-8 h-8 border-4 border-[#0D5C58] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-[#0D5C58]">
                  جاري البحث في الأصناف والمتاجر...
                </p>
              </div>
            ) : matchedProducts.length === 0 && matchedStores.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-bold text-gray-800">
                  لا توجد أصناف أو متاجر مطابقة لـ «{searchQuery.trim()}»
                </p>
                <p className="text-xs text-gray-500">
                  جرب البحث بكلمات مثل: كشري، حواوشي، سمك، برجر، كنافة، ملوخية
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {matchedProducts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-utensils text-[#0D5C58] text-xs"></i>
                      <span>الأصناف والوجبات ({matchedProducts.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {matchedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}

                {matchedStores.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-store text-[#0D5C58] text-xs"></i>
                      <span>المتاجر والمطاعم ({matchedStores.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {matchedStores.map((store) => (
                        <StoreCard key={store.id} store={store} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Stats Bar */}
      {showStatsBar && (
        <section className="border-y border-gray-100 bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 block">
                  ٣٠ دقيقة
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  متوسط التوصيل
                </span>
              </div>
              <div className="space-y-1 border-r border-gray-100 md:border-r">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 block">
                  {storesCount > 0 ? storesCount : 8}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  متجر محلي شريك
                </span>
              </div>
              <div className="space-y-1 border-r border-gray-100 md:border-r">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 block">
                  +٢,٥٠٠
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  طلب وصل لحد الباب
                </span>
              </div>
              <div className="space-y-1 border-r border-gray-100 md:border-r">
                <span className="text-2xl sm:text-3xl font-black text-gray-900 block">
                  ٤,٨ / ٥
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  تقييم أهل بلدنا
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
