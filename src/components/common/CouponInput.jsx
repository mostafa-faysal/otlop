"use client";

import { useState } from "react";
import { adminService } from "@/services/admin.service";

export default function CouponInput({
  appliedCode = "",
  appliedDiscount = 0,
  discountBearer = "platform",
  storeId = null,
  storeSlug = null,
  storeOffer = null,
  subtotal = 0,
  onApply = () => {},
  onRemove = () => {},
  className = "",
}) {
  const [inputCode, setInputCode] = useState(appliedCode || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setErrorMsg("");

    const code = inputCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    try {
      // 1) فحص إذا كان الكود يطابق عرض المتجر التلقائي أو كود المتجر المخصص
      if (
        storeOffer &&
        storeOffer.code &&
        storeOffer.code.trim().toUpperCase() === code
      ) {
        if (storeOffer.minOrder && subtotal < storeOffer.minOrder) {
          throw new Error(
            `الحد الأدنى لتطبيق هذا الخصم هو ${storeOffer.minOrder} ج.م.`
          );
        }
        let calculated = 0;
        if (storeOffer.discountType === "percentage") {
          calculated = Math.round((subtotal * storeOffer.discountValue) / 100);
        } else {
          calculated = Number(storeOffer.discountValue) || 20;
        }
        const cap = Number(storeOffer.maxDiscount ?? storeOffer.max_discount ?? 0);
        if (cap > 0) {
          calculated = Math.min(calculated, cap);
        }
        calculated = Math.min(subtotal, calculated);
        onApply(code, calculated, "merchant");
        setLoading(false);
        return;
      }

      // 2) فحص كود الكوبون عبر خدمة الكوبونات والمنصة
      const result = adminService.validateCoupon(code, {
        storeId,
        storeSlug,
        subtotal,
      });

      onApply(
        code,
        result.discountAmount,
        result.discountBearer || (result.coupon?.storeId === "all" ? "platform" : "merchant")
      );
    } catch (err) {
      setErrorMsg(err.message || "كود الخصم غير صالح أو منتهي الصلاحية.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputCode("");
    setErrorMsg("");
    onRemove();
  };

  const isApplied = Boolean(appliedCode && appliedDiscount > 0);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <i className="fa-solid fa-ticket text-[#0D5C58]"></i>
          <span>كود الخصم / الكوبون</span>
        </span>
        {isApplied && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              discountBearer === "platform"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {discountBearer === "platform" ? "خصم من المنصة" : "خصم من المتجر"}
          </span>
        )}
      </div>

      {isApplied ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              <i className="fa-solid fa-check"></i>
            </span>
            <div>
              <span className="font-black text-emerald-950 block">{appliedCode}</span>
              <span className="text-[11px] text-emerald-700">
                تم تطبيق خصم {appliedDiscount} ج.م بنجاح
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setErrorMsg("");
              }}
              placeholder="مثال: NADA20 أو OTLOB20"
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-[#0D5C58] focus:ring-1 focus:ring-[#0D5C58]"
            />
            <i className="fa-solid fa-tag text-gray-400 text-xs absolute right-3 top-3.5"></i>
          </div>
          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all disabled:opacity-40 shrink-0"
          >
            {loading ? "جاري التحقق..." : "تطبيق"}
          </button>
        </form>
      )}

      {errorMsg && (
        <p className="text-[11px] text-red-600 font-medium pr-1 flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]"></i>
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
}

