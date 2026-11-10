"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ordersService } from "@/services/orders.service";
import { reviewsService } from "@/services/reviews.service";

function OrderTrackingContent({ params }) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const phone = searchParams.get("phone") || "";

  // Order status progression: 'accepted' (1) -> 'preparing' (2) -> 'on_the_way' (3) -> 'delivered' (4)
  const [currentStep, setCurrentStep] = useState(2); // default demo: preparing
  const [loading, setLoading] = useState(false);
  const [savedOrderInfo, setSavedOrderInfo] = useState(null);

  // Review & Rating State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setIsSubmittingReview(true);
    setReviewError("");
    try {
      await reviewsService.createReview({
        orderId: savedOrderInfo?.id || orderNumber,
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const activeRaw = localStorage.getItem("otlob_active_order");
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          setSavedOrderInfo(parsed);
        }
      } catch {}
    }
  }, []);

  const steps = [
    {
      id: 1,
      title: "تم استلام الطلب وتأكيده",
      subtitle: "المطعم وافق على الطلب وبدأ التجهيز",
      iconClass: "fa-solid fa-check",
      time: "منذ 10 دقائق",
    },
    {
      id: 2,
      title: "جاري تحضير الوجبة في المطعم",
      subtitle: "الشيف يجهز وجبتك طازة وسخنة بالطلب",
      iconClass: "fa-solid fa-kitchen-set",
      time: "الآن",
    },
    {
      id: 3,
      title: "الكابتن استلم الطلب وهو في الطريق",
      subtitle: "مندوب التوصيل في طريقه لعنوانك",
      iconClass: "fa-solid fa-bicycle",
      time: "متوقع خلال 15 دقيقة",
    },
    {
      id: 4,
      title: "تم التوصيل بنجاح",
      subtitle: "استلمت طلبك، بألف صحة وهنا!",
      iconClass: "fa-solid fa-location-dot",
      time: "الخطوة الأخيرة",
    },
  ];

  useEffect(() => {
    // If order tracking API exists, try fetching
    const pollStatus = async () => {
      if (token && phone) {
        try {
          const res = await ordersService.trackGuestOrder({
            orderNumber,
            phone,
            token,
          });
          if (res?.order?.status) {
            const statusMap = {
              accepted: 1,
              preparing: 2,
              on_the_way: 3,
              delivered: 4,
            };
            setCurrentStep(statusMap[res.order.status] || 2);
          }
        } catch {
          // fallback to demo simulation
        }
      }
    };
    pollStatus();
  }, [orderNumber, token, phone]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/" className="hover:text-teal-800">
              الرئيسية
            </Link>
            <span>/</span>
            <span className="text-teal-800 font-bold">تتبع الطلب</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            تتبع الطلب: <span className="font-mono text-teal-800">#{orderNumber}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            تحديث حي ومباشر
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Section: Timeline Stepper (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
              <i className="fa-solid fa-location-dot text-[#0D5C58]"></i>
              <span>مراحل توصيل طلبك</span>
            </h3>

            <div className="relative space-y-8 pr-4">
              {/* Vertical connecting line */}
              <div className="absolute top-4 right-[27px] bottom-6 w-0.5 bg-gray-200 -z-0"></div>

              {steps.map((st) => {
                const isCompleted = currentStep >= st.id;
                const isCurrent = currentStep === st.id;

                return (
                  <div key={st.id} className="relative z-10 flex items-start gap-4">
                    {/* Step Icon */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-xs transition-colors shrink-0 ${
                        isCompleted
                          ? "bg-[#0D5C58] text-white"
                          : "bg-gray-100 text-gray-400 border border-gray-200"
                      } ${isCurrent ? "ring-4 ring-emerald-100 scale-110" : ""}`}
                    >
                      <i className={st.iconClass}></i>
                    </div>

                    {/* Step Details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs sm:text-sm font-black ${
                            isCompleted ? "text-teal-950" : "text-gray-400"
                          }`}
                        >
                          {st.title}
                        </h4>
                        <span className="text-[10px] text-gray-400">{st.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{st.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-xl font-bold border border-teal-200">
                <i className="fa-regular fa-id-badge"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-gray-900">كابتن أحمد سعيد</h4>
                  <span className="text-xs text-amber-500 font-bold">
                    <i className="fa-solid fa-star text-[10px]"></i> 4.9
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">مندوب التوصيل المعتمد لطلبك</p>
                <span className="text-[11px] text-[#0D5C58] font-semibold block mt-1">
                  سكوتر كحلي • رقم اللوحة: أ ب ج ١٢٣
                </span>
              </div>
            </div>

            <a
              href="tel:01012345678"
              className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <i className="fa-solid fa-phone text-xs"></i>
              <span>اتصل بالكابتن</span>
            </a>
          </div>

          {/* Customer Rating Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-star"></i>
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900">تقييم تجربة الطلب</h4>
                  <p className="text-[11px] text-gray-500">رأيك يساعدنا على تحسين جودة المطاعم وسرعة التوصيل</p>
                </div>
              </div>
            </div>

            {reviewSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <i className="fa-solid fa-circle-check text-2xl text-emerald-600"></i>
                <h5 className="font-bold text-xs text-emerald-900">شكراً جزيلاً لتقييمك!</h5>
                <p className="text-[11px] text-emerald-700">تم تسجيل تقييمك بنجاح ومشاركته مع إدارة الجودة والمتجر.</p>
                <div className="flex justify-center gap-1 text-amber-400 text-sm pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i
                      key={star}
                      className={star <= rating ? "fa-solid fa-star" : "fa-regular fa-star text-gray-300"}
                    ></i>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex flex-col items-center gap-2 py-2">
                  <span className="text-xs font-bold text-gray-700">كيف تقيم تجربتك الإجمالية؟</span>
                  <div className="flex items-center gap-1.5" dir="ltr">
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
                          <i
                            className={
                              isFilled
                                ? "fa-solid fa-star text-amber-400"
                                : "fa-regular fa-star text-gray-300"
                            }
                          ></i>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-amber-600 font-medium">
                    {rating === 5 && "ممتاز جداً 🌟"}
                    {rating === 4 && "جيد جداً 👍"}
                    {rating === 3 && "متوسط 🙂"}
                    {rating === 2 && "يحتاج تحسين 😕"}
                    {rating === 1 && "سيء جداً 😞"}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ملاحظاتك أو تعليقك (اختياري)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="اكتب ملاحظاتك بخصوص جودة الأكل، التغليف، أو سرعة التوصيل..."
                    className="w-full text-xs p-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#0D5C58] focus:ring-1 focus:ring-[#0D5C58] resize-none"
                  ></textarea>
                </div>

                {reviewError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center">
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
                      <span>جاري إرسال التقييم...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>إرسال التقييم</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Left Section: Delivery Info & Address (1 Col) */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h4 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100">
              تفاصيل التوصيل
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="block text-gray-400 text-[10px]">عنوان التسليم:</span>
                <span className="font-bold text-gray-800 mt-0.5 block">
                  {savedOrderInfo?.deliveryAddress || "—"}
                </span>
              </div>

              <div>
                <span className="block text-gray-400 text-[10px]">موعد الاستلام:</span>
                <span className="font-bold text-[#0D5C58] mt-0.5 block">
                  {savedOrderInfo?.deliverySchedule || "توصيل فوري (خلال 25 - 35 دقيقة)"}
                </span>
              </div>

              <div>
                <span className="block text-gray-400 text-[10px]">رقم هاتف العميل:</span>
                <span className="font-bold text-gray-800 mt-0.5 block dir-ltr text-right">
                  {phone || savedOrderInfo?.phone || "01012345678"}
                </span>
              </div>

              <div>
                <span className="block text-gray-400 text-[10px]">طريقة الدفع:</span>
                <span className="font-bold text-emerald-800 mt-0.5 block">
                  الدفع نقداً عند الاستلام (كاش)
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Link
                href="/"
                className="w-full py-3 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs text-center border border-gray-200 block transition-colors"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0D5C58] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-600">جاري تحميل مسار الطلب...</p>
          </div>
        </div>
      }
    >
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}

