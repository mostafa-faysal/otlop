"use client";

import CouponInput from "@/components/common/CouponInput";

export default function CheckoutOrderSummary({
  items = [],
  storeId = null,
  storeSlug = null,
  storeName = "",
  storeOffer = null,
  subtotal = 0,
  deliveryFee = 15,
  discountAmount = 0,
  discountBearer = "platform",
  total = 0,
  couponCode = "",
  onApplyCoupon = () => {},
  onRemoveCoupon = () => {},
  loading = false,
  errorMsg = "",
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5 sticky top-24">
      <h4 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center justify-between">
        <span>ملخص الطلب ({items.length} أصناف)</span>
        <span className="text-xs text-gray-400 font-normal">باسوس والقليوبية</span>
      </h4>

      {storeName && (
        <div className="text-xs text-[#0D5C58] font-bold bg-[#E6F4F1] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <i className="fa-solid fa-store text-xs"></i>
          <span>المتجر: {storeName}</span>
        </div>
      )}

      {/* تنبيه عرض المتجر التلقائي إن وجد */}
      {storeOffer && storeOffer.offerText && (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-black">
            <i className="fa-solid fa-gift text-amber-600"></i>
            <span>عرض المتجر الحصري</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {storeOffer.offerText}
          </p>
        </div>
      )}

      {/* تنبيه كم متبقي للتوصيل المجاني */}
      {storeOffer &&
        (storeOffer.discountType === "free_delivery" || storeOffer.isFreeDelivery) &&
        Number(storeOffer.minOrder) > 0 &&
        subtotal < Number(storeOffer.minOrder) && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-black text-emerald-800">
              <i className="fa-solid fa-truck-fast"></i>
              <span>اقتربت من التوصيل المجاني!</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              أضف بـ{" "}
              <span className="font-black text-emerald-900 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                {Number(storeOffer.minOrder) - subtotal} ج.م
              </span>{" "}
              أخرى من المتجر لتفعيل عرض التوصيل المجاني (0 ج.م).
            </p>
          </div>
        )}

      {/* قائمة الأصناف السريعة */}
      <div className="space-y-2 max-h-48 overflow-y-auto text-xs text-gray-700 divide-y divide-gray-50 pl-1">
        {items.map((i) => (
          <div key={i.itemKey || i.id} className="pt-2 flex items-center justify-between">
            <span className="truncate max-w-[150px]">
              {i.quantity}x {i.name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {Number(i.originalPrice) > Number(i.unitPrice ?? i.price ?? 0) && (
                <span className="text-[11px] text-gray-400 line-through">
                  {Number(i.originalPrice) * (Number(i.quantity) || 1)} ج.م
                </span>
              )}
              <span className="font-bold text-[#0D5C58]">
                {Number(i.unitPrice ?? i.price ?? 0) * (Number(i.quantity) || 1)} ج.م
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* حقل إدخال وتطبيق كود الخصم / الكوبون */}
      <div className="pt-2 border-t border-gray-100">
        <CouponInput
          appliedCode={couponCode}
          appliedDiscount={discountAmount}
          discountBearer={discountBearer}
          storeId={storeId}
          storeSlug={storeSlug}
          storeOffer={storeOffer}
          subtotal={subtotal}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
        />
      </div>

      {/* التكاليف والإجماليات */}
      <div className="space-y-2 pt-3 border-t border-gray-100 text-xs">
        <div className="flex items-center justify-between text-gray-600">
          <span>المجموع الفرعي:</span>
          <span className="font-bold">{subtotal} ج.م</span>
        </div>
        <div className="flex items-center justify-between text-gray-600">
          <span>رسوم التوصيل:</span>
          {Number(deliveryFee) === 0 ? (
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
              <i className="fa-solid fa-gift text-[10px]"></i>
              <span>توصيل مجاني (عرض) 0 ج.م</span>
            </span>
          ) : (
            <span className="font-bold">{deliveryFee} ج.م</span>
          )}
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-700 font-bold">
            <span className="flex items-center gap-1">
              <span>الخصم:</span>
              <span className="text-[10px] font-normal text-emerald-600">
                ({discountBearer === "platform" ? "خصم المنصة" : "خصم المتجر"})
              </span>
            </span>
            <span>-{discountAmount} ج.م</span>
          </div>
        )}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-base font-black text-teal-950">
          <span>المبلغ المستحق:</span>
          <span>{total} ج.م</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation text-xs mt-0.5 shrink-0"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-sm text-center shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <span>جاري تأكيد الطلب...</span>
        ) : (
          <>
            <span>تأكيد الطلب الآن</span>
            <i className="fa-solid fa-arrow-left text-xs"></i>
          </>
        )}
      </button>

      <p className="text-[10px] text-gray-400 text-center leading-relaxed">
        بالضغط على تأكيد الطلب، فإنك توافق على شروط الخدمة وسياسة الاستخدام في منصة أطلب.
      </p>
    </div>
  );
}

