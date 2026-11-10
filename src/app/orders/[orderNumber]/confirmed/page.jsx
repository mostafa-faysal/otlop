"use client";

import { use, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { reviewsService } from "@/services/reviews.service";

function OrderConfirmedContent({ params }) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const phone = searchParams.get("phone") || "";
  const [deliverySchedule, setDeliverySchedule] = useState("");
  const [savedOrderInfo, setSavedOrderInfo] = useState(null);

  // Review & Rating State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const activeRaw = localStorage.getItem("otlob_active_order");
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          setSavedOrderInfo(parsed);
          if (parsed?.deliverySchedule) {
            setDeliverySchedule(parsed.deliverySchedule);
          }
        }
      } catch {}
    }
  }, []);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setIsSubmittingReview(true);
    setReviewError("");
    try {
      await reviewsService.createReview({
        orderId: savedOrderInfo?.id || orderNumber,
        storeId: savedOrderInfo?.storeId || savedOrderInfo?.storeSlug,
        rating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err?.message || "حدث خطأ أثناء حفظ التقييم، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-10 text-center space-y-6">
        {/* Success Badge */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-sm">
          <i className="fa-solid fa-check"></i>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-[#0D5C58] bg-[#E6F4F1] px-3 py-1 rounded-full">
            تم إرسال الطلب للمطعم بنجاح
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900">
            ألف هنا! طلبك في الطريق إليك
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            رقم الطلب الخاص بك هو{" "}
            <span className="font-mono font-bold text-[#0D5C58] bg-[#E6F4F1] px-2 py-0.5 rounded-md">
              {orderNumber}
            </span>
            {savedOrderInfo?.storeName && (
              <span className="block mt-1 font-bold text-gray-700">
                من متجر: {savedOrderInfo.storeName}
              </span>
            )}
          </p>
        </div>

        {/* Estimated Time Card */}
        <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-gray-100 flex items-center justify-center gap-3 text-gray-800 font-bold text-xs sm:text-sm">
          <i className="fa-solid fa-bicycle text-[#0D5C58] text-lg sm:text-xl"></i>
          <span>
            {deliverySchedule
              ? `موعد التوصيل: ${deliverySchedule}`
              : "الوقت المتوقع للتوصيل: خلال ٢٥ - ٣٥ دقيقة"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <Link
            href={`/orders/${orderNumber}/track?token=${token}&phone=${encodeURIComponent(phone)}`}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-location-crosshairs text-xs"></i>
            <span>تتبع حالة الطلب</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm border border-gray-200 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>

        {/* Rating & Review Box Right After Order */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-right space-y-4 bg-gray-50/70 p-5 rounded-3xl border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900">
                  كيف كانت تجربة طلبك وسرعة استجابة المحل؟
                </h3>
                <p className="text-[11px] text-gray-500">
                  شاركنا رأيك لضمان أعلى مستوى من الجودة والخدمة
                </p>
              </div>
            </div>
          </div>

          {reviewSubmitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-600"></i>
              <h4 className="font-bold text-xs text-emerald-900">شكراً جزيلاً لتقييمك!</h4>
              <p className="text-[11px] text-emerald-700">تم تسجيل تقييمك بنجاح ومشاركته مع المطعم وإدارة أطلب.</p>
              <div className="flex justify-center gap-1 text-amber-400 text-sm pt-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <i key={s} className={s <= rating ? "fa-solid fa-star" : "fa-regular fa-star text-gray-300"}></i>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex items-center gap-2" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        <i className={isFilled ? "fa-solid fa-star text-amber-400" : "fa-regular fa-star text-gray-300"}></i>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-amber-700 font-bold">
                  {rating === 5 && "ممتاز جداً 🌟"}
                  {rating === 4 && "جيد جداً 👍"}
                  {rating === 3 && "متوسط 🙂"}
                  {rating === 2 && "يحتاج تحسين 😕"}
                  {rating === 1 && "غير راضٍ 😞"}
                </span>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="اكتب ملاحظاتك بخصوص سهولة الطلب، أو أي اقتراح للمطعم (اختياري)..."
                  className="w-full text-xs p-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:border-[#0D5C58] resize-none"
                ></textarea>
              </div>

              {reviewError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl text-center border border-red-100">
                  {reviewError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmittingReview || rating === 0}
                className="w-full py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmittingReview ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>جاري حفظ تقييمك...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                    <span>إرسال التقييم</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Support Note */}
        <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
          هل تحتاج لتعديل طلبك أو لديك استفسار؟ فريق الدعم متاح يومياً على{" "}
          <span dir="ltr" className="text-[#0D5C58] font-bold">
            01012345678
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0D5C58] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-600">جاري تحميل بيانات الطلب...</p>
          </div>
        </div>
      }
    >
      <OrderConfirmedContent params={params} />
    </Suspense>
  );
}
