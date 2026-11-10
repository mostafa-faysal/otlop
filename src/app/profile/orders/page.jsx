"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { ordersService } from "@/services/orders.service";

const STATUS_LABELS = {
  pending: { label: "بانتظار التأكيد", color: "bg-amber-50 text-amber-800 border-amber-200" },
  accepted: { label: "تم قبول الطلب", color: "bg-teal-50 text-teal-800 border-teal-200" },
  preparing: { label: "جاري التحضير", color: "bg-blue-50 text-blue-800 border-blue-200" },
  on_the_way: { label: "خرج مع الكابتن", color: "bg-purple-50 text-purple-800 border-purple-200" },
  delivered: { label: "تم التوصيل بنجاح", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelled: { label: "طلب ملغي", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await ordersService.getOrders();
        const list = Array.isArray(res?.orders)
          ? res.orders
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        if (isMounted) {
          setOrders(list);
        }
      } catch {
        if (isMounted) {
          setOrders([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders =
    activeFilter === "all"
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <ProfileSidebar />
        </div>

        {/* Content (Figma 3_56591.png) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">طلباتي السابقة</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  تابع حالة طلباتك الحالية وأعد طلب وجباتك المفضلة بنقرة زر
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                {[
                  { id: "all", label: "الكل" },
                  { id: "delivered", label: "المكتملة" },
                  { id: "cancelled", label: "الملغاة" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeFilter === f.id
                        ? "bg-white text-teal-900 shadow-xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs font-bold text-[#0D5C58]">جاري تحميل سجل الطلبات...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <i className="fa-solid fa-box-open text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-900 text-sm">لا توجد طلبات سابقة مسجلة</h3>
                <p className="text-xs text-gray-500">ابدأ طلب وجبتك الأولى من أفضل المطاعم في منطقتك الآن!</p>
                <Link
                  href="/stores"
                  className="inline-block mt-2 px-5 py-2 rounded-full bg-[#0D5C58] text-white text-xs font-bold"
                >
                  تصفح المتاجر
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => {
                  const statusInfo = STATUS_LABELS[ord.status] || {
                    label: ord.status,
                    color: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <div
                      key={ord.id}
                      className="p-5 rounded-2xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-gray-200 transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{ord.storeName || "متجر محلي"}</span>
                            <span className="text-xs text-gray-400 font-mono">#{ord.orderNumber}</span>
                          </div>
                          <span className="text-[11px] text-gray-400 block mt-0.5">
                            {new Date(ord.createdAt || Date.now()).toLocaleDateString("ar-EG")}
                          </span>
                        </div>

                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-gray-400 block">الإجمالي:</span>
                          <span className="text-sm font-black text-teal-950">{ord.total} ج.م</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${ord.orderNumber}/track`}
                            className="px-4 py-2 rounded-xl bg-[#E6F4F1] hover:bg-teal-100 text-[#0D5C58] font-bold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>تفاصيل وتتبع الطلب</span>
                            <i className="fa-solid fa-motorcycle text-xs"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
