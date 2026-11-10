"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useReviews } from "@/hooks/useReviews";

export default function CustomerReviewsSlider() {
  const { reviews, loading } = useReviews({ fiveStarsOnly: true, limit: 20 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef(null);

  // Auto-slide every 5 seconds when not paused
  useEffect(() => {
    if (isPaused || !reviews || reviews.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, reviews]);

  const handlePrev = () => {
    if (!reviews || reviews.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const handleNext = () => {
    if (!reviews || reviews.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  if (loading && (!reviews || reviews.length === 0)) {
    return (
      <section aria-label="تحميل التقييمات" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-[#0D5C58]/80 rounded-3xl p-6 sm:p-10 text-white animate-pulse h-48 flex items-center justify-center">
          <p className="text-sm font-bold text-emerald-100">جارٍ جلب أحدث تجارب وتقييمات العملاء...</p>
        </div>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) return null;

  const current = reviews[currentIndex];

  return (
    <section
      aria-label="آراء وتجارب العملاء"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-gradient-to-br from-[#0D5C58] via-[#094744] to-[#063330] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Section Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold mb-2">
              <i className="fa-solid fa-crown text-[10px]"></i>
              <span>تجارب حقيقية موثقة</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              ماذا يقول أهالي باسوس عن تجربة أطلب؟
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1">
              آراء حية وتقييمات حقيقية من عملائنا بعد استلام طلباتهم مباشرة
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="التقييم السابق"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="التقييم التالي"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
          </div>
        </div>

        {/* Testimonial Active Slide */}
        <div className="relative z-10 pt-6 sm:pt-8 min-h-[160px] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Stars & Quote Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 text-sm" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <i key={s} className="fa-solid fa-star"></i>
                ))}
              </div>
              <i className="fa-solid fa-quote-left text-white/20 text-3xl"></i>
            </div>

            {/* Comment Text */}
            <p className="text-base sm:text-lg font-bold leading-relaxed text-teal-50 max-w-3xl">
              "{current.comment}"
            </p>
          </div>

          {/* Author Details & Indicators */}
          <div className="pt-6 mt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-400 text-teal-950 font-black text-sm flex items-center justify-center shadow-md">
                {current.userName ? current.userName[0] : "ع"}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{current.userName}</h4>
                <div className="flex items-center gap-2 text-xs text-teal-200/80 mt-0.5">
                  {current.area && <span>{current.area}</span>}
                  {current.storeName && (
                    <>
                      <span>•</span>
                      {current.storeSlug || current.storeId ? (
                        <Link
                          href={`/stores/${current.storeSlug || current.storeId}`}
                          className="text-amber-300 font-bold hover:underline transition-colors"
                        >
                          {current.storeName}
                        </Link>
                      ) : (
                        <span className="text-amber-300 font-bold">{current.storeName}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Dots Pagination */}
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              {reviews.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`انتقل إلى الرأي رقم ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentIndex === idx ? "w-6 bg-amber-400" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

