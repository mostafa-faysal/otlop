"use client";

import { useState, useEffect } from "react";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useModalStore } from "@/store/useModalStore";
import { authService } from "@/services/auth.service";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, setUser } = useAuthStore();
  const { openAuthModal } = useModalStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await authService.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
      });
      if (res?.user) {
        setUser(res.user);
      }
      setSuccessMsg("تم حفظ التعديلات بنجاح!");
      setIsEditing(false);
    } catch (err) {
      setErrorMsg(err?.message || "حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <ProfileSidebar />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">بيانات الحساب الشخصي</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  تحكم في بياناتك الشخصية ورقم هاتفك للتواصل
                </p>
              </div>

              {isAuthenticated && !isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-full border border-teal-800 text-teal-800 hover:bg-teal-50 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-pen text-[10px]"></i>
                  <span>تعديل البيانات</span>
                </button>
              )}
            </div>

            {!isLoading && !isAuthenticated ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-lg mx-auto">
                  <i className="fa-regular fa-user"></i>
                </div>
                <h3 className="font-bold text-sm text-gray-900">
                  يرجى تسجيل الدخول لعرض بيانات حسابك
                </h3>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs transition-colors"
                >
                  تسجيل الدخول الآن
                </button>
              </div>
            ) : (
              <>
                {successMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      الاسم بالكامل
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 disabled:opacity-75"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      رقم الموبايل
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      disabled={!isEditing}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 disabled:opacity-75 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      disabled
                      value={formData.email}
                      className="w-full px-4 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed text-right"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      البريد الإلكتروني مرتبط بحسابك الأساسي ولا يمكن تعديله حالياً.
                    </span>
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 rounded-full bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
                      >
                        {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
