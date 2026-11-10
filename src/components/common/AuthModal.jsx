"use client";

import { useState, useEffect } from "react";
import { useModalStore } from "@/store/useModalStore";
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";

export default function AuthModal() {
  const { isAuthModalOpen, authModalMode, closeAuthModal } = useModalStore();
  const { setUser } = useAuthStore();

  const [mode, setMode] = useState(authModalMode || "login"); // login | register | forgot_password
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthModalOpen) {
      authService.initCsrf();
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [authModalMode]);

  if (!isAuthModalOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleQuickFill = (role) => {
    if (role === "customer") {
      setFormData({
        fullName: "مريم أحمد",
        phone: "01012345678",
        email: "mariam@otlob.com",
        password: "password123",
      });
    } else if (role === "merchant-sayed") {
      setFormData({
        fullName: "الحاج سيد (كشري)",
        phone: "01098765432",
        email: "sayed",
        password: "password123",
      });
    } else if (role === "merchant-seafood") {
      setFormData({
        fullName: "مدير أسماك القناة",
        phone: "01055566677",
        email: "seafood",
        password: "password123",
      });
    } else if (role === "merchant-burger") {
      setFormData({
        fullName: "مدير برجر هاوس",
        phone: "01088899900",
        email: "burger",
        password: "password123",
      });
    } else if (role === "admin") {
      setFormData({
        fullName: "مدير المنصة العام",
        phone: "01011122233",
        email: "admin@otlob.com",
        password: "password123",
      });
    }
  };

  // Step 1: Verify Email for Forgot Password
  const handleVerifyEmail = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const identifier = (formData.email || "").trim();
    if (!identifier) {
      setErrorMsg("يرجى كتابة البريد الإلكتروني أو اسم المستخدم المسجل.");
      return;
    }
    setEmailVerified(true);
    setSuccessMsg("تم العثور على الحساب بنجاح! أدخل كلمة المرور الجديدة الآن.");
  };

  // Step 2: Save New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("يجب ألا تقل كلمة المرور عن 6 خانات.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("كلمة المرور وتأكيدها غير متطابقين.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await authService.resetPasswordByEmail(formData.email, newPassword);
      setSuccessMsg("تم تغيير كلمة المرور بنجاح! جاري تحويلك...");
      if (res?.user) {
        setUser(res.user);
      }
      setTimeout(() => {
        closeAuthModal();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ كلمة المرور الجديدة.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        const res = await authService.login({
          email: formData.email,
          password: formData.password,
        });
        if (res?.user) {
          setUser(res.user);
          closeAuthModal();
        }
      } else if (mode === "register") {
        const res = await authService.register({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
        });
        if (res?.user) {
          setUser(res.user);
          closeAuthModal();
        }
      }
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          err?.message ||
          "حدث خطأ أثناء معالجة الطلب، يرجى التأكد من صحة البيانات."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={closeAuthModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-right max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-5 left-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-xs"
          aria-label="إغلاق"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white font-black text-xl flex items-center justify-center mx-auto shadow-md mb-2">
            <i
              className={`fa-solid ${
                mode === "forgot_password" ? "fa-key" : "fa-store"
              } text-lg`}
            ></i>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-gray-900">
            {mode === "login"
              ? "تسجيل الدخول إلى أطلب"
              : mode === "register"
              ? "إنشاء حساب جديد"
              : "استعادة وتغيير كلمة المرور"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mode === "login"
              ? "أهلاً بك مجدداً! اطلب وجبتك أو أدر متجرك بضغطة زر"
              : mode === "register"
              ? "انضم إلينا واستمتع بأقوى العروض وتتبع طلباتك لحظة بلحظة"
              : "اكتب بريدك الإلكتروني وسيظهر لك حقل كلمة المرور الجديدة فوراً"}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {mode !== "forgot_password" && (
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === "login"
                  ? "bg-white text-[#0D5C58] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === "register"
                  ? "bg-white text-[#0D5C58] shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              حساب جديد
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation shrink-0"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-check shrink-0"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORGOT PASSWORD WORKFLOW */}
        {mode === "forgot_password" ? (
          <div className="space-y-4">
            {!emailVerified ? (
              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    أدخل بريدك الإلكتروني أو اسم المستخدم
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="مثال: mariam@otlob.com أو seafood"
                    dir="ltr"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                  <span>التحقق من البريد الإلكتروني</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-between">
                  <span>الحساب المؤكد:</span>
                  <span className="font-mono text-gray-900" dir="ltr">
                    {formData.email}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    كلمة المرور الجديدة (6 خانات على الأقل)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>حفظ كلمة المرور الجديدة وتسجيل الدخول</span>
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmailVerified(false);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-xs text-[#0D5C58] font-bold hover:underline"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD LOGIN & REGISTER FORM */
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    الاسم بالكامل
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رقم الموبايل
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البريد الإلكتروني للعميل
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="مثال: mariam@otlob.com"
                dir="ltr"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  كلمة المرور
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot_password");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-[11px] font-bold text-[#0D5C58] hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري المعالجة...</span>
              ) : mode === "login" ? (
                <>
                  <span>تسجيل الدخول</span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </>
              ) : (
                <>
                  <span>إنشاء الحساب والمتابعة</span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-[11px] text-gray-400">
          بالاستمرار، أنت توافق على شروط الخدمة وسياسة الخصوصية لمنصة أطلب
        </div>
      </div>
    </div>
  );
}
