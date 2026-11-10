"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { storesService } from "@/services/stores.service";
import { ordersService } from "@/services/orders.service";
import { adminService } from "@/services/admin.service";

function MerchantFinanceContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [commissionRate, setCommissionRate] = useState(5);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [timeFilter, setTimeFilter] = useState("all"); // "all" | "today" | "week"
  const [payoutRequested, setPayoutRequested] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const targetStoreId = searchParams.get("storeId") || searchParams.get("id");
        const targetStoreSlug = searchParams.get("storeSlug") || searchParams.get("slug");

        const allStores = await storesService.getStores();
        let currentStore = null;

        if (targetStoreId || targetStoreSlug || user?.id) {
          currentStore = allStores.find(
            (s) =>
              (targetStoreId && s.id === targetStoreId) ||
              (targetStoreSlug && s.slug === targetStoreSlug) ||
              (user?.id && s.ownerId === user.id)
          );
        }

        if (!currentStore && allStores.length > 0 && !targetStoreId && !targetStoreSlug) {
          currentStore = allStores[0];
        }

        if (isMounted && currentStore) {
          // Resolve effective commission rate from admin custom commission map
          let rate = 5;
          try {
            const customMap = adminService.getCustomCommissionsMap();
            const customVal =
              (currentStore.id && customMap[currentStore.id] !== undefined)
                ? customMap[currentStore.id]
                : (currentStore.slug && customMap[currentStore.slug] !== undefined)
                ? customMap[currentStore.slug]
                : undefined;

            if (customVal !== undefined) {
              rate = Number(customVal);
            } else if (currentStore.commissionRate !== undefined && currentStore.commissionRate !== null) {
              rate = Number(currentStore.commissionRate);
            } else {
              const platformSettings = await adminService.getPlatformSettings();
              rate = Number(platformSettings?.defaultCommissionRate || 5);
            }
          } catch {
            rate = Number(currentStore.commissionRate || 5);
          }

          setStore(currentStore);
          setCommissionRate(rate);

          // Fetch real orders for this store
          const ordersRes = await ordersService.getOrders({
            storeId: currentStore.id,
            storeSlug: currentStore.slug,
            limit: 100,
          });

          const fetchedOrders = Array.isArray(ordersRes?.items)
            ? ordersRes.items
            : Array.isArray(ordersRes?.data?.items)
            ? ordersRes.data.items
            : Array.isArray(ordersRes?.orders)
            ? ordersRes.orders
            : [];

          setOrders(fetchedOrders);
        }
      } catch (err) {
        console.error("Error loading merchant finance data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [searchParams, user]);

  // Available months filter
  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map((o) => {
            const d = o.createdAt ? new Date(o.createdAt) : null;
            if (!d || Number.isNaN(d.getTime())) return null;
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          })
          .filter(Boolean)
      )
    )
      .sort()
      .reverse();
  }, [orders]);

  // إحصائيات طلبات اليوم الحالي
  const todayOrders = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
      return d === todayStr;
    });
  }, [orders]);

  const todayGrossSales = useMemo(() => {
    return todayOrders.reduce((sum, o) => {
      const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
      const discount = Number(o.discountAmount || o.discount || 0);
      const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
      return sum + (bearer === "platform" ? subtotal : Math.max(0, subtotal - discount));
    }, 0);
  }, [todayOrders]);

  // تصفية الطلبات بالشهر والفترة الزمنية (يوم / أسبوع)
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orders.filter((o) => {
      const date = o.createdAt ? new Date(o.createdAt) : null;
      if (!date || Number.isNaN(date.getTime())) return false;

      // 1. فلترة الشهر المختار (الافتراضي هو الشهر الحالي الذي يبدأ من يوم 1)
      if (selectedMonth !== "all") {
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (yearMonth !== selectedMonth) return false;
      }

      // 2. فلترة اليوم أو الأسبوع داخل الفترة
      if (timeFilter === "today") {
        const ordDateStr = date.toISOString().slice(0, 10);
        return ordDateStr === todayStr;
      }
      if (timeFilter === "week") {
        const diffMs = Math.abs(now.getTime() - date.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }

      return true;
    });
  }, [orders, selectedMonth, timeFilter]);

  // حساب المبيعات والعمولات لكل طلب على حدة من قاعدة البيانات
  const grossSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
      const discount = Number(o.discountAmount || o.discount || 0);
      const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
      // إذا كان الخصم من المنصة: المحل يستحق القيمة كاملة
      const orderGross = bearer === "platform" ? subtotal : Math.max(0, subtotal - discount);
      return sum + orderGross;
    }, 0);
  }, [filteredOrders]);

  const platformCommission = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
      const discount = Number(o.discountAmount || o.discount || 0);
      const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
      // استخدام نسبة العمولة الخاصة بكل طلب وقت إنشائه على السعر الأصلي دون الخصم
      const orderRate = Number(o.commissionRateSnapshot ?? o.commissionRate ?? commissionRate);
      const baseComm = Number(o.platformCommission ?? ((subtotal * orderRate) / 100));
      // خصم المنصة يُخصم من مستحقات المنصة على المحل ليعود له المبلغ كاملاً
      const platformCredit = bearer === "platform" ? discount : 0;
      const netCommOwed = Math.max(0, baseComm - platformCredit);
      return sum + netCommOwed;
    }, 0);
  }, [filteredOrders, commissionRate]);

  const netEarnings = useMemo(() => {
    return Math.max(0, grossSales - platformCommission);
  }, [grossSales, platformCommission]);

  const deliveredOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "delivered").length;
  }, [filteredOrders]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/merchant" className="hover:text-teal-800">
              لوحة التحكم
            </Link>
            <span>/</span>
            <span className="text-teal-800 font-bold">التقارير المالية</span>
            {store?.name && (
              <>
                <span>/</span>
                <span className="text-gray-700 font-bold">{store.name}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900">المستحقات والتقارير المالية الحقيقية</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            متابعة إجمالي المبيعات، عمولة المنصة المعتمدة ({commissionRate}%)، وصافي المستحقات محسوبة بدقة من واقع طلبات المتجر
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPayoutRequested(true);
            setTimeout(() => setPayoutRequested(false), 4000);
          }}
          disabled={netEarnings <= 0}
          className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fa-regular fa-credit-card text-xs"></i>
          <span>{payoutRequested ? "تم إرسال طلب التسوية للإدارة!" : "طلب تسوية وتحويل المستحقات"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Link
          href="/merchant"
          className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-gray-300"
        >
          نظرة عامة
        </Link>
        <Link
          href="/merchant/menu"
          className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-gray-300"
        >
          قائمة المنتجات والأسعار
        </Link>
        <Link
          href="/merchant/finance"
          className="px-4 py-2 rounded-2xl bg-teal-800 text-xs font-bold text-white shadow-xs"
        >
          التقارير المالية
        </Link>
      </div>

      {/* Filter by Month & Period */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-calendar-days text-[#0D5C58] text-sm"></i>
            <span className="text-xs font-bold text-gray-700">شهر التقرير المالي:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:outline-none focus:border-[#0D5C58]"
          >
            <option value={currentYearMonth}>الشهر الحالي ({currentYearMonth}) - يبدأ من يوم 1</option>
            <option value="all">كافة الشهور (إجمالي تراكمي لكافة الطلبات)</option>
            {availableMonths
              .filter((ym) => ym !== currentYearMonth)
              .map((ym) => (
                <option key={ym} value={ym}>
                  شهر {ym}
                </option>
              ))}
          </select>
        </div>

        {/* Period Filter Buttons (الكل / اليوم / هذا الأسبوع) */}
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTimeFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === "all"
                ? "bg-white text-[#0D5C58] shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            كامل الفترة
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter("today")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              timeFilter === "today"
                ? "bg-white text-[#0D5C58] shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>طلبات اليوم ({todayOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter("week")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeFilter === "week"
                ? "bg-white text-[#0D5C58] shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            هذا الأسبوع
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-[#0D5C58]">
          جاري تحميل الحسابات والبيانات المالية الحقيقية للمتجر...
        </div>
      ) : (
        <>
          {/* Financial Metrics Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Orders */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-50/60 to-white border border-teal-100 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-800 font-bold">أوردرات اليوم</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <span className="text-2xl font-black text-teal-950 block">
                {todayOrders.length} طلب
              </span>
              <span className="text-[11px] text-teal-700 font-bold block">
                بقيمة {todayGrossSales.toLocaleString("ar-EG")} ج.م
              </span>
            </div>

            {/* Card 2: Selected Month / Period Gross Sales */}
            <div className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs text-gray-500 font-bold">
                {selectedMonth === currentYearMonth
                  ? "مبيعات الشهر الحالي (يوم 1)"
                  : "إجمالي المبيعات المفلترة"}
              </span>
              <span className="text-2xl font-black text-gray-900 block">
                {grossSales.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
              <span className="text-[11px] text-gray-400 block">
                من واقع {filteredOrders.length} طلب ({deliveredOrdersCount} مسلّم)
              </span>
            </div>

            {/* Card 3: Platform Commission */}
            <div className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs text-gray-500 font-bold">
                عمولة المنصة من الطلبات
              </span>
              <span className="text-2xl font-black text-orange-600 block">
                {platformCommission.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
              <span className="text-[11px] text-gray-400 block">
                محسوبة لكل طلب بنسبته المحفوظة
              </span>
            </div>

            {/* Card 4: Net Merchant Payout */}
            <div className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-100 shadow-sm space-y-1.5">
              <span className="text-xs text-emerald-800 font-bold">صافي أرباح المتجر المستحقة</span>
              <span className="text-2xl font-black text-emerald-950 block">
                {netEarnings.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block">جاهز للتحويل للمحل</span>
            </div>
          </div>

          {/* Orders Breakdown */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-receipt text-[#0D5C58]"></i>
                <span>تفاصيل الطلبات المبني عليها الحساب المالي ({filteredOrders.length} طلب)</span>
              </h3>
              <span className="text-xs text-gray-500 font-medium">
                العمولة الأساسية الحالية للمتجر: <strong className="text-emerald-700 font-bold">{commissionRate}%</strong>
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                لا توجد طلبات واردة لهذا المتجر خلال الفترة المحددة، وبالتالي لا توجد عمولات مستحقة أو مبيعات مسجلة.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((ord) => {
                  const subtotal = Number(ord.subtotal || ord.originalSubtotal || ord.total || 0);
                  const discount = Number(ord.discountAmount || ord.discount || 0);
                  const bearer = ord.discountBearer || (ord.couponCode && (ord.couponCode === "OTLOB20" || ord.couponCode === "AHLAN" || ord.couponCode === "FREEDEL" || ord.storeSlug === "all") ? "platform" : "merchant");
                  // إذا كان الخصم من المنصة: المحل يستحق السعر الأصلي كاملاً (200 ج.م بدلاً من 180 ج.م)
                  const orderMerchantGross = bearer === "platform" ? subtotal : Math.max(0, subtotal - discount);
                  const orderRate = Number(ord.commissionRateSnapshot ?? ord.commissionRate ?? commissionRate);
                  // عمولة المنصة تُحسب دائماً على السعر الأصلي قبل الخصم ("نسبة المحل تبقا من غير الخصم")
                  const baseComm = Number(ord.platformCommission ?? ((subtotal * orderRate) / 100));
                  // خصم المنصة يُخصم من مستحقات المنصة على المحل
                  const platformCredit = bearer === "platform" ? discount : 0;
                  const orderComm = Math.max(0, baseComm - platformCredit);
                  const orderNet = bearer === "platform"
                    ? Math.max(0, subtotal - baseComm)
                    : Math.max(0, orderMerchantGross - baseComm);

                  return (
                    <div
                      key={ord.id || ord.orderNumber}
                      className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/60 transition-colors border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-gray-900">طلب #{ord.orderNumber || ord.id}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-bold">
                            {ord.status || "جديد"}
                          </span>
                          {discount > 0 && bearer === "platform" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-[#0D5C58] font-bold">
                              خصم منصة (+{discount} ج.م معوض للمحل)
                            </span>
                          )}
                          {discount > 0 && bearer === "merchant" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                              خصم محل (-{discount} ج.م)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 block">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleString("ar-EG") : "تاريخ غير محدد"}
                        </span>
                      </div>

                      <div className="flex items-center gap-5 text-left flex-wrap">
                        <div>
                          <span className="text-[10px] text-gray-400 block">استحقاق المحل</span>
                          <span className="font-bold text-gray-900 block">{orderMerchantGross.toFixed(2)} ج.م</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-orange-600 block">العمولة ({orderRate}%)</span>
                          <span className="font-bold text-orange-600 block">-{orderComm.toFixed(2)} ج.م</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-800 block">صافي المحل</span>
                          <span className="font-black text-emerald-700 block">{orderNet.toFixed(2)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MerchantFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0D5C58] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-600">جاري تحميل البيانات المالية...</p>
          </div>
        </div>
      }
    >
      <MerchantFinanceContent />
    </Suspense>
  );
}
