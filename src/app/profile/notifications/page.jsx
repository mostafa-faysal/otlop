"use client";

import { useState, useEffect } from "react";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import { reviewsService } from "@/services/reviews.service";

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const res = await reviewsService.getNotifications({ limit: 50 });
        const items = Array.isArray(res?.notifications)
          ? res.notifications
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
        if (isMounted) {
          setNotifications(items);
        }
      } catch {
        if (isMounted) {
          setNotifications([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    for (const item of unread) {
      try {
        await reviewsService.markNotificationRead(item.id);
      } catch {
        // ignore individual error
      }
    }
  };

  const handleMarkRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await reviewsService.markNotificationRead(id);
    } catch {}
  };

  const handleDelete = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await reviewsService.deleteNotification(id);
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.isRead;
    return (n.category || n.type || "orders") === activeFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">الإشعارات</h1>
        <p className="text-xs text-gray-500 mt-1">
          تحديثات طلباتك وأحدث التنبيهات من قاعدة البيانات
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1">
          <ProfileSidebar />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {notifications.some((n) => !n.isRead) && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-[#0D5C58] hover:text-[#0D5C58] transition-all self-start"
              >
                تحديد الكل كمقروء
              </button>
            )}

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "الكل" },
                { id: "unread", label: "غير مقروءة" },
                { id: "orders", label: "الطلبات" },
                { id: "offers", label: "العروض" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeFilter === tab.id
                      ? "bg-[#0D5C58] text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-xs font-bold text-[#0D5C58]">
              جاري تحميل الإشعارات...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-lg mx-auto">
                <i className="fa-regular fa-bell"></i>
              </div>
              <h3 className="font-bold text-sm text-gray-900">لا توجد إشعارات حالياً</h3>
              <p className="text-xs text-gray-500">
                ستظهر هنا تنبيهات حالة طلباتك فور تحديثها.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                    n.isRead
                      ? "bg-white border-gray-100"
                      : "bg-[#E6F4F1] border-teal-100 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-white text-[#0D5C58] flex items-center justify-center text-sm shadow-xs shrink-0">
                      <i className={`fa-solid ${n.icon || "fa-bell"}`}></i>
                    </div>
                    <div className="space-y-0.5">
                      {n.createdAt && (
                        <span className="text-[10px] text-gray-400 block">
                          {new Date(n.createdAt).toLocaleString("ar-EG")}
                        </span>
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900">
                        {n.title}
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {n.body || n.message || n.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {!n.isRead && (
                      <span className="text-[10px] font-bold text-[#0D5C58] bg-white px-2 py-0.5 rounded-full">
                        جديد
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      className="w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs transition-colors"
                      aria-label="حذف الإشعار"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
