"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useModalStore } from "@/store/useModalStore";
import { productsService } from "@/services/products.service";
import { adminService } from "@/services/admin.service";
import CouponInput from "@/components/common/CouponInput";

export default function CartPage() {
  const router = useRouter();
  const openProductModal = useModalStore((s) => s.openProductModal);
  const {
    items,
    storeName,
    storeId,
    storeSlug,
    deliveryFee,
    couponCode,
    discountAmount,
    discountBearer,
    notes,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    setNotes,
    clearCart,
    getSubtotal,
    getTotalAmount,
  } = useCartStore();

  const [inputCoupon, setInputCoupon] = useState(couponCode || "");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(!!couponCode);
  const [crossSellProducts, setCrossSellProducts] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [minutesLeft, setMinutesLeft] = useState(120);

  const subtotal = items.length > 0 ? getSubtotal() : 0;
  const total = items.length > 0 ? getTotalAmount() : 0;

  // Active Order check with 2-hour automatic disappearance
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkActiveOrder = () => {
      try {
        const raw = localStorage.getItem("otlob_active_order");
        if (!raw) {
          setActiveOrder(null);
          return;
        }
        const parsed = JSON.parse(raw);
        const placedAt = parsed.placedAt || 0;
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const elapsed = Date.now() - placedAt;

        if (elapsed < TWO_HOURS_MS) {
          setActiveOrder(parsed);
          const remaining = Math.max(0, Math.ceil((TWO_HOURS_MS - elapsed) / 60000));
          setMinutesLeft(remaining);
        } else {
          // Expired after 2 hours -> remove automatically
          localStorage.removeItem("otlob_active_order");
          setActiveOrder(null);
        }
      } catch {
        setActiveOrder(null);
      }
    };

    checkActiveOrder();
    const interval = setInterval(checkActiveOrder, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCrossSell = async () => {
      if (!storeId) return;
      try {
        const res = await productsService.getProducts({ storeId, availableOnly: true });
        if (isMounted && Array.isArray(res?.products)) {
          // Exclude products already in cart
          const cartProdIds = new Set(items.map((i) => i.productId));
          const availableRecommendations = res.products.filter((p) => !cartProdIds.has(p.id));
          setCrossSellProducts(availableRecommendations.slice(0, 3));
        }
      } catch {
        // No mock data fallback
      }
    };
    fetchCrossSell();
    return () => {
      isMounted = false;
    };
  }, [storeId, items]);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess(false);

    const code = inputCoupon.trim().toUpperCase();
    if (!code) return;

    try {
      const result = adminService.validateCoupon(code, {
        storeId,
        storeSlug,
        subtotal,
      });
      applyCoupon(code, result.discountAmount, result.discountBearer || "platform");
      setCouponSuccess(true);
    } catch (err) {
      setCouponError(err.message || "كود الخصم غير صحيح أو منتهي الصلاحية.");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setInputCoupon("");
    setCouponSuccess(false);
  };

  const renderActiveOrderCard = () => {
    if (!activeOrder) return null;
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl border-2 border-[#0D5C58]/30 shadow-md p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-xl shadow-md shrink-0">
              <i className="fa-solid fa-motorcycle animate-pulse"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#0D5C58] bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                  طلب جاري الآن
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  #{activeOrder.orderNumber}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-gray-900 mt-1">
                طلبك من {activeOrder.storeName}
              </h3>
            </div>
          </div>

          {/* Live Tracking CTA Button with Motorcycle icon */}
          <Link
            href={`/orders/${activeOrder.orderNumber}/track?token=${activeOrder.token || ""}&phone=${encodeURIComponent(activeOrder.phone || "")}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs sm:text-sm shadow-md transition-all shrink-0"
          >
            <i className="fa-solid fa-route text-amber-300"></i>
            <span>متابعة الطلب وموقع الكابتن</span>
            <i className="fa-solid fa-chevron-left text-[10px]"></i>
          </Link>
        </div>

        {/* Order Details & 2-Hour Auto-Disappearance Notice */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-gray-700 font-medium">
              <span className="font-bold text-gray-900">الأصناف: </span>
              {Array.isArray(activeOrder.items) && activeOrder.items.length > 0
                ? activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join("، ")
                : "وجبات مختارة"}
            </p>
            <p className="text-gray-500 text-[11px]">
              إجمالي الحساب:{" "}
              <span className="font-black text-[#0D5C58]">{activeOrder.total} ج.م</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-teal-800 bg-white/80 border border-teal-200 px-3 py-1.5 rounded-xl shrink-0">
            <i className="fa-regular fa-clock text-xs"></i>
            <span className="text-[11px] font-bold">
              متبقي للتتبع {minutesLeft} دقيقة (يختفي التتبع تلقائياً بعد ساعتين)
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {/* Active Order Card if exists */}
        {renderActiveOrderCard()}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[#E6F4F1] text-[#0D5C58] rounded-full flex items-center justify-center text-2xl mx-auto">
            <i className="fa-solid fa-basket-shopping"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            {activeOrder ? "لا توجد أصناف إضافية في السلة" : "سلتك فارغة حالياً"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            {activeOrder
              ? "طلبك الحالي قيد التوصيل الآن، ويمكنك في أي وقت تصفح المطاعم وإضافة طلب جديد."
              : "لم تقم بإضافة أي وجبات بعد. استكشف أفضل المطاعم في منطقتك واختر ما يناسبك."}
          </p>
          <Link
            href="/stores"
            className="inline-block mt-4 px-8 py-3.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            ابدأ التسوق وتصفح المطاعم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Active Order Tracking Banner if exists */}
      {renderActiveOrderCard()}

      {/* Step Progress Stepper */}
      <div className="flex items-center justify-center max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-teal-800 text-white font-black text-xs flex items-center justify-center shadow">
              ١
            </span>
            <span className="text-xs font-black text-teal-900">السلة</span>
          </div>

          <div className="w-12 sm:w-20 h-0.5 bg-gray-200"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
              ٢
            </span>
            <span className="text-xs font-bold text-gray-600 hidden sm:inline">التوصيل والدفع</span>
          </div>

          <div className="w-12 sm:w-20 h-0.5 bg-gray-200"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 opacity-50">
            <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
              ٣
            </span>
            <span className="text-xs font-bold text-gray-600 hidden sm:inline">تأكيد الطلب</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right Section: Items List & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Name Banner */}
          {storeName && (
            <div className="flex items-center justify-between p-4 bg-[#E6F4F1] border border-teal-200 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-store text-[#0D5C58] text-base"></i>
                <div>
                  <span className="text-xs text-[#0D5C58] block">طلبك من متجر:</span>
                  <span className="text-sm font-black text-gray-900">{storeName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                إفراغ السلة
              </button>
            </div>
          )}

          {/* Items Container */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 p-2 sm:p-4">
            {items.map((item) => (
              <div
                key={item.itemKey}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-sm font-bold shrink-0">
                    <i className="fa-solid fa-utensils"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                    {item.selectedSize && (
                      <span className="text-xs text-gray-500 block mt-0.5">
                        الحجم: {item.selectedSize.name}
                      </span>
                    )}
                    {item.selectedExtras?.length > 0 && (
                      <span className="text-xs text-teal-700 block mt-0.5">
                        +{item.selectedExtras.map((e) => e.name).join("، ")}
                      </span>
                    )}
                    {item.specialInstructions && (
                      <span className="text-[11px] text-gray-400 block mt-0.5 italic">
                        "{item.specialInstructions}"
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-black text-teal-900 block">
                        {item.unitPrice} ج.م / للقطعة
                      </span>
                      {Number(item.originalPrice) > Number(item.unitPrice) && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {item.originalPrice} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Counter & Subtotal */}
                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemKey, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-white text-gray-700 shadow-xs flex items-center justify-center font-bold text-xs hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-black text-xs text-teal-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemKey, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-teal-800 text-white shadow-xs flex items-center justify-center font-bold text-xs hover:bg-teal-900"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-left min-w-[70px]">
                    <span className="text-sm font-black text-teal-950 block">
                      {item.unitPrice * item.quantity} ج.م
                    </span>
                    {Number(item.originalPrice) > Number(item.unitPrice) && (
                      <span className="text-[11px] text-gray-400 line-through block">
                        {Number(item.originalPrice) * item.quantity} ج.م
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.itemKey)}
                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    title="حذف الصنف"
                  >
                    <i className="fa-regular fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cooking & Delivery Notes Box */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-2">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <i className="fa-solid fa-pen text-[#0D5C58]"></i>
              <span>ملاحظات للمطعم أو مندوب التوصيل</span>
            </h4>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: رن الجرس بدلاً من الاتصال، زيادة عيش بلدي، الصصوص حار منفصل..."
              className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 focus:bg-white resize-none text-gray-800"
            />
          </div>

          {/* Cross-Sell Suggestions from Same Store */}
          {crossSellProducts.length > 0 && (
            <div className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-5 space-y-3">
              <h4 className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                <i className="fa-solid fa-utensils text-[#0D5C58]"></i>
                <span>تحب تضيف وجبة أخرى من نفس المطعم؟</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {crossSellProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white p-3 rounded-2xl border border-emerald-100 flex items-center justify-between gap-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-xs shrink-0">
                      <i className="fa-solid fa-plus"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-gray-900 truncate">
                        {prod.name}
                      </span>
                      <span className="block text-xs font-black text-teal-800">
                        {prod.price} ج.م
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openProductModal({
                          ...prod,
                          image:
                            prod.image ||
                            prod.imageUrl ||
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
                          storeId,
                          storeSlug,
                          storeName,
                          deliveryFee,
                        })
                      }
                      className="w-8 h-8 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white flex items-center justify-center font-bold text-xs shrink-0 active:scale-95 transition-transform"
                      title="تخصيص وإضافة للسلة"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Left Section: Order Summary & Coupon */}
        <div className="lg:col-span-1 space-y-5">
          {/* Coupon Input Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
            <CouponInput
              appliedCode={couponCode}
              appliedDiscount={discountAmount}
              discountBearer={discountBearer}
              storeId={storeId}
              storeSlug={storeSlug}
              subtotal={subtotal}
              onApply={applyCoupon}
              onRemove={removeCoupon}
            />
          </div>

          {/* Price Breakdown Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h4 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100">
              ملخص الحساب
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold text-gray-900">{subtotal} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>رسوم التوصيل:</span>
                {Number(deliveryFee) === 0 ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                    <i className="fa-solid fa-gift text-[10px]"></i>
                    <span>توصيل مجاني (عرض) 0 ج.م</span>
                  </span>
                ) : (
                  <span className="font-bold text-gray-900">{deliveryFee} ج.م</span>
                )}
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span className="flex items-center gap-1">
                    <span>الخصم المطبق:</span>
                    <span className="text-[10px] font-normal text-emerald-600">
                      ({discountBearer === "platform" ? "خصم المنصة" : "خصم المتجر"})
                    </span>
                  </span>
                  <span>-{discountAmount} ج.م</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-base font-black text-teal-950">
                <span>الإجمالي النهائي:</span>
                <span>{total} ج.م</span>
              </div>
            </div>

            {/* Next Step Checkout CTA */}
            <Link
              href="/checkout"
              className="w-full py-3.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>متابعة الشراء والدفع</span>
              <i className="fa-solid fa-arrow-left text-xs"></i>
            </Link>

            <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-[10px]"></i>
                <span>دفع آمن 100%</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-motorcycle text-[10px]"></i>
                <span>توصيل سريع ومضمون</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
