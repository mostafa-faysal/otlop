"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import { storesService } from "@/services/stores.service";
import { SERVICE_VILLAGE, SERVICE_AREAS, DEFAULT_AREA } from "@/lib/regions";

export default function MerchantRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [formData, setFormData] = useState({
    storeName: "",
    category: "",
    ownerName: "",
    phone: "",
    city: SERVICE_VILLAGE,
    area: DEFAULT_AREA,
    commercialRegister: "",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCats = () => {
      storesService
        .getCategories({ activeOnly: true })
        .then((res) => {
          const cats = Array.isArray(res?.categories)
            ? res.categories.filter((c) => c.isActive !== false)
            : [];
          if (isMounted && cats.length > 0) {
            setActiveCategories(cats);
            setFormData((prev) => ({
              ...prev,
              category: prev.category && cats.some((c) => c.name === prev.category) ? prev.category : cats[0].name,
            }));
          }
        })
        .catch(() => {});
    };

    fetchCats();
    window.addEventListener("otlob_categories_updated", fetchCats);

    return () => {
      isMounted = false;
      window.removeEventListener("otlob_categories_updated", fetchCats);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminService.submitStoreApplication(formData);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-2xl mx-auto shadow-md">
            <i className="fa-solid fa-store"></i>
          </div>
          <h1 className="text-2xl font-black text-gray-900">انضم كشريك في شبكة أطلب</h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            سجل بيانات مطعمك أو محلك التجاري وسيقوم فريق العمل بالتواصل معك وتفعيل حسابك خلال 24 ساعة.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-3xl bg-[#E6F4F1] border border-teal-200 text-center space-y-3">
            <span className="w-12 h-12 rounded-full bg-[#0D5C58] text-white flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-check"></i>
            </span>
            <h3 className="font-black text-base text-[#0D5C58]">تم استلام طلب الانضمام بنجاح!</h3>
            <p className="text-xs text-teal-800 leading-relaxed max-w-sm mx-auto">
              شكراً لثقتك في أطلب. سيتواصل معك أحد مسؤولي شبكة التجار عبر الهاتف لزيارة المحل وتفعيل حساب المتجر.
            </p>
            <Link
              href="/"
              className="inline-block mt-3 px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all"
            >
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المطعم أو المحل</label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="مثال: كبابجي البرنس"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نوع النشاط / القسم المعتمد</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                >
                  {activeCategories.length > 0 ? (
                    activeCategories.map((c) => (
                      <option key={c.id || c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="كشري وطواجن">كشري وطواجن</option>
                      <option value="مشويات">مشويات وكبابجي</option>
                      <option value="بيتزا وفطير">بيتزا وفطير</option>
                      <option value="سندوتشات وسريع">سندوتشات وبرجر</option>
                      <option value="أسماك">أسماك وبحريات</option>
                      <option value="حلويات وعصائر">حلويات وعصائر</option>
                      <option value="سوبرماركت وبقالة">سوبرماركت وبقالة</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المسؤول / المالك</label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="أحمد علي"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الموبايل للتواصل</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">القرية</label>
                <input
                  type="text"
                  readOnly
                  value={SERVICE_VILLAGE}
                  className="w-full px-4 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">المنطقة</label>
                <select
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                >
                  {SERVICE_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all mt-4 flex items-center justify-center gap-2"
            >
              <span>إرسال طلب الانضمام</span>
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

