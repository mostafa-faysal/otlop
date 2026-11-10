"use client";

import { useState, useEffect } from "react";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";
import { SERVICE_VILLAGE, SERVICE_AREAS, DEFAULT_AREA } from "@/lib/regions";

export default function AddressesPage() {
  const { addresses, setAddresses } = useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: "المنزل",
    city: SERVICE_VILLAGE,
    area: DEFAULT_AREA,
    street: "",
    building: "",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAddr = async () => {
      setLoading(true);
      try {
        const res = await authService.getAddresses();
        if (isMounted && Array.isArray(res?.addresses)) {
          setAddresses(res.addresses);
        }
      } catch {
        // No mock fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAddr();
    return () => {
      isMounted = false;
    };
  }, [setAddresses]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.street) return;
    setSubmitting(true);
    try {
      const res = await authService.createAddress({
        label: newAddr.label,
        city: newAddr.city,
        area: newAddr.area,
        street: newAddr.street,
        building: newAddr.building || undefined,
        notes: newAddr.notes || undefined,
      });
      if (res?.address) {
        setAddresses([...(addresses || []), res.address]);
        setShowAddForm(false);
        setNewAddr({
          label: "المنزل",
          city: SERVICE_VILLAGE,
          area: DEFAULT_AREA,
          street: "",
          building: "",
          notes: "",
        });
      }
    } catch (err) {
      alert(err?.response?.data?.error?.message || "تعذر إضافة العنوان.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا العنوان؟")) return;
    try {
      await authService.deleteAddress(id);
      setAddresses((addresses || []).filter((a) => a.id !== id));
    } catch (err) {
      alert(err?.response?.data?.error?.message || "تعذر حذف العنوان.");
    }
  };

  const addressList = Array.isArray(addresses) ? addresses : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <ProfileSidebar />
        </div>

        {/* Content (Figma 3_56467.png) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">عناويني المحفوظة</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  أدر عناوين التوصيل المتكررة لطلب أسرع في كل مرة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 rounded-full bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>+</span>
                <span>إضافة عنوان جديد</span>
              </button>
            </div>

            {/* Add Address Form Accordion */}
            {showAddForm && (
              <form onSubmit={handleAddAddress} className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-4">
                <h3 className="text-xs font-black text-teal-950">تفاصيل العنوان الجديد</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      اسم العنوان (مثال: البيت، المكتب، بيت العيلة)
                    </label>
                    <input
                      type="text"
                      required
                      value={newAddr.label}
                      onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                      placeholder="المنزل"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">المنطقة ({SERVICE_VILLAGE})</label>
                    <select
                      required
                      value={newAddr.area}
                      onChange={(e) => setNewAddr({ ...newAddr, city: SERVICE_VILLAGE, area: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                    >
                      {SERVICE_AREAS.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">اسم الشارع وعلامة مميزة</label>
                    <input
                      type="text"
                      required
                      value={newAddr.street}
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      placeholder="شارع الجيش بجوار مسجد سيدي إبراهيم..."
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-teal-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {submitting ? "جاري الحفظ..." : "حفظ العنوان"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* Address Cards Grid */}
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-[#0D5C58]">جاري تحميل العناوين...</div>
            ) : addressList.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <div className="text-3xl text-gray-300">
                  <i className="fa-solid fa-location-dot"></i>
                </div>
                <p className="text-xs font-bold text-gray-600">لم تقم بإضافة أي عناوين توصيل بعد.</p>
                <p className="text-[11px]">أضف عنوانك لتسريع وتسهيل عملية الطلب في المرات القادمة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addressList.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 rounded-2xl border border-gray-200/80 bg-gray-50/40 hover:bg-white hover:border-[#0D5C58] transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          <i className="fa-solid fa-location-dot text-[#0D5C58] text-xs"></i>
                          <span>{addr.label || addr.name || "عنوان"}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            العنوان الافتراضي
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {addr.street}, {addr.area}, {addr.city}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        className="text-red-500 hover:underline font-bold"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
