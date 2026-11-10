"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OfferCountdown, { isOfferExpired } from "@/components/home/offers/OfferCountdown";
import { useCartStore } from "@/store/useCartStore";
import { adminService } from "@/services/admin.service";

export default function OfferBanner({ config = null, stores = [] }) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const applyCoupon = useCartStore((s) => s.applyCoupon);

  useEffect(() => {
    setMounted(true);
  }, []);

  const banner = config || adminService.getHomepageConfig().offerBanner;
  const matchedStore = Array.isArray(stores)
    ? stores.find(
        (s) =>
          (banner?.storeId && String(s.id) === String(banner.storeId)) ||
          (banner?.storeSlug && s.slug === banner.storeSlug)
      )
    : null;
  const resolvedEndsAt = banner?.endsAt || matchedStore?.offerEndsAt || null;

  if (!mounted || !banner || banner.enabled === false || expired || isOfferExpired(resolvedEndsAt)) {
    return null;
  }

  const targetHref =
    banner.storeSlug && banner.storeSlug !== "all"
      ? `/stores/${banner.storeSlug}`
      : banner.storeId && banner.storeId !== "all"
      ? `/stores/${banner.storeId}`
      : "/offers";

  const handleCopyCoupon = () => {
    if (!banner.couponCode) return;
    if (typeof window !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(banner.couponCode);
    }
    applyCoupon(banner.couponCode, Number(banner.discountValue) || 20);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-l from-[#0D5C58] via-[#0B504C] to-[#083E3B] text-white p-5 sm:p-8 shadow-lg border border-teal-700/40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 text-right">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 text-2xl shrink-0">
            <i className="fa-solid fa-ticket-simple"></i>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-teal-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {banner.badgeText || "عرض الصفحة الرئيسية"}
              </span>
              {banner.storeName && banner.storeSlug !== "all" && (
                <span className="bg-white/15 text-emerald-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-store text-[9px]"></i>
                  <span>{banner.storeName}</span>
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-2xl font-black leading-snug">
              {banner.title || "لمة الغدا أحلى بخصم ٢٠ ج.م"}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
              {banner.subtitle ||
                "اطلب الآن واستمتع بأقوى عروض التوفير من محلات بلدنا"}
            </p>
            {resolvedEndsAt && (
              <div className="pt-1.5">
                <OfferCountdown
                  endsAt={resolvedEndsAt}
                  variant="banner"
                  showExactDate={true}
                  onExpire={() => setExpired(true)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile-Responsive Actions: Coupon Chip + Direct Store CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {banner.couponCode && (
            <button
              type="button"
              onClick={handleCopyCoupon}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-dashed border-amber-300/80 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              title="اضغط لنسخ وتفعيل كود الخصم في السلة"
            >
              <i
                className={`fa-solid ${
                  copied ? "fa-check text-emerald-300" : "fa-copy text-amber-300"
                }`}
              ></i>
              <span>
                {copied ? "تم التفعيل بالسلة:" : "كود الخصم:"}
              </span>
              <span className="font-mono font-black text-amber-300 tracking-wider">
                {banner.couponCode}
              </span>
            </button>
          )}

          <Link
            href={targetHref}
            className="px-6 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-[#0D5C58] font-black text-xs sm:text-sm shadow-md transition-all whitespace-nowrap flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{banner.ctaText || "اطلب العرض الآن"}</span>
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
