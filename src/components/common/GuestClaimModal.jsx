"use client";

import { useState } from "react";
import { useModalStore } from "@/store/useModalStore";
import { ordersService } from "@/services/orders.service";

export default function GuestClaimModal() {
  const { isClaimModalOpen, claimOrderData, closeClaimModal } = useModalStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    orderNumber: claimOrderData?.orderNumber || "",
    phone: claimOrderData?.phone || "",
    token: claimOrderData?.token || "",
  });

  if (!isClaimModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await ordersService.claimGuestOrder({
        orderNumber: formData.orderNumber.trim(),
        phone: formData.phone.trim(),
        token: formData.token.trim(),
      });

      if (res?.claimed) {
        setSuccess(true);
        setTimeout(() => {
          closeClaimModal();
        }, 1500);
      } else {
        setErrorMsg("تعذر ربط الطلب، يرجى التأكد من صحة رقم الطلب ورمز التأكيد.");
      }
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          err?.message ||
          "حدث خطأ أثناء محاولة ربط الطلب بالحساب."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={closeClaimModal}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeClaimModal}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm"
          aria-label="إغلاق"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white text-xl flex items-center justify-center mx-auto shadow-md mb-3">
            <i className="fa-solid fa-box"></i>
          </div>
          <h3 className="text-lg font-black text-gray-900">ربط طلبك بحسابك الجديد</h3>
          <p className="text-xs text-gray-500 mt-1">
            هل قمت بالطلب كضيف؟ اربط طلبك الآن بحسابك لمتابعته وإعادة طلبه بسهولة.
          </p>
        </div>

        {success ? (
          <div className="p-4 rounded-2xl bg-[#E6F4F1] border border-teal-200 text-center text-xs text-[#0D5C58] font-bold space-y-2">
            <i className="fa-solid fa-circle-check text-2xl text-emerald-600 block"></i>
            <span>تم ربط الطلب بحسابك بنجاح!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-sm shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رقم الطلب</label>
              <input
                type="text"
                required
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                placeholder="OTL-123456"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رقم الموبايل المسجل به الطلب</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01012345678"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white text-gray-800 text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رمز التحقق / التتبع (Token)</label>
              <input
                type="text"
                required
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="أدخل الرمز المستلم في رسالة التأكيد"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 focus:bg-white text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? "جاري التحقق والربط..." : "تأكيد ربط الطلب"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

