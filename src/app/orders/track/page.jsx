"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GeneralTrackPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    orderNumber: "",
    phone: "",
    token: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.orderNumber.trim()) return;

    const queryParams = new URLSearchParams();
    if (formData.token.trim()) queryParams.set("token", formData.token.trim());
    if (formData.phone.trim()) queryParams.set("phone", formData.phone.trim());

    router.push(`/orders/${formData.orderNumber.trim()}/track?${queryParams.toString()}`);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-xl mx-auto shadow-md">
            <i className="fa-solid fa-motorcycle"></i>
          </div>
          <h1 className="text-2xl font-black text-gray-900">تتبع حالة طلبك</h1>
          <p className="text-xs text-gray-500">
            أدخل رقم الطلب ورقم هاتفك لمتابعة حركة الكابتن وتوقيت الوصول
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">رقم الطلب</label>
            <input
              type="text"
              required
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              placeholder="مثال: OTL-123456"
              className="w-full px-4 py-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رقم الموبايل المسجل به الطلب
            </label>
            <input
              type="tel"
              required
              dir="ltr"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01012345678"
              className="w-full px-4 py-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رمز التتبع السري (اختياري لطلبات الضيوف)
            </label>
            <input
              type="text"
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              placeholder="الرمز المرسل في رسالة التأكيد"
              className="w-full px-4 py-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>تتبع الطلب الآن</span>
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </button>
        </form>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-gray-500 hover:text-[#0D5C58] inline-flex items-center gap-1.5">
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
            <span>العودة للصفحة الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

