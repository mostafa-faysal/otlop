import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { storesService } from "./stores.service";
import { authService } from "./auth.service";
import { formatServiceAddress } from "@/lib/regions";

// Initial realistic default applications for testing
const INITIAL_APPLICATIONS = [
  {
    id: "app-101",
    storeName: "أسماك وفسخاني القناة",
    ownerName: "الحاج إبراهيم السويسي",
    phone: "01234567890",
    categoryName: "مأكولات بحرية وأسماك",
    categorySlug: "seafood",
    address: "شارع البحر، بجوار البنك الأهلي",
    commercialReg: "109842",
    notes: "مطعم سمك طازة يومياً، لدينا 3 طيارين للتوصيل السريع.",
    status: "pending", // pending | approved | rejected
    createdAt: "2026-11-01",
  },
  {
    id: "app-102",
    storeName: "عصائر ومشروبات فرغلي",
    ownerName: "كريم فرغلي",
    phone: "01023456781",
    categoryName: "عصائر ومثلجات",
    categorySlug: "sweets",
    address: "ميدان المحطة، أمام مدرسة الأمل",
    commercialReg: "98231",
    notes: "عصائر طبيعية وفواكه طازجة وآيس كريم.",
    status: "pending",
    createdAt: "2026-11-02",
  },
  {
    id: "app-103",
    storeName: "حلواني الصعيدي",
    ownerName: "المعلم رجب الصعيدي",
    phone: "01145678901",
    categoryName: "حلويات شرقية",
    categorySlug: "sweets",
    address: "شارع الجمهورية، بجوار كافيه النيل",
    commercialReg: "87654",
    notes: "كنافة وبسبوسة وجاتوهات بلدي.",
    status: "approved",
    createdAt: "2026-10-28",
  },
];

const HOMEPAGE_CONFIG_KEY = "otlob_homepage_config_v1";

const DEFAULT_HOMEPAGE_CONFIG = {
  featuredStores: {
    enabled: true,
    title: "محلات بنحبها في بلدنا",
    subtitle: "أسماء تعرفها، وأكل تثق فيه",
    maxCount: 4,
    selectedStoreIds: [
      "b2000000-0000-4000-8000-000000000001", // الحاج سيد
      "b2000000-0000-4000-8000-000000000006", // أسماك البركة الطازجة
      "b2000000-0000-4000-8000-000000000007", // برجر هاوس & كريب النجوم
      "b2000000-0000-4000-8000-000000000003", // مشويات الجوهرة
    ],
  },
  offerBanner: {
    enabled: false,
    storeId: "",
    storeSlug: "",
    storeName: "",
    badgeText: "عرض خاص",
    title: "",
    subtitle: "",
    couponCode: "",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 150,
    maxDiscount: 50,
    durationDays: 7,
    endsAt: null,
    appliesTo: "order_total", // order_total | menu_items
    ctaText: "اطلب العرض الآن",
  },
  trendingDishes: {
    enabled: true,
    title: "أكلات عليها الكلام",
    subtitle: "الأصناف الأكثر طلباً من مطاعمنا",
    maxCount: 4,
    selectedStoreId: "all",
    selectedProductIds: [],
  },
  sections: {
    showStatsBar: true,
    showCategories: true,
    showHowItWorks: true,
    showTestimonials: true,
    showMerchantCta: true,
  },
};

// Initial payments history - purely dynamic and based on real transactions
const INITIAL_PAYMENTS = [];

