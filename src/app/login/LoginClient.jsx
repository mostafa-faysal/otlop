"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [activeRole, setActiveRole] = useState("customer"); // customer | merchant | admin
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Forgot Password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleSelectRole = (role) => {
    setActiveRole(role);
    setErrorMsg("");
    setSuccessMsg("");
    setIsForgotMode(false);
    setIdentifier("");
    setPassword("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await authService.login({
        email: identifier.trim(),
        password: password.trim(),
      });

      if (res?.user) {
        setUser(res.user);
        setSuccessMsg(`أهلاً بك يا ${res.user.fullName}! جاري توجيهك...`);

        setTimeout(() => {
          if (res.user.role === "admin") {
            router.push("/admin");
          } else if (res.user.role === "merchant") {
            router.push("/merchant");
          } else {
            router.push("/");
          }
        }, 800);
      }
    } catch (err) {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          err?.message ||
          "بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg("يرجى كتابة البريد الإلكتروني أو اسم المستخدم أولاً.");
      return;
    }
    setEmailVerified(true);
    setSuccessMsg("تم العثور على الحساب بنجاح! أدخل كلمة المرور الجديدة الآن.");
  };

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
      const res = await authService.resetPasswordByEmail(identifier, newPassword);
      setSuccessMsg("تم تغيير كلمة المرور بنجاح! جاري تحويلك...");
      if (res?.user) {
        setUser(res.user);
      }
      setTimeout(() => {
        if (res?.user?.role === "merchant" || res?.role === "merchant") {
          router.push("/merchant");
        } else if (res?.user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ كلمة المرور الجديدة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-gray-50/50 text-right">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-2xl font-black shadow-md mx-auto">
              <i className="fa-solid fa-bag-shopping"></i>
            </div>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {isForgotMode
              ? "استعادة وتغيير كلمة المرور"
              : "تسجيل دخول العملاء — أطلب"}
          </h1>
          <p className="text-xs text-gray-500">
            {isForgotMode
              ? "اكتب بريدك الإلكتروني المسجل لتغيير كلمة المرور فوراً"
              : "سجل دخولك بحساب العميل الخاص بك للطلب ومتابعة سلة مشترياتك"}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation shrink-0"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-check shrink-0"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {isForgotMode ? (
          <div className="space-y-4">
            {!emailVerified ? (
              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    أدخل البريد الإلكتروني أو اسم المستخدم المسجل
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="مثال: mariam@otlob.com أو seafood أو sayed"
                    dir="ltr"
                    className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                  <span>التحقق من الحساب</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-between">
                  <span>الحساب المؤكد:</span>
                  <span className="font-mono text-gray-900" dir="ltr">
                    {identifier}
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
                  setIsForgotMode(false);
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
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <input
                type="text"
                name="login_identifier"
                autoComplete="off"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  activeRole === "merchant"
                    ? "أدخل اسم المستخدم أو البريد الإلكتروني للمتجر"
                    : activeRole === "admin"
                    ? "أدخل البريد الإلكتروني للمسؤول"
                    : "أدخل البريد الإلكتروني أو اسم المستخدم"
                }
                dir="ltr"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(true);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-[11px] font-bold text-[#0D5C58] hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <input
                type="password"
                name="login_password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري التحقق...</span>
              ) : (
                <>
                  <span>
                    {activeRole === "merchant"
                      ? "دخول لوحة تحكم التاجر"
                      : activeRole === "admin"
                      ? "دخول لوحة الإدارة العامة"
                      : "تسجيل الدخول والمتابعة"}
                  </span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="pt-2 text-center text-xs text-gray-500 border-t border-gray-100 flex items-center justify-center">
          <Link href="/" className="hover:text-[#0D5C58] font-bold">
            العودة للصفحة الرئيسية للتسوق
          </Link>
        </div>
      </div>
    </div>
  );
}

