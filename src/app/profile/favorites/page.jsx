"use client";

import { useState } from "react";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import StoreCard from "@/components/common/StoreCard";
import ProductCard from "@/components/common/ProductCard";
import { useFavoritesStore } from "@/store/useFavoritesStore";

export default function FavoritesPage() {
  const [tab, setTab] = useState("all"); // 'all' | 'stores' | 'dishes'
  const { favoriteStores, favoriteDishes } = useFavoritesStore();

  const showStores = tab === "all" || tab === "stores";
  const showDishes = tab === "all" || tab === "dishes";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
          المفضلة
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          محلاتك وأكلاتك المفضلة، جاهزة للطلب في أي وقت
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            tab === "all"
              ? "bg-[#0D5C58] text-white shadow-xs"
              : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
          }`}
        >
          كل المفضلة
        </button>

        <button
          type="button"
          onClick={() => setTab("stores")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            tab === "stores"
              ? "bg-[#0D5C58] text-white shadow-xs"
              : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
          }`}
        >
          المتاجر ({favoriteStores.length})
        </button>

        <button
          type="button"
          onClick={() => setTab("dishes")}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
            tab === "dishes"
              ? "bg-[#0D5C58] text-white shadow-xs"
              : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
          }`}
        >
          الأكلات ({favoriteDishes.length})
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Main Content Area (3 Cols) */}
        <div className="lg:col-span-3 space-y-10">
          {/* Section: المتاجر اللي بتحبيها */}
          {showStores && favoriteStores.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900">
                المتاجر اللي بتحبيها
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {favoriteStores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            </div>
          )}

          {/* Section: أكلات على مزاجك */}
          {showDishes && favoriteDishes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900">
                أكلات على مزاجك
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {favoriteDishes.map((dish) => (
                  <ProductCard key={dish.id} product={dish} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State if both empty */}
          {favoriteStores.length === 0 && favoriteDishes.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 space-y-2">
              <i className="fa-regular fa-heart text-4xl text-gray-300"></i>
              <h3 className="font-bold text-gray-900 text-sm">قائمتك المفضلة فارغة حالياً</h3>
              <p className="text-xs text-gray-500">
                احفظ مطاعمك ووجباتك المفضلة لتتمكن من الوصول إليها بضغطة واحدة.
              </p>
            </div>
          )}

          {/* Bottom Promo Banner */}
          <div className="bg-[#E6F4F1] rounded-2xl p-4 flex items-center gap-3 border border-teal-100 text-[#0D5C58] text-xs">
            <i className="fa-regular fa-circle-check text-base"></i>
            <div>
              <span className="font-bold">عرض لمتجرك المفضل:</span>{" "}
              <span className="text-gray-600">
                كشري الحاج سيد عليه خصم ٢٠ ج.م بكود ندى٢٠ • حتى ٧ نوفمبر
              </span>
            </div>
          </div>
        </div>

        {/* Profile Sidebar (1 Col) */}
        <div className="lg:col-span-1">
          <ProfileSidebar />
        </div>
      </div>
    </div>
  );
}