export const adminService = {
  /**
   * جلب كافة المتاجر للإدارة
   */
  async getStores(params = {}) {
    return storesService.getAllAdminStores();
  },

  /**
   * إضافة متجر جديد للمنصة
   */
  async createStore(payload) {
    const res = await storesService.createStore(payload);
    const createdStore = res?.store;
    if (createdStore) {
      const safeUsername = (payload.username || payload.slug || createdStore.slug || "").trim();
      const safePassword = (payload.password || "password123").trim();
      authService.saveMerchantCredentials({
        storeId: createdStore.id,
        storeSlug: createdStore.slug,
        storeName: createdStore.name,
        username: safeUsername,
        email: `${safeUsername}@otlob.com`,
        password: safePassword,
      });
    }
    return res;
  },

  /**
   * تحديث متجر
   */
  async updateStore(storeId, payload) {
    return storesService.updateStore(storeId, payload);
  },

  /**
   * حذف متجر نهائياً
   */
  async deleteStore(storeId) {
    return storesService.deleteStore(storeId);
  },

  /**
   * جلب إعدادات المنصة العامة
   */
  async getPlatformSettings() {
    try {
      return await axiosClient.get(ENDPOINTS.ADMIN.SETTINGS);
    } catch {
      return { settings: { defaultCommissionRate: 5 } };
    }
  },

  /**
   * تحديث إعدادات المنصة العامة
   */
  async updatePlatformSettings(payload) {
    try {
      return await axiosClient.patch(ENDPOINTS.ADMIN.SETTINGS, payload);
    } catch {
      return { settings: payload };
    }
  },

  /**
   * جلب كشف التحصيلات والمديونيات والتقارير المالية الشهرية (مبني 100% على الطلبات الحقيقية)
   */
  async getFinancialOverview(existingStores = null, existingOrders = null) {
    let stores = Array.isArray(existingStores)
      ? existingStores
      : [];
    if (!stores.length) {
      try {
        const res = await storesService.getAllAdminStores();
        stores = Array.isArray(res?.stores) ? res.stores : [];
      } catch {
        stores = [];
      }
    }

    // جلب الطلبات الفعلية
    let orders = existingOrders;
    if (!Array.isArray(orders)) {
      try {
        const ordRes = await ordersService.getOrders({ limit: 500 });
        orders = Array.isArray(ordRes?.items)
          ? ordRes.items
          : Array.isArray(ordRes?.data?.items)
          ? ordRes.data.items
          : Array.isArray(ordRes?.orders)
          ? ordRes.orders
          : [];
      } catch {
        orders = [];
      }
    }

    // جلب المدفوعات المسجلة فعلياً
    let payments = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_merchant_payments");
        if (stored) payments = JSON.parse(stored);
      } catch {}
    }

    // خريطة العمولات المخصصة
    const customCommissionMap = this.getCustomCommissionsMap();

    // نسبة العمولة العامة الافتراضية
    let defaultPlatformRate = 5;
    try {
      const settsRes = await this.getPlatformSettings();
      if (settsRes?.settings?.defaultCommissionRate) {
        defaultPlatformRate = Number(settsRes.settings.defaultCommissionRate);
      }
    } catch {}

    // حساب المديونيات والأرباح لكل متجر بناءً على طلباته الحقيقية
    const storeDebts = stores.map((s) => {
      const sId = String(s.id || "");
      const sSlug = String(s.slug || "");

      // تصفية طلبات هذا المتجر المستلمة أو غير الملغية
      const storeOrders = orders.filter((o) => {
        if (!o || o.status === "cancelled" || o.status === "rejected") return false;
        const ordStoreId = String(o.storeId || o.store_id || "");
        const ordStoreSlug = String(o.storeSlug || o.store_slug || "");
        return (
          (sId && ordStoreId === sId) ||
          (sSlug && (ordStoreSlug === sSlug || ordStoreId === sSlug))
        );
      });

      const ordersCount = storeOrders.length;

      // تحديد نسبة العمولة وما إذا كان المتجر مخصصاً
      const isCustom = customCommissionMap[s.id] !== undefined || Boolean(s.hasCustomCommission);
      const rate = isCustom
        ? Number(customCommissionMap[s.id] ?? s.commissionRate ?? defaultPlatformRate)
        : Number(s.commissionRate || defaultPlatformRate);

      // حساب المبيعات والعمولة لكل طلب على حدة مع تثبيت نسبة كل طلب ومصدر الخصم
      let grossSales = 0;
      let commissionTotal = 0;
      let netEarnings = 0;

      storeOrders.forEach((o) => {
        const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
        const discount = Number(o.discountAmount || o.discount || 0);
        const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");

        // إذا كان الخصم من المنصة: المحل يستحق السعر كاملاً دون نقصان
        // إذا كان الخصم من المحل: المحل يتحمل الخصم
        const orderMerchantGross = bearer === "platform" ? subtotal : Math.max(0, subtotal - discount);

        // نسبة العمولة المحفوظة وقت إنشاء الطلب أو النسبة الحالية كإجراء احتياطي للطلبات السابقة
        const orderRate = Number(o.commissionRateSnapshot ?? o.commissionRate ?? rate);
        const orderCommission = Number(o.platformCommission ?? ((orderMerchantGross * orderRate) / 100));

        grossSales += orderMerchantGross;
        commissionTotal += orderCommission;
        netEarnings += Math.max(0, orderMerchantGross - orderCommission);
      });

      grossSales = Math.round(grossSales);
      commissionTotal = Math.round(commissionTotal);
      netEarnings = Math.round(netEarnings);

      // مجموع المدفوعات المسددة من هذا المتجر
      const paid = payments
        .filter((p) => (sId && p.storeId === sId) || (sSlug && p.storeSlug === sSlug))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const remainingDebt = Math.max(0, commissionTotal - paid);

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        isOpen: s.isOpen,
        isActive: s.isActive,
        suspensionReason: s.suspensionReason,
        commissionRate: rate,
        hasCustomCommission: isCustom,
        ordersCount,
        grossSales,
        commissionTotal,
        netEarnings,
        paidAmount: paid,
        remainingDebt,
        status: remainingDebt === 0 ? "paid" : remainingDebt > 500 ? "overdue" : "pending",
      };
    });

    const totalDebts = storeDebts.reduce((sum, s) => sum + s.remainingDebt, 0);
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalSales = storeDebts.reduce((sum, s) => sum + s.grossSales, 0);
    const totalCommissionEarned = storeDebts.reduce((sum, s) => sum + s.commissionTotal, 0);
    const totalOrdersCount = storeDebts.reduce((sum, s) => sum + s.ordersCount, 0);

    // حساب إحصائيات طلبات اليوم الحالي
    const today = new Date();
    const todayDateStr = today.toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => {
      if (!o || o.status === "cancelled" || o.status === "rejected") return false;
      const d = o.createdAt || o.created_at ? new Date(o.createdAt || o.created_at) : null;
      return d && d.toISOString().slice(0, 10) === todayDateStr;
    });

    const todayOrdersCount = todayOrders.length;
    const todayGrossSales = Math.round(
      todayOrders.reduce((sum, o) => {
        const sub = Number(o.subtotal || o.originalSubtotal || o.total || 0);
        const disc = Number(o.discountAmount || o.discount || 0);
        const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
        return sum + (bearer === "platform" ? sub : Math.max(0, sub - disc));
      }, 0)
    );
    const todayCommissionEarned = Math.round(
      todayOrders.reduce((sum, o) => {
        const sub = Number(o.subtotal || o.originalSubtotal || o.total || 0);
        const disc = Number(o.discountAmount || o.discount || 0);
        const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
        const gross = bearer === "platform" ? sub : Math.max(0, sub - disc);
        const rate = Number(o.commissionRateSnapshot ?? o.commissionRate ?? defaultPlatformRate);
        return sum + Number(o.platformCommission ?? ((gross * rate) / 100));
      }, 0)
    );

    // بناء التقارير الشهرية ديناميكياً من واقع الطلبات الفعلية
    const monthlyReportsMap = {};
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    monthlyReportsMap[currentMonthKey] = {
      monthName: `${arabicMonths[now.getMonth()]} ${now.getFullYear()} (الشهر الحالي)`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      grossSales: 0,
      totalSales: 0,
      ordersCount: 0,
      commissionEarned: 0,
      collectedAmount: 0,
      collected: 0,
      remainingReceivable: 0,
      status: "جاري التحصيل",
    };

    orders.forEach((ord) => {
      if (!ord || ord.status === "cancelled" || ord.status === "rejected") return;
      const date = ord.createdAt || ord.created_at ? new Date(ord.createdAt || ord.created_at) : now;
      const yr = date.getFullYear();
      const mo = date.getMonth() + 1;
      const key = `${yr}-${mo}`;
      if (!monthlyReportsMap[key]) {
        monthlyReportsMap[key] = {
          monthName: `${arabicMonths[mo - 1]} ${yr}`,
          year: yr,
          month: mo,
          grossSales: 0,
          totalSales: 0,
          ordersCount: 0,
          commissionEarned: 0,
          collectedAmount: 0,
          collected: 0,
          remainingReceivable: 0,
          status: "جاري التحصيل",
        };
      }
      const ordSubtotal = Number(ord.subtotal || ord.originalSubtotal || ord.total || 0);
      const ordDiscount = Number(ord.discountAmount || ord.discount || 0);
      const bearer = ord.discountBearer || (ord.couponCode && (ord.couponCode === "OTLOB20" || ord.couponCode === "AHLAN" || ord.couponCode === "FREEDEL" || ord.storeSlug === "all") ? "platform" : "merchant");
      const matchedStore = storeDebts.find(
        (s) => s.id === (ord.storeId || ord.store_id) || s.slug === (ord.storeSlug || ord.store_slug)
      );
      const commRate = Number(ord.commissionRateSnapshot ?? ord.commissionRate ?? matchedStore?.commissionRate ?? defaultPlatformRate);
      const merchantGross = bearer === "platform" ? ordSubtotal : Math.max(0, ordSubtotal - ordDiscount);
      const comm = Number(ord.platformCommission ?? Math.round((merchantGross * commRate) / 100));

      monthlyReportsMap[key].grossSales += merchantGross;
      monthlyReportsMap[key].totalSales += merchantGross;
      monthlyReportsMap[key].ordersCount += 1;
      monthlyReportsMap[key].commissionEarned += comm;
    });

    // احتساب الدفعات المحصلة لكل شهر
    payments.forEach((p) => {
      const pDate = p.paymentDate || p.createdAt ? new Date(p.paymentDate || p.createdAt) : now;
      const pKey = `${pDate.getFullYear()}-${pDate.getMonth() + 1}`;
      if (monthlyReportsMap[pKey]) {
        monthlyReportsMap[pKey].collectedAmount += Number(p.amount || 0);
        monthlyReportsMap[pKey].collected += Number(p.amount || 0);
      }
    });

    const monthlyReports = Object.values(monthlyReportsMap)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month))
      .map((m) => {
        m.remainingReceivable = Math.max(0, m.commissionEarned - m.collectedAmount);
        m.status = m.remainingReceivable === 0 && m.commissionEarned > 0 ? "مسدد بالكامل" : "جاري التحصيل";
        return m;
      });

    return {
      totalDebts,
      totalCollected,
      totalSales,
      totalCommissionEarned,
      totalOrdersCount,
      todayOrdersCount,
      todayGrossSales,
      todayCommissionEarned,
      storeDebts,
      payments,
      monthlyReports,
    };
  },

  /**
   * جلب خريطة العمولات المخصصة للمتاجر من التخزين الدائم
   */
  getCustomCommissionsMap() {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("otlob_custom_commissions_map");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /**
   * تعيين عمولة مخصصة لمتجر بعينه
   */
  async setStoreCustomCommission(storeId, rate, storeSlug = null) {
    const numRate = Number(rate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      throw new Error("نسبة العمولة غير صالحة، يجب أن تكون بين 0 و 100");
    }

    if (typeof window !== "undefined") {
      try {
        const map = this.getCustomCommissionsMap();
        map[storeId] = numRate;
        if (storeSlug) map[storeSlug] = numRate;
        localStorage.setItem("otlob_custom_commissions_map", JSON.stringify(map));
      } catch {}
    }

    try {
      await storesService.updateStore(storeId, {
        commissionRate: numRate,
        hasCustomCommission: true,
        asAdmin: true,
      });
    } catch (e) {
      console.warn("Store commission update warning:", e.message);
    }
    return { success: true, commissionRate: numRate };
  },

  /**
   * إلغاء تخصيص العمولة لمتجر ليعود للعمولة العامة
   */
  async resetStoreToDefaultCommission(storeId, defaultRate = 5, storeSlug = null) {
    if (typeof window !== "undefined") {
      try {
        const map = this.getCustomCommissionsMap();
        delete map[storeId];
        if (storeSlug) delete map[storeSlug];
        localStorage.setItem("otlob_custom_commissions_map", JSON.stringify(map));
      } catch {}
    }

    try {
      await storesService.updateStore(storeId, {
        commissionRate: Number(defaultRate),
        hasCustomCommission: false,
        asAdmin: true,
      });
    } catch (e) {
      console.warn("Store commission reset warning:", e.message);
    }
    return { success: true, commissionRate: Number(defaultRate) };
  },

  /**
   * إلغاء تخصيص العمولة لكافة المحلات وإرجاعها للعمولة الأساسية للمنصة دفعة واحدة
   */
  async resetAllCustomCommissions(defaultRate = 5, storesList = []) {
    const numDefault = Number(defaultRate) || 5;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_custom_commissions_map", JSON.stringify({}));
      } catch {}
    }

    let resetCount = 0;
    for (const store of storesList) {
      if (store.hasCustomCommission) {
        try {
          await storesService.updateStore(store.id, {
            commissionRate: numDefault,
            hasCustomCommission: false,
            asAdmin: true,
            silent: true,
          });
          resetCount++;
        } catch {}
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otlob_stores_updated", {
          detail: { resetAllCustom: true, defaultRate: numDefault },
        })
      );
    }

    return { success: true, resetCount, defaultRate: numDefault };
  },

  /**
   * تطبيق العمولة العامة على كافة المحلات التي لا تملك عمولة مخصصة
   */
  async applyGlobalCommissionRate(globalRate, storesList = []) {
    const numRate = Number(globalRate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      throw new Error("نسبة العمولة غير صالحة");
    }

    // 1. تحديث إعدادات المنصة محلياً ودائماً
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_platform_settings");
        const current = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          "otlob_platform_settings",
          JSON.stringify({ ...current, defaultCommissionRate: numRate })
        );
      } catch {}
    }

    try {
      await this.updatePlatformSettings({ defaultCommissionRate: numRate });
    } catch {}

    const customMap = this.getCustomCommissionsMap();
    let updatedCount = 0;

    for (const store of storesList) {
      const isCustom = customMap[store.id] !== undefined || Boolean(store.hasCustomCommission);
      if (!isCustom) {
        try {
          await storesService.updateStore(store.id, {
            commissionRate: numRate,
            hasCustomCommission: false,
            asAdmin: true,
            silent: true,
          });
          updatedCount++;
        } catch {}
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("otlob_stores_updated", { detail: { globalRate: numRate } })
      );
    }

    return { success: true, updatedCount, globalRate: numRate };
  },

  /**
   * تسجيل دفعة تحصيل جديدة من متجر
   */
  async recordPayment(payload) {
    let payments = [...INITIAL_PAYMENTS];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_merchant_payments");
        if (stored) payments = JSON.parse(stored);
      } catch {}
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      storeId: payload.storeId,
      storeName: payload.storeName,
      amount: Number(payload.amount),
      paymentMethod: payload.paymentMethod || "cash",
      referenceNumber: payload.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      paymentDate: payload.paymentDate || new Date().toISOString().split("T")[0],
      notes: payload.notes || "",
      recordedBy: payload.recordedBy || "مدير المنصة",
    };

    payments.unshift(newPayment);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_merchant_payments", JSON.stringify(payments));
      } catch {}
    }

    return { payment: newPayment };
  },

  /**
   * تقديم طلب انضمام متجر جديد للمنصة
   */
  async submitStoreApplication(applicationData) {
    let apps = [...INITIAL_APPLICATIONS];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_store_applications");
        if (stored) apps = JSON.parse(stored);
      } catch {}
    }

    const catText = String(applicationData.category || applicationData.categoryName || "").toLowerCase();
    const resolvedCatSlug =
      applicationData.categorySlug ||
      (catText.includes("مشو") || catText.includes("كباب") ? "grills" :
       catText.includes("مخبوز") || catText.includes("فطير") || catText.includes("بيتزا") ? "pies" :
       catText.includes("برجر") || catText.includes("سريع") || catText.includes("سندوتش") ? "fastfood" :
       catText.includes("أسماك") || catText.includes("بحر") || catText.includes("سمك") ? "seafood" :
       catText.includes("حلو") || catText.includes("كنافة") ? "sweets" :
       catText.includes("عصير") || catText.includes("مشروب") ? "drinks" :
       catText.includes("بقالة") || catText.includes("سوبر") || catText.includes("ماركت") ? "grocery" : "egyptian");

    const newApp = {
      id: `app-${Date.now()}`,
      storeName: applicationData.storeName || "",
      ownerName: applicationData.ownerName || "",
      phone: applicationData.phone || "",
      categoryName: applicationData.category || applicationData.categoryName || "كشري وطواجن",
      categorySlug: resolvedCatSlug,
      address: applicationData.address || formatServiceAddress(applicationData.area),
      commercialReg: applicationData.commercialRegister || "قيد الاستخراج",
      notes: applicationData.notes || "طلب تسجيل تاجر جديد عبر الموقع",
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };

    apps.unshift(newApp);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_store_applications", JSON.stringify(apps));
      } catch {}
    }

    return { success: true, application: newApp };
  },

  /**
   * جلب طلبات انضمام المتاجر ومزامنة أي متجر تم اعتماده مسبقاً ليظهر على الفور في الموقع
   */
  async getStoreApplications() {
    let apps = [...INITIAL_APPLICATIONS];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_store_applications");
        if (stored) apps = JSON.parse(stored);
      } catch {}
    }

    return { applications: apps };
  },

  /**
   * مزامنة أي متجر اعتُمد في الداشبورد ولم ينشأ في قاعدة بيانات السيرفر
   */
  async syncPendingApprovedStores() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("otlob_store_applications");
      if (!stored) return;
      const apps = JSON.parse(stored);
      if (!Array.isArray(apps)) return;

      const { stores } = await storesService.getAllAdminStores().catch(() => ({ stores: [] }));
      const existingNames = new Set((stores || []).map((s) => (s?.name || "").trim().toLowerCase()));

      let changed = false;
      for (const app of apps) {
        if (app.status === "approved" && app.storeName && !existingNames.has(app.storeName.trim().toLowerCase())) {
          try {
            const cleanCat = app.categorySlug || "egyptian";
            const safeSlug = `store-${cleanCat}-${Date.now().toString(36)}`;
            const res = await storesService.createStore({
              name: app.storeName,
              slug: safeSlug,
              categoryName: app.categoryName || "مطاعم ومتاجر",
              categorySlug: cleanCat,
              address: app.address || formatServiceAddress(),
              description: `متجر معتمد حديثاً • ${app.notes || ""}`,
              deliveryFee: 15,
              minOrderAmount: 50,
              commissionRate: 5,
            });
            const created = res?.store;
            app.createdStoreId = created?.id || safeSlug;
            app.createdStoreSlug = created?.slug || safeSlug;
            existingNames.add(app.storeName.trim().toLowerCase());
            changed = true;
          } catch {}
        }
      }
      if (changed) {
        localStorage.setItem("otlob_store_applications", JSON.stringify(apps));
      }
    } catch {}
  },

  /**
   * تحديث حالة طلب الانضمام (قبول أو رفض)
   */
  async updateStoreApplication(appId, nextStatus, reason = "", credentials = null) {
    let apps = [...INITIAL_APPLICATIONS];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_store_applications");
        if (stored) apps = JSON.parse(stored);
      } catch {}
    }

    let targetApp = apps.find((a) => a.id === appId) || null;
    let createdStoreData = null;

    // في حال القبول: إنشاء المتجر أولاً في السيرفر وقاعدة البيانات وضمان اعتماده
    if (nextStatus === "approved" && targetApp) {
      const cleanCat = targetApp.categorySlug || "egyptian";
      const safeSlug = `store-${cleanCat}-${Date.now().toString(36)}`;
      try {
        const createdRes = await storesService.createStore({
          name: targetApp.storeName,
          slug: safeSlug,
          categoryName: targetApp.categoryName || "مطاعم ومتاجر",
          categorySlug: cleanCat,
          address: targetApp.address || formatServiceAddress(),
          description: `متجر معتمد حديثاً • ${targetApp.notes || ""}`,
          deliveryFee: 15,
          minOrderAmount: 50,
          commissionRate: 5,
        });
        createdStoreData = createdRes?.store || null;
      } catch (err) {
        console.error("Failed to create approved store in DB:", err);
        throw err;
      }

      const storeId = createdStoreData?.id || `store-${Date.now()}`;
      const storeSlug = createdStoreData?.slug || safeSlug;
      const safeUsername = credentials?.username || `merchant_${Date.now().toString().slice(-4)}`;
      const safePassword = credentials?.password || "password123";

      authService.saveMerchantCredentials({
        storeId,
        storeSlug,
        storeName: targetApp.storeName,
        username: safeUsername,
        email: `${safeUsername}@otlob.com`,
        password: safePassword,
      });

      targetApp.createdStoreId = storeId;
      targetApp.createdStoreSlug = storeSlug;
      targetApp.merchantUsername = safeUsername;
    }

    const updated = apps.map((app) => {
      if (app.id === appId) {
        return {
          ...app,
          status: nextStatus,
          rejectionReason: nextStatus === "rejected" ? reason : null,
          reviewedAt: new Date().toISOString(),
          createdStoreId: targetApp?.createdStoreId || app.createdStoreId || null,
          createdStoreSlug: targetApp?.createdStoreSlug || app.createdStoreSlug || null,
          merchantUsername: targetApp?.merchantUsername || app.merchantUsername || null,
        };
      }
      return app;
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_store_applications", JSON.stringify(updated));
      } catch {}
    }

    return { success: true };
  },

  /**
   * إعدادات الشريط العلوي وقائمة الإعلانات (Swiper Banners)
   */
  getAnnouncementsList() {
    const defaultList = [
      {
        id: "ad-1",
        active: true,
        storeName: "الحاج سيد",
        storeSlug: "haj-sayed",
        text: "ملوخية بالفراخ بـ 70 ج.م أو خصم 20 ج.م بكود «NADA20» من الحاج سيد!",
        badgeText: "إعلان مميز",
        createdAt: "2026-11-01",
      },
      {
        id: "ad-2",
        active: true,
        storeName: "أسماك البركة الطازجة",
        storeSlug: "al-baraka-seafood",
        text: "جمبري إسكندراني وسنجاري طازة مع خصم 15% بكود «SEAFOOD15»!",
        badgeText: "طازة اليوم",
        createdAt: "2026-11-02",
      },
      {
        id: "ad-3",
        active: true,
        storeName: "برجر هاوس & كريب النجوم",
        storeSlug: "burger-house",
        text: "توصيل مجاني لجميع طلبات البرجر والكريب فوق 80 ج.م بكود «FREEDEL»!",
        badgeText: "توصيل مجاني",
        createdAt: "2026-11-02",
      },
      {
        id: "ad-4",
        active: true,
        storeName: "مشويات الجوهرة",
        storeSlug: "gawhara",
        text: "خصم 40 ج.م على صينية ميكس الجريل العائلية المشوية على الفحم!",
        badgeText: "عرض العيلة",
        createdAt: "2026-10-30",
      },
    ];

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_announcements_list");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultList;
  },

  saveAnnouncementsList(list) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_announcements_list", JSON.stringify(list));
      } catch {}
    }
    return list;
  },

  addAnnouncement(ad) {
    const list = this.getAnnouncementsList();
    const newAd = {
      id: "ad-" + Date.now(),
      active: true,
      storeName: ad.storeName || "متجر مميز",
      storeSlug: ad.storeSlug || "haj-sayed",
      text: ad.text,
      badgeText: ad.badgeText || "إعلان مميز",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [newAd, ...list];
    this.saveAnnouncementsList(updated);
    return newAd;
  },

  deleteAnnouncement(adId) {
    const list = this.getAnnouncementsList();
    const updated = list.filter((a) => a.id !== adId);
    this.saveAnnouncementsList(updated);
    return updated;
  },

  updateAnnouncement(adId, updates) {
    const list = this.getAnnouncementsList();
    const updated = list.map((a) => (a.id === adId ? { ...a, ...updates } : a));
    this.saveAnnouncementsList(updated);
    return updated;
  },

  toggleAnnouncement(adId) {
    const list = this.getAnnouncementsList();
    const updated = list.map((a) =>
      a.id === adId ? { ...a, active: !a.active } : a
    );
    this.saveAnnouncementsList(updated);
    return updated;
  },

  /**
   * طلبات الإعلانات الواردة من المحلات
   */
  getMerchantAdRequests() {
    const defaultRequests = [
      {
        id: "adreq-1",
        storeId: "b2000000-0000-4000-8000-000000000003",
        storeName: "مشويات الجوهرة",
        storeSlug: "gawhara",
        text: "كباب وكفتة ضاني طازة على الفحم مع سلطات وطحينة بلدي مجاناً",
        badgeText: "مشويات بلدي",
        feeAmount: 200,
        status: "pending", // pending | approved | rejected
        submittedAt: "2026-11-02",
      },
      {
        id: "adreq-2",
        storeId: "b2000000-0000-4000-8000-000000000008",
        storeName: "حلويات السلطان الشرقية والغربية",
        storeSlug: "al-sultan-sweets",
        text: "صواني بسبوسة وكنافة بالقشطة سخنة بالسمن البلدي وعصائر فريش",
        badgeText: "حاجة حلوة",
        feeAmount: 200,
        status: "pending",
        submittedAt: "2026-11-03",
      },
    ];

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_merchant_ad_requests");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return defaultRequests;
  },

  saveMerchantAdRequests(requests) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_merchant_ad_requests", JSON.stringify(requests));
      } catch {}
    }
    return requests;
  },

  submitMerchantAdRequest(payload) {
    const requests = this.getMerchantAdRequests();
    const newReq = {
      id: "adreq-" + Date.now(),
      storeId: payload.storeId,
      storeName: payload.storeName,
      storeSlug: payload.storeSlug,
      text: payload.text,
      badgeText: payload.badgeText || "إعلان محل",
      feeAmount: 200,
      status: "pending",
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [newReq, ...requests];
    this.saveMerchantAdRequests(updated);
    return newReq;
  },

  approveMerchantAdRequest(requestId) {
    const requests = this.getMerchantAdRequests();
    let approved = null;
    const updated = requests.map((r) => {
      if (r.id === requestId) {
        approved = { ...r, status: "approved", approvedAt: new Date().toISOString() };
        return approved;
      }
      return r;
    });
    this.saveMerchantAdRequests(updated);

    // نشر الإعلان فوراً في شريط السلايدر العلوي للموقع بعد موافقة الأدمن وتحصيل الرسوم
    if (approved) {
      this.addAnnouncement({
        storeName: approved.storeName,
        storeSlug: approved.storeSlug,
        text: approved.text,
        badgeText: approved.badgeText || "إعلان مميز",
      });
    }
    return approved;
  },

  rejectMerchantAdRequest(requestId) {
    const requests = this.getMerchantAdRequests();
    const updated = requests.map((r) =>
      r.id === requestId ? { ...r, status: "rejected" } : r
    );
    this.saveMerchantAdRequests(updated);
    return updated;
  },

  updateMerchantAdRequest(requestId, updates) {
    const requests = this.getMerchantAdRequests();
    const updated = requests.map((r) =>
      r.id === requestId ? { ...r, ...updates } : r
    );
    this.saveMerchantAdRequests(updated);
    return updated;
  },

  /**
   * إدارة كوبونات الخصم للمتاجر والمنصة
   */
  getCoupons() {
    const defaultCoupons = [];

    let list = defaultCoupons;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("otlob_coupons_list");
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            list = parsed;
          }
        }
      } catch {}
    }

    // دمج كوبون بانر العروض الحية بالصفحة الرئيسية فقط إذا كان مفعلاً ويحتوي على كود حقيقي
    try {
      const banner = this.getHomepageConfig()?.offerBanner;
      const isBannerExpired = banner?.endsAt && new Date(banner.endsAt).getTime() <= Date.now();
      if (banner && banner.enabled === true && !isBannerExpired && banner.couponCode?.trim()) {
        const cleanBannerCode = String(banner.couponCode).trim().toUpperCase();
        const exists = list.find((c) => c.code === cleanBannerCode);
        if (!exists) {
          list = [
            {
              id: "coup-banner-homepage",
              code: cleanBannerCode,
              storeId: banner.storeSlug === "all" ? "all" : (banner.storeId || "all"),
              storeName: banner.storeName || "عرض الصفحة الرئيسية",
              storeSlug: banner.storeSlug || "all",
              discountType: banner.discountType || "percentage",
              discountValue: Number(banner.discountValue) || 20,
              minOrderAmount: Number(banner.minOrderAmount) || 0,
              maxDiscount: Number(banner.maxDiscount) || null,
              endsAt: banner.endsAt || null,
              active: true,
              usageCount: 0,
              discountBearer: "platform",
            },
            ...list,
          ];
        }
      }
    } catch {}

    return list;
  },

  saveCoupons(coupons) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("otlob_coupons_list", JSON.stringify(coupons));
        window.dispatchEvent(new CustomEvent("otlob_offers_updated"));
        window.dispatchEvent(new CustomEvent("otlob_coupons_updated"));
      } catch {}
    }
    return coupons;
  },

  createCoupon(payload) {
    const list = this.getCoupons();
    const bearer = payload.discountBearer || (payload.storeId === "all" ? "platform" : "merchant");
    const newCoupon = {
      id: "coup-" + Date.now(),
      code: (payload.code || "").trim().toUpperCase(),
      storeId: payload.storeId || "all",
      storeName: payload.storeName || "جميع المتاجر",
      storeSlug: payload.storeSlug || "all",
      discountType: payload.discountType || "percentage",
      discountValue: Number(payload.discountValue) || 10,
      minOrderAmount: Number(payload.minOrderAmount) || 0,
      maxDiscount: payload.maxDiscount ? Number(payload.maxDiscount) : null,
      startsAt: payload.startsAt || new Date().toISOString(),
      endsAt: payload.endsAt || null,
      active: true,
      usageCount: 0,
      discountBearer: bearer,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const updated = [newCoupon, ...list];
    this.saveCoupons(updated);
    return newCoupon;
  },

  deleteCoupon(couponId) {
    const list = this.getCoupons();
    const cleanId = String(couponId || "").trim();
    const updated = list.filter((c) => c.id !== cleanId && c.code !== cleanId);
    this.saveCoupons(updated);

    // إذا كان الكوبون مرتبطاً ببانر العروض أو كود البانر، يتم تعطيل البانر ومسح الكود لمنع ظهوره ثانية
    try {
      const cfg = this.getHomepageConfig();
      if (
        cleanId === "coup-banner-homepage" ||
        cleanId.startsWith("coup-banner") ||
        (cfg?.offerBanner?.couponCode && String(cfg.offerBanner.couponCode).trim().toUpperCase() === cleanId.toUpperCase())
      ) {
        if (cfg?.offerBanner) {
          cfg.offerBanner.enabled = false;
          cfg.offerBanner.couponCode = "";
          this.saveHomepageConfig(cfg);
        }
      }
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail: { deletedId: couponId } }));
      window.dispatchEvent(new CustomEvent("otlob_coupons_updated", { detail: { deletedId: couponId } }));
    }
    return updated;
  },

  toggleCoupon(couponId) {
    const list = this.getCoupons();
    const updated = list.map((c) =>
      c.id === couponId ? { ...c, active: !c.active } : c
    );
    this.saveCoupons(updated);
    return updated;
  },

  validateCoupon(code, { storeId, storeSlug, subtotal = 0 }) {
    const list = this.getCoupons();
    const cleanCode = (code || "").trim().toUpperCase();
    let coupon = list.find((c) => c.code === cleanCode && c.active);

    // التحقق المباشر من بانر الصفحة الرئيسية في حال كان الكوبون منشوراً به
    if (!coupon) {
      try {
        const banner = this.getHomepageConfig()?.offerBanner;
        const isBannerExpired = banner?.endsAt && new Date(banner.endsAt).getTime() <= Date.now();
        if (
          banner &&
          banner.enabled === true &&
          !isBannerExpired &&
          banner.couponCode &&
          banner.couponCode.trim().toUpperCase() === cleanCode
        ) {
          coupon = {
            id: "coup-banner-direct",
            code: cleanCode,
            storeId: banner.storeSlug === "all" ? "all" : (banner.storeId || "all"),
            storeName: banner.storeName || "عرض الصفحة الرئيسية",
            storeSlug: banner.storeSlug || "all",
            discountType: banner.discountType || "percentage",
            discountValue: Number(banner.discountValue) || 20,
            minOrderAmount: Number(banner.minOrderAmount) || 0,
            maxOrderAmount: Number(banner.maxOrderAmount) || (Number(banner.maxDiscount) && Number(banner.maxDiscount) > 100 ? Number(banner.maxDiscount) : null),
            maxDiscount: Number(banner.maxDiscount) || null,
            active: true,
            discountBearer: "platform",
          };
        }
      } catch {}
    }

    if (!coupon) {
      throw new Error("كود الخصم غير صحيح أو منتهي الصلاحية.");
    }

    const discountBearer =
      coupon.discountBearer ||
      (coupon.storeId === "all" || coupon.isPlatform ? "platform" : "merchant");

    if (coupon.storeId !== "all" && coupon.storeId !== storeId && coupon.storeSlug !== storeSlug) {
      throw new Error(`هذا الكوبون مخصص فقط لطلبات متجر «${coupon.storeName}».`);
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      throw new Error(`الحد الأدنى لتطبيق هذا الكوبون هو ${coupon.minOrderAmount} ج.م.`);
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
    } else {
      discount = Number(coupon.discountValue) || 20;
    }

    if (coupon.maxDiscount && Number(coupon.maxDiscount) > 0) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }

    return {
      valid: true,
      coupon: {
        ...coupon,
        discountBearer,
      },
      discountAmount: discount,
      discountBearer,
      message: `تم تطبيق خصم ${discount} ج.م (${coupon.code}) - ${discountBearer === "platform" ? "متحمل من المنصة" : "متحمل من المتجر"}`,
    };
  },

  /**
   * الإعدادات الافتراضية الثابتة للصفحة الرئيسية
   */
  getDefaultHomepageConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONFIG));
  },

  /**
   * التحكم الكامل في أقسام الصفحة الرئيسية (Homepage CMS Control)
   */
  getHomepageConfig() {
    const cloneDefault = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CONFIG));
    if (typeof window === "undefined") {
      return cloneDefault;
    }

    try {
      const raw = localStorage.getItem(HOMEPAGE_CONFIG_KEY);
      if (!raw) return cloneDefault;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return cloneDefault;

      return {
        featuredStores: {
          ...cloneDefault.featuredStores,
          ...(parsed.featuredStores || {}),
          selectedStoreIds: Array.isArray(parsed.featuredStores?.selectedStoreIds)
            ? parsed.featuredStores.selectedStoreIds
            : cloneDefault.featuredStores.selectedStoreIds,
        },
        offerBanner: {
          ...cloneDefault.offerBanner,
          ...(parsed.offerBanner || {}),
        },
        trendingDishes: {
          ...cloneDefault.trendingDishes,
          ...(parsed.trendingDishes || {}),
          selectedProductIds: Array.isArray(parsed.trendingDishes?.selectedProductIds)
            ? parsed.trendingDishes.selectedProductIds
            : cloneDefault.trendingDishes.selectedProductIds,
        },
        sections: {
          ...cloneDefault.sections,
          ...(parsed.sections || {}),
        },
      };
    } catch {
      return cloneDefault;
    }
  },

  saveHomepageConfig(nextConfig) {
    const current = this.getHomepageConfig();
    const merged = {
      featuredStores: {
        ...current.featuredStores,
        ...(nextConfig.featuredStores || {}),
      },
      offerBanner: {
        ...current.offerBanner,
        ...(nextConfig.offerBanner || {}),
      },
      trendingDishes: {
        ...current.trendingDishes,
        ...(nextConfig.trendingDishes || {}),
      },
      sections: {
        ...current.sections,
        ...(nextConfig.sections || {}),
      },
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HOMEPAGE_CONFIG_KEY, JSON.stringify(merged));
        // مزامنة كوبون البانر في سجل الكوبونات العامة للمنصة
        if (merged.offerBanner?.couponCode) {
          const bannerCode = String(merged.offerBanner.couponCode).trim().toUpperCase();
          const currentCoupons = this.getCoupons();
          const nextCoupons = currentCoupons.filter((c) => c.code !== bannerCode);
          nextCoupons.unshift({
            id: "coup-banner-" + bannerCode,
            code: bannerCode,
            storeId: merged.offerBanner.storeSlug === "all" ? "all" : (merged.offerBanner.storeId || "all"),
            storeName: merged.offerBanner.storeName || "عرض الصفحة الرئيسية",
            storeSlug: merged.offerBanner.storeSlug || "all",
            discountType: merged.offerBanner.discountType || "percentage",
            discountValue: Number(merged.offerBanner.discountValue) || 20,
            minOrderAmount: Number(merged.offerBanner.minOrderAmount) || 0,
            maxDiscount: Number(merged.offerBanner.maxDiscount) || null,
            endsAt: merged.offerBanner.endsAt || null,
            active: merged.offerBanner.enabled !== false,
            usageCount: 0,
            discountBearer: "platform",
            createdAt: new Date().toISOString().slice(0, 10),
          });
          this.saveCoupons(nextCoupons);
        }

        window.dispatchEvent(new Event("otlob_homepage_updated"));

        // حفظ في قاعدة البيانات عبر واجهة الـ API
        try {
          axiosClient
            .patch(ENDPOINTS.ADMIN.SETTINGS, { homepageConfig: merged })
            .catch(() => {});
        } catch {}
      } catch {}
    }

    return merged;
  },

  toggleFeaturedStoreOnHomepage(storeId) {
    const current = this.getHomepageConfig();
    const ids = Array.isArray(current.featuredStores.selectedStoreIds)
      ? [...current.featuredStores.selectedStoreIds]
      : [];
    const exists = ids.includes(storeId);
    const nextIds = exists
      ? ids.filter((id) => id !== storeId)
      : [storeId, ...ids];

    return this.saveHomepageConfig({
      featuredStores: {
        ...current.featuredStores,
        enabled: true,
        selectedStoreIds: nextIds,
      },
    });
  },

  setHomepageBannerStore(store, offerOrCoupon = null) {
    if (!store) return this.getHomepageConfig();
    const current = this.getHomepageConfig();
    const coupons = this.getCoupons();
    const matchedCoupon =
      offerOrCoupon ||
      coupons.find(
        (c) =>
          c.active &&
          (c.storeId === store.id || c.storeSlug === store.slug)
      ) ||
      null;

    const computedTitle =
      offerOrCoupon?.title ||
      store.offerText ||
      (matchedCoupon
        ? matchedCoupon.discountType === "percentage"
          ? `خصم ${matchedCoupon.discountValue}% من ${store.name}`
          : `خصم ${matchedCoupon.discountValue} ج.م من ${store.name}`
        : `اطلب أشهى الوجبات الطازجة من ${store.name}`);

    const computedSubtitle =
      offerOrCoupon?.description ||
      (matchedCoupon
        ? `استخدم كود «${matchedCoupon.code}» عند الطلب من ${store.name}${
            matchedCoupon.minOrderAmount
              ? ` للطلبات فوق ${matchedCoupon.minOrderAmount} ج.م`
              : ""
          }`
        : store.description || `توصيل سريع وساخن من ${store.name} لحد باب بيتك`);

    return this.saveHomepageConfig({
      offerBanner: {
        ...current.offerBanner,
        enabled: true,
        storeId: store.id,
        storeSlug: store.slug,
        storeName: store.name,
        badgeText: "عرض الصفحة الرئيسية",
        title: computedTitle,
        subtitle: computedSubtitle,
        couponCode: offerOrCoupon?.code || matchedCoupon?.code || "",
        discountValue: Number(
          offerOrCoupon?.discountValue || matchedCoupon?.discountValue || 0
        ),
        ctaText: `اطلب من ${store.name}`,
      },
    });
  },

  /**
   * إيقاف متجر يدويًا بواسطة السوبر أدمن (is_active = false)
   */
  async suspendStore(storeId, payload) {
    return storesService.updateStore(storeId, {
      isActive: false,
      suspensionReason: payload.reason || "تجميد إداري لعدم سداد المستحقات",
      suspendedAt: new Date().toISOString(),
    });
  },

  /**
   * إعادة تفعيل متجر يدويًا بواسطة السوبر أدمن (is_active = true)
   */
  async reactivateStore(storeId, payload = {}) {
    return storesService.updateStore(storeId, {
      isActive: true,
      suspensionReason: null,
      reactivatedAt: new Date().toISOString(),
    });
  },

  /**
   * فتح أو إغلاق استقبال الطلبات للمتجر يدويًا بواسطة السوبر أدمن (is_open)
   */
  async setStoreOpenStatus(storeId, payload) {
    return storesService.updateStore(storeId, {
      isOpen: Boolean(payload.isOpen ?? payload.is_open),
    });
  },
};


