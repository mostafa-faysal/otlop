"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import OfferCountdown from "@/components/home/offers/OfferCountdown";
import { useCartStore } from "@/store/useCartStore";
import { useOffers } from "@/hooks/useOffers";

export default function OffersPage() {
  const { offers, loading } = useOffers();
  const [activeTab, setActiveTab] = useState("all");
  const [copiedCode, setCopiedCode] = useState(null);
  const { applyCoupon } = useCartStore();

  const handleCopy = (code, discount) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
    }
    applyCoupon(code, discount || 20);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const isDiscountOffer = (o) =>
    ["fixed_amount", "percentage", "fixed", "fixed_price"].includes(
      o.discountType
    );

  const counts = useMemo(() => {
    return {
      all: offers.length,
      delivery: offers.filter(
        (o) =>
          o.discountType === "free_delivery" ||
          o.discountType === "delivery_discount"
      ).length,
      discount: offers.filter(isDiscountOffer).length,
      store: offers.filter((o) => Boolean(o.storeId || o.storeSlug)).length,
    };
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (activeTab === "all") return offers;
    if (activeTab === "delivery")
      return offers.filter(
        (o) =>
          o.discountType === "free_delivery" ||
          o.discountType === "delivery_discount"
      );
    if (activeTab === "discount") return offers.filter(isDiscountOffer);
    if (activeTab === "store")
      return offers.filter((o) => Boolean(o.storeId || o.storeSlug));
    return offers;
  }, [offers, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-teal-800">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-teal-800 font-bold">العروض والخصومات</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 pt-2">
          أقوى عروض وخصومات اليوم
        </h1>
        <p className="text-xs sm:text-sm text-gray-500">
          استخدم كوبونات الخصم ووفر فلوسك مع كل طلب من محلات بلدك
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: "كل العروض", count: counts.all },
          { id: "delivery", label: "توصيل مجاني", count: counts.delivery },
          { id: "discount", label: "خصومات مالية", count: counts.discount },
          { id: "store", label: "عروض المطاعم", count: counts.store },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-[#0D5C58] text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:border-[#0D5C58]"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#0D5C58] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-[#0D5C58]">جاري تحميل أحدث العروض...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-2">
          <i className="fa-solid fa-ticket-simple text-4xl text-gray-300"></i>
          <h3 className="font-bold text-gray-900 text-sm">لا توجد عروض فعالة في هذا القسم حالياً</h3>
          <p className="text-xs text-gray-500">تابعنا باستمرار للاستفادة من أقوى الخصومات اليومية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                    {offer.storeName || "عرض عام للمنصة"}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {offer.minOrder || offer.minOrderAmount
                      ? `حد أدنى ${offer.minOrder || offer.minOrderAmount} ج.م`
                      : "ساري الآن"}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-gray-900">{offer.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {offer.description || offer.subtitle}
                </p>

                {offer.endsAt && (
                  <div className="pt-1">
                    <OfferCountdown
                      endsAt={offer.endsAt}
                      variant="default"
                      showExactDate={true}
                      onExpire={() => {
                        setOffers((prev) => prev.filter((item) => item.id !== offer.id));
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Coupon Box if code exists */}
                {offer.code ? (
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-1.5 w-full sm:w-auto">
                    <span className="px-3 text-xs font-mono font-black text-teal-900">
                      {offer.code}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          offer.code,
                          offer.discountValue || offer.discountAmount || 20
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      {copiedCode === offer.code ? (
                        <>
                          <i className="fa-solid fa-check text-[10px]"></i>
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <span>نسخ الكود</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-[#0D5C58] font-bold bg-[#E6F4F1] px-3 py-1 rounded-xl flex items-center gap-1">
                    <i className="fa-solid fa-check text-[10px]"></i>
                    <span>خصم تلقائي عند الطلب</span>
                  </span>
                )}

                <Link
                  href={
                    offer.storeSlug || offer.storeId
                      ? `/stores/${offer.storeSlug || offer.storeId}`
                      : "/stores"
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs text-center transition-colors flex items-center justify-center gap-2"
                >
                  <span>
                    {offer.storeName && offer.storeName !== "عرض عام للمنصة"
                      ? `اطلب من ${offer.storeName}`
                      : "تصفح واطلب الآن"}
                  </span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
