"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { adminService } from "@/services/admin.service";
import { reviewsService } from "@/services/reviews.service";
import { storesService } from "@/services/stores.service";
import { authService } from "@/services/auth.service";
import { ordersService } from "@/services/orders.service";
import { productsService } from "@/services/products.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function SuperAdminPage() {
  const { user, setUser, initAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("stores");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Admin inline login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");

  // Data states
  const [stores, setStores] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [financialData, setFinancialData] = useState({
    totalDebts: 0,
    totalCollected: 0,
    totalSales: 0,
    totalCommissionEarned: 0,
    storeDebts: [],
    payments: [],
    monthlyReports: [],
  });
  const [applications, setApplications] = useState([]);
  const [settings, setSettings] = useState({ defaultCommissionRate: 5 });
  const [globalCommissionInput, setGlobalCommissionInput] = useState(5);
  const [applyingGlobalCommission, setApplyingGlobalCommission] = useState(false);
  const [storeCommissionDrafts, setStoreCommissionDrafts] = useState({});
  const [savingStoreCommissionId, setSavingStoreCommissionId] = useState(null);
  const [resettingAllCommissions, setResettingAllCommissions] = useState(false);

  // Global Live Orders Feed State
  const [liveOrders, setLiveOrders] = useState([]);
  const [liveOrdersLoading, setLiveOrdersLoading] = useState(false);
  const [selectedOrderStore, setSelectedOrderStore] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderTimeFilter, setOrderTimeFilter] = useState("all"); // "all" | "today" | "week" | "month"
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [seenOrderIds, setSeenOrderIds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("otlob_admin_seen_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Global Categories & Homepage Curation State
  const [globalCategories, setGlobalCategories] = useState([]);
  const [homepageConfig, setHomepageConfig] = useState(() =>
    adminService.getHomepageConfig()
  );
  const [selectedProfitMonth, setSelectedProfitMonth] = useState("all");
  const [drillDownStore, setDrillDownStore] = useState(null);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    name: "",
    slug: "",
    iconClass: "fa-utensils",
  });
  const [offerBannerForm, setOfferBannerForm] = useState(() => {
    const banner = adminService.getHomepageConfig()?.offerBanner || {};
    return {
      enabled: banner.enabled !== false,
      title: banner.title || "خصم 20% على طلباتك",
      subtitle: banner.subtitle || "استخدم كود «NADA20» عند الطلب واستمتع بأقوى العروض",
      storeId: banner.storeId || "all",
      badgeText: banner.badgeText || "عرض الصفحة الرئيسية",
      couponCode: banner.couponCode || "NADA20",
      discountType: banner.discountType || "percentage",
      discountValue: banner.discountValue !== undefined ? Number(banner.discountValue) : 20,
      minOrderAmount: banner.minOrderAmount !== undefined ? Number(banner.minOrderAmount) : 100,
      maxDiscount: banner.maxDiscount !== undefined && banner.maxDiscount !== null ? banner.maxDiscount : 50,
      durationDays: banner.durationDays !== undefined ? Number(banner.durationDays) : 7,
      endsAt: banner.endsAt || "",
      appliesTo: banner.appliesTo || "order_total",
    };
  });
  const [storeSearchPin, setStoreSearchPin] = useState("");

  // Swiper Announcements & Ad requests
  const [announcements, setAnnouncements] = useState([]);
  const [merchantAdRequests, setMerchantAdRequests] = useState([]);
  const [editingAdId, setEditingAdId] = useState(null);
  const [editAdForm, setEditAdForm] = useState({ text: "", badgeText: "" });
  const [newAdForm, setNewAdForm] = useState({
    storeName: "كشري وحواوشي الحاج سيد",
    storeSlug: "haj-sayed",
    text: "",
    badgeText: "إعلان مميز",
  });

  // Coupons state
  const [coupons, setCoupons] = useState([]);
  const [newCouponForm, setNewCouponForm] = useState({
    code: "",
    storeId: "all",
    storeName: "جميع المتاجر",
    storeSlug: "all",
    discountType: "percentage",
    discountValue: 15,
    minOrderAmount: 100,
    maxDiscount: "",
    durationDays: 30,
  });

  // Filters & UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all"); // all | active | suspended | closed
  const [updatingId, setUpdatingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Modals state
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    name: "",
    slug: "",
    categoryName: "أكل مصري",
    categorySlug: "egyptian",
    address: "",
    phone: "",
    deliveryFee: 15,
    minOrderAmount: 50,
    commissionRate: 5,
    description: "",
    username: "",
    password: "",
  });

  const [viewingCredentialsStore, setViewingCredentialsStore] = useState(null);
  const [storeCredentials, setStoreCredentials] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    storeId: "",
    amount: "",
    paymentMethod: "vodafone_cash",
    referenceNumber: "",
    notes: "",
  });

  const [storeToDelete, setStoreToDelete] = useState(null);

  // Admins Management State (إضافة وإدارة الأدمن)
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    adminTitle: "مدير عمليات المنصة",
  });
  const [adminFormMsg, setAdminFormMsg] = useState({ text: "", type: "" });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const loadAllData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [storesRes, appsRes, revsRes, settsRes, ordersRes, catsRes] = await Promise.all([
        adminService.getStores(),
        adminService.getStoreApplications(),
        reviewsService.listAllReviews({ status: "all" }).catch(() => ({ reviews: [] })),
        adminService.getPlatformSettings(),
        ordersService.getOrders({ limit: 100 }).catch(() => ({ items: [] })),
        storesService.getCategories({ activeOnly: false }).catch(() => ({ categories: [] })),
      ]);

      const fetchedStores = Array.isArray(storesRes?.stores)
        ? storesRes.stores
        : [];
      setStores(fetchedStores);

      const fetchedOrders = Array.isArray(ordersRes?.items)
        ? ordersRes.items
        : Array.isArray(ordersRes?.data?.items)
        ? ordersRes.data.items
        : Array.isArray(ordersRes?.orders)
        ? ordersRes.orders
        : [];
      setLiveOrders(fetchedOrders);

      if (settsRes?.settings) {
        setSettings(settsRes.settings);
        if (settsRes.settings.defaultCommissionRate) {
          setGlobalCommissionInput(settsRes.settings.defaultCommissionRate);
        }
      }

      const finRes = await adminService.getFinancialOverview(fetchedStores, fetchedOrders);
      if (finRes) {
        setFinancialData(finRes);
      }
      if (Array.isArray(appsRes?.applications)) {
        setApplications(appsRes.applications);
      }
      if (Array.isArray(revsRes?.reviews)) {
        setReviews(revsRes.reviews);
      }

      const fetchedCats = Array.isArray(catsRes?.categories) ? catsRes.categories : [];
      setGlobalCategories(fetchedCats);

      setAnnouncements(adminService.getAnnouncementsList());
      setMerchantAdRequests(adminService.getMerchantAdRequests());
      setCoupons(adminService.getCoupons());
      setAdminsList(authService.getAdminsList());
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Live polling for global orders feed every 6 seconds
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    const interval = setInterval(async () => {
      try {
        const res = await ordersService.getOrders({ limit: 100 });
        const items = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.orders)
          ? res.orders
          : [];
        setLiveOrders(items);
        adminService.getFinancialOverview(stores, items).then((fin) => {
          if (fin) setFinancialData(fin);
        });
      } catch {}
    }, 6000);
    return () => clearInterval(interval);
  }, [user, stores]);

  const toggleOrderSeen = (orderId) => {
    setSeenOrderIds((prev) => {
      const exists = prev.includes(orderId);
      const next = exists ? prev.filter((id) => id !== orderId) : [...prev, orderId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("otlob_admin_seen_orders", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const handleToggleStorePinned = (storeId) => {
    const currentPinned =
      homepageConfig?.featuredStores?.selectedStoreIds ||
      homepageConfig?.featuredStores?.storeIds ||
      [];
    const isPinned = currentPinned.includes(storeId);
    const nextPinned = isPinned
      ? currentPinned.filter((id) => id !== storeId)
      : [...currentPinned, storeId];

    const nextConfig = {
      ...homepageConfig,
      featuredStores: {
        ...homepageConfig.featuredStores,
        storeIds: nextPinned,
        selectedStoreIds: nextPinned,
      },
    };
    adminService.saveHomepageConfig(nextConfig);
    setHomepageConfig(nextConfig);
    showToast(isPinned ? "تم إلغاء تثبيت المتجر من الواجهة" : "تم تثبيت المتجر في قسم الوصول السريع بالواجهة بنجاح");
  };

  const handleToggleCategoryActive = async (catId, currentActive) => {
    const nextActive = !currentActive;
    try {
      await storesService.updateCategory(catId, { isActive: nextActive });
      setGlobalCategories((prev) =>
        prev.map((c) => (c.id === catId || c.slug === catId ? { ...c, isActive: nextActive } : c))
      );
      showToast(nextActive ? "تم تفعيل التصنيف للمنصة والمتاجر" : "تم إيقاف التصنيف وإخفاؤه ومنع التسجيل به");
    } catch (err) {
      console.error("Error updating category active status:", err);
      showToast("حدث خطأ أثناء تحديث حالة التصنيف في الخادم.");
    }
  };

  const openStoreDrillDown = (ord) => {
    const orderKey = ord.id || ord.orderNumber;
    if (!seenOrderIds.includes(orderKey)) {
      toggleOrderSeen(orderKey);
    }
    const matched =
      stores.find(
        (s) =>
          s.id === ord.storeId ||
          s.id === ord.store?.id ||
          s.slug === ord.storeSlug ||
          s.name === ord.storeName
      ) || {
        id: ord.storeId || "unknown",
        name: ord.storeName || ord.store?.name || "متجر معتمد",
        phone: ord.storePhone || ord.customerPhone || "01000000000",
        address: ord.storeAddress || ord.deliveryAddress || "باسوس، القليوبية",
        isOpen: true,
        commissionRate: 5,
        slug: ord.storeSlug || null,
        description: "متجر نشط ضمن شبكة أطلب باسوس",
      };
    setDrillDownStore(matched);
  };

  const handleSaveOfferBanner = (formDataOrEvent) => {
    let formState = offerBannerForm;
    if (formDataOrEvent && typeof formDataOrEvent === "object" && !formDataOrEvent.preventDefault) {
      formState = { ...offerBannerForm, ...formDataOrEvent };
    } else if (formDataOrEvent && formDataOrEvent.preventDefault) {
      formDataOrEvent.preventDefault();
    }

    const matchedStore = stores.find((s) => s.id === formState.storeId);

    // حساب تاريخ الانتهاء بناءً على عدد الأيام إن لم يكن مدخلاً يدوياً
    let computedEndsAt = formState.endsAt || null;
    if (formState.durationDays && !computedEndsAt) {
      computedEndsAt = new Date(
        Date.now() + Number(formState.durationDays) * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const minVal = Number(formState.minOrderAmount) || 0;
    const maxVal =
      formState.maxDiscount !== undefined &&
      formState.maxDiscount !== null &&
      formState.maxDiscount !== ""
        ? Number(formState.maxDiscount)
        : null;

    const nextBanner = {
      ...homepageConfig?.offerBanner,
      ...formState,
      endsAt: computedEndsAt,
      minOrderAmount: minVal,
      maxDiscount: maxVal,
      maxOrderAmount: maxVal,
      storeSlug: matchedStore?.slug || "all",
      storeName: matchedStore?.name || "جميع المتاجر",
    };
    const nextConfig = {
      ...homepageConfig,
      offerBanner: nextBanner,
    };
    adminService.saveHomepageConfig(nextConfig);
    setHomepageConfig(nextConfig);
    setOfferBannerForm(nextBanner);
    showToast("تم حفظ ونشر إعدادات عروض الصفحة الرئيسية بنجاح");
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatForm.name.trim()) return;
    const cleanSlug =
      newCatForm.slug.trim() ||
      newCatForm.name.trim().toLowerCase().replace(/\s+/g, "-") ||
      `cat-${Date.now()}`;
    try {
      const res = await storesService.createCategory({
        name: newCatForm.name.trim(),
        slug: cleanSlug,
        isActive: true,
      });
      const created = res?.category || res?.data?.category || {
        id: `cat-${Date.now()}`,
        name: newCatForm.name.trim(),
        slug: cleanSlug,
        isActive: true,
      };
      setGlobalCategories((prev) => [...prev, created]);
      setIsAddCatModalOpen(false);
      setNewCatForm({ name: "", slug: "", iconClass: "fa-utensils" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("otlob_categories_updated", { detail: created }));
      }
      showToast("تمت إضافة التصنيف بنجاح وأصبح متاحاً في الموقع وللتجار");
    } catch {
      const localCat = {
        id: `cat-${Date.now()}`,
        name: newCatForm.name.trim(),
        slug: cleanSlug,
        isActive: true,
      };
      setGlobalCategories((prev) => [...prev, localCat]);
      setIsAddCatModalOpen(false);
      setNewCatForm({ name: "", slug: "", iconClass: "fa-utensils" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("otlob_categories_updated", { detail: localCat }));
      }
      showToast("تمت إضافة التصنيف بنجاح وأصبح متاحاً في الموقع وللتجار");
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLoading(false);
      authService.initCsrf();
      return;
    }
    loadAllData(true);
    const handleSync = () => {
      loadAllData(false);
    };
    window.addEventListener("otlob_stores_updated", handleSync);
    return () => {
      window.removeEventListener("otlob_stores_updated", handleSync);
    };
  }, [user?.id, user?.role]);

  const handleAdminLogin = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setAdminLoginLoading(true);
    setAdminLoginError("");
    try {
      const res = await authService.login({
        email: adminEmail.trim(),
        password: adminPassword.trim(),
      });
      if (res?.user && res.user.role === "admin") {
        setUser(res.user);
        showToast("تم تسجيل الدخول بنجاح كمدير المنصة.");
        loadAllData();
      } else {
        setAdminLoginError("هذا الحساب ليس لديه صلاحيات الإدارة العليا.");
      }
    } catch (err) {
      setAdminLoginError(err.message || "فشل تسجيل الدخول كمسؤول.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Store Management Handlers
  const handleToggleStoreVisibility = async (store) => {
    setUpdatingId(store.id);
    const nextActive = store.isActive === false;
    const reason = nextActive ? null : "تجميد إداري لعدم سداد العمولات المتأخرة";

    try {
      if (nextActive) {
        await adminService.reactivateStore(store.id);
        showToast(`تم إظهار وتفعيل متجر «${store.name}» بنجاح.`);
      } else {
        await adminService.suspendStore(store.id, { reason });
        showToast(`تم إخفاء وتجميد متجر «${store.name}» لعدم الدفع.`);
      }
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء تحديث حالة المتجر.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStoreOpen = async (store) => {
    setUpdatingId(store.id);
    const nextOpen = !store.isOpen;
    try {
      await adminService.setStoreOpenStatus(store.id, { isOpen: nextOpen });
      showToast(nextOpen ? `تم فتح متجر «${store.name}» للطلب.` : `تم إغلاق متجر «${store.name}» مؤقتاً.`);
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء تعديل حالة استقبال الطلبات.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    const deletedId = storeToDelete.id;
    const deletedName = storeToDelete.name;
    try {
      await adminService.deleteStore(deletedId);
      showToast(`تم حذف متجر «${deletedName}» نهائياً من المنصة.`);
      setStoreToDelete(null);
      setStores((prev) => prev.filter((s) => s.id !== deletedId));
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء حذف المتجر.");
    }
  };

  const handleViewCredentials = (store) => {
    const creds =
      authService.getMerchantCredentials(store.id) ||
      authService.getMerchantCredentials(store.slug) || {
        username: store.slug,
        email: `${store.slug}@otlob.com`,
        password: "password123",
      };
    setViewingCredentialsStore(store);
    setStoreCredentials(creds);
    setCopiedCreds(false);
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreForm.name.trim()) {
      alert("يرجى إدخال اسم المتجر.");
      return;
    }
    try {
      const generatedSlug =
        newStoreForm.slug.trim() ||
        newStoreForm.name
          .toLowerCase()
          .replace(/[^\w\u0621-\u064A]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const username = newStoreForm.username.trim() || generatedSlug;
      const password = newStoreForm.password.trim() || "password123";

      await adminService.createStore({
        ...newStoreForm,
        slug: generatedSlug,
        username,
        password,
      });

      showToast(`تمت إضافة متجر «${newStoreForm.name}» للمنصة وحفظ بيانات دخوله بنجاح.`);
      setIsAddStoreModalOpen(false);
      setNewStoreForm({
        name: "",
        slug: "",
        categoryName: "أكل مصري",
        categorySlug: "egyptian",
        address: "",
        phone: "",
        deliveryFee: 15,
        minOrderAmount: 50,
        commissionRate: 5,
        description: "",
        username: "",
        password: "",
      });
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء إضافة المتجر.");
    }
  };

  // Payment Recording Handlers
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.storeId || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert("يرجى اختيار المتجر وتحديد مبلغ تحصيل صحيح.");
      return;
    }

    const selectedStore = stores.find((s) => s.id === paymentForm.storeId);
    try {
      await adminService.recordPayment({
        storeId: paymentForm.storeId,
        storeName: selectedStore?.name || "متجر",
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes,
        recordedBy: "مدير المنصة (Super Admin)",
      });
      showToast(`تم تسجيل تحصيل مبلغ ${paymentForm.amount} ج.م وخصمها من مديونية المحل.`);
      setIsPaymentModalOpen(false);
      setPaymentForm({
        storeId: "",
        amount: "",
        paymentMethod: "vodafone_cash",
        referenceNumber: "",
        notes: "",
      });
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء تسجيل عملية التحصيل.");
    }
  };

  // Store Application Handlers
  const handleApplicationAction = async (appId, action, reason = "") => {
    try {
      await adminService.updateStoreApplication(appId, action, reason);
      if (action === "approved") {
        showToast("تم اعتماد طلب المتجر وإضافته رسمياً لقائمة المتاجر بالمنصة!");
      } else {
        showToast("تم رفض طلب الانضمام.");
      }
      await loadAllData();
    } catch {
      showToast("حدث خطأ أثناء تحديث حالة الطلب.");
    }
  };

  // Swiper Announcement Handlers
  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    if (!newAdForm.text.trim()) return;
    const added = adminService.addAnnouncement(newAdForm);
    setAnnouncements(adminService.getAnnouncementsList());
    setNewAdForm({
      storeName: stores[0]?.name || "كشري الحاج سيد",
      storeSlug: stores[0]?.slug || "haj-sayed",
      text: "",
      badgeText: "إعلان مميز",
    });
    showToast("تمت إضافة الإعلان للشريط العلوي ونشره بنجاح!");
  };

  const handleToggleAd = (adId) => {
    const updated = adminService.toggleAnnouncement(adId);
    setAnnouncements(updated);
  };

  const handleSaveEditAd = (adId) => {
    if (!editAdForm.text?.trim() && !editAdForm.badgeText?.trim()) return;
    const updated = adminService.updateAnnouncement(adId, editAdForm);
    setAnnouncements(updated);
    setEditingAdId(null);
    showToast("تم تحديث شارة الإعلان ونصه بنجاح!");
  };

  const handleDeleteAd = (adId) => {
    const updated = adminService.deleteAnnouncement(adId);
    setAnnouncements(updated);
    showToast("تم حذف الإعلان من الشريط العلوي.");
  };

  const handleApproveMerchantAd = (reqId) => {
    adminService.approveMerchantAdRequest(reqId);
    setMerchantAdRequests(adminService.getMerchantAdRequests());
    setAnnouncements(adminService.getAnnouncementsList());
    showToast("تم تأكيد استلام الرسوم ونشر إعلان المحل في الشريط العلوي بنجاح!");
  };

  const handleRejectMerchantAd = (reqId) => {
    adminService.rejectMerchantAdRequest(reqId);
    setMerchantAdRequests(adminService.getMerchantAdRequests());
    showToast("تم رفض طلب الإعلان.");
  };

  // Coupons Handlers
  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!newCouponForm.code.trim()) return;
    const computedEndsAt = newCouponForm.durationDays
      ? new Date(Date.now() + Number(newCouponForm.durationDays) * 86400000).toISOString()
      : null;
    adminService.createCoupon({
      ...newCouponForm,
      maxDiscount: newCouponForm.maxDiscount ? Number(newCouponForm.maxDiscount) : null,
      endsAt: computedEndsAt,
    });
    setCoupons(adminService.getCoupons());
    setNewCouponForm({
      code: "",
      storeId: "all",
      storeName: "جميع المتاجر",
      storeSlug: "all",
      discountType: "percentage",
      discountValue: 15,
      minOrderAmount: 100,
      maxDiscount: "",
      durationDays: 30,
    });
    showToast("تم إنشاء وتفعيل كود الخصم الجديد بنجاح!");
  };

  const handleToggleCoupon = (coupId) => {
    const updated = adminService.toggleCoupon(coupId);
    setCoupons(updated);
  };

  const handleDeleteCoupon = (coupId) => {
    const updated = adminService.deleteCoupon(coupId);
    productsService.deleteOffer(coupId).catch(() => {});
    setCoupons(updated);
    showToast("تم حذف كود الخصم.");
  };

  // Reviews Moderation Handlers
  const handleToggleReview = async (review) => {
    const nextHidden = !review.isHidden;
    try {
      await reviewsService.moderateReview(review.id, { isHidden: nextHidden });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, isHidden: nextHidden } : r))
      );
      showToast(nextHidden ? "تم حجب المراجعة عن العامة." : "تم اعتماد ونشر المراجعة.");
    } catch {
      showToast("حدث خطأ أثناء تعديل حالة المراجعة.");
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا التقييم نهائياً؟ سيتم إعادة احتساب تقييم المتجر تلقائياً.")) return;
    try {
      await reviewsService.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("تم حذف التقييم نهائياً وتحديث متوسط تقييم المتجر.");
      adminService.getStores().then((res) => {
        if (Array.isArray(res?.stores)) setStores(res.stores);
      });
    } catch (err) {
      console.error("Delete review error:", err);
      showToast("حدث خطأ أثناء حذف التقييم.");
    }
  };

  // Commission Management Handlers
  const handleApplyGlobalCommission = async () => {
    const rate = Number(globalCommissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showToast("يرجى إدخال نسبة عمولة صالحة بين 0 و 100.");
      return;
    }
    setApplyingGlobalCommission(true);
    try {
      const res = await adminService.applyGlobalCommissionRate(rate, stores);
      setSettings((prev) => ({ ...prev, defaultCommissionRate: rate }));
      const customMap = adminService.getCustomCommissionsMap();
      const updatedStores = stores.map((s) => {
        const isCustom = customMap[s.id] !== undefined || Boolean(s.hasCustomCommission);
        return isCustom ? s : { ...s, commissionRate: rate };
      });
      setStores(updatedStores);
      const fin = await adminService.getFinancialOverview(updatedStores, liveOrders);
      if (fin) setFinancialData(fin);
      showToast(`تم تطبيق العمولة العامة (${rate}%) بنجاح على المتاجر غير المخصصة.`);
    } catch (err) {
      console.error("Error applying global commission:", err);
      showToast("حدث خطأ أثناء تطبيق العمولة العامة.");
    } finally {
      setApplyingGlobalCommission(false);
    }
  };

  const handleSaveStoreCommission = async (storeId) => {
    const draft = storeCommissionDrafts[storeId];
    const rate = Number(draft);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showToast("يرجى إدخال نسبة عمولة صالحة بين 0 و 100.");
      return;
    }
    setSavingStoreCommissionId(storeId);
    const targetStore = stores.find((s) => s.id === storeId);
    try {
      await adminService.setStoreCustomCommission(storeId, rate, targetStore?.slug);
      const updatedStores = stores.map((s) =>
        s.id === storeId ? { ...s, commissionRate: rate, hasCustomCommission: true } : s
      );
      setStores(updatedStores);
      const fin = await adminService.getFinancialOverview(updatedStores, liveOrders);
      if (fin) setFinancialData(fin);
      showToast(`تم حفظ عمولة المحل بنسبة ${rate}% وتعيينها كعمولة مخصصة.`);
    } catch (err) {
      console.error("Error saving store commission:", err);
      showToast("حدث خطأ أثناء حفظ عمولة المحل.");
    } finally {
      setSavingStoreCommissionId(null);
    }
  };

  const handleResetStoreCommission = async (storeId) => {
    const defRate = settings.defaultCommissionRate || 5;
    setSavingStoreCommissionId(storeId);
    const targetStore = stores.find((s) => s.id === storeId);
    try {
      await adminService.resetStoreToDefaultCommission(storeId, defRate, targetStore?.slug);
      const updatedStores = stores.map((s) =>
        s.id === storeId ? { ...s, commissionRate: defRate, hasCustomCommission: false } : s
      );
      setStores(updatedStores);
      setStoreCommissionDrafts((prev) => {
        const copy = { ...prev };
        delete copy[storeId];
        return copy;
      });
      const fin = await adminService.getFinancialOverview(updatedStores, liveOrders);
      if (fin) setFinancialData(fin);
      showToast(`تمت استعادة عمولة المحل للنسبة العامة (${defRate}%).`);
    } catch (err) {
      console.error("Error resetting store commission:", err);
      showToast("حدث خطأ أثناء استعادة العمولة.");
    } finally {
      setSavingStoreCommissionId(null);
    }
  };

  const handleResetAllCustomCommissions = async () => {
    const defRate = settings.defaultCommissionRate || 5;
    const customList = stores.filter((s) => isStoreCustom(s));
    const count = customList.length;
    if (count === 0) {
      showToast("لا توجد محلات مخصص لها عمولة حالياً.");
      return;
    }
    if (
      !confirm(
        `هل أنت متأكد من رغبتك في إرجاع جميع المحلات المخصصة (${count} متجر) إلى العمولة الأساسية للمنصة (${defRate}%)؟`
      )
    ) {
      return;
    }

    setResettingAllCommissions(true);
    try {
      await adminService.resetAllCustomCommissions(defRate, stores);
      const updatedStores = stores.map((s) => ({
        ...s,
        commissionRate: defRate,
        hasCustomCommission: false,
      }));
      setStores(updatedStores);
      setStoreCommissionDrafts({});
      const fin = await adminService.getFinancialOverview(updatedStores, liveOrders);
      if (fin) setFinancialData(fin);
      showToast(`تم بنجاح إرجاع ${count} محلات إلى العمولة الأساسية للمنصة (${defRate}%).`);
    } catch (err) {
      console.error("Error resetting all custom commissions:", err);
      showToast("حدث خطأ أثناء استعادة العمولات.");
    } finally {
      setResettingAllCommissions(false);
    }
  };

  const customCommissionMap = useMemo(() => {
    return adminService.getCustomCommissionsMap();
  }, [stores, settings]);

  const isStoreCustom = (s) => {
    return (
      Boolean(s?.hasCustomCommission) ||
      (s?.id && customCommissionMap[s.id] !== undefined) ||
      (s?.slug && customCommissionMap[s.slug] !== undefined)
    );
  };

  const customStoresCount = useMemo(() => {
    return stores.filter((s) => isStoreCustom(s)).length;
  }, [stores, customCommissionMap]);

  // Filtered stores
  const filteredStores = stores.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.slug && s.slug.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (storeFilter === "active") return s.isActive !== false;
    if (storeFilter === "suspended") return s.isActive === false;
    if (storeFilter === "closed") return s.isOpen === false;
    if (storeFilter === "custom_commission") return isStoreCustom(s);
    return true;
  });

  const pendingAppsCount = applications.filter((a) => a.status === "pending").length;
  const pendingAdReqsCount = merchantAdRequests.filter((r) => r.status === "pending").length;
  const overdueStoresCount = financialData.storeDebts.filter((s) => s.status === "overdue").length;
  const unseenOrdersCount = liveOrders.filter(
    (o) => !seenOrderIds.includes(o.id || o.orderNumber)
  ).length;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const curYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const adminLiveTodayOrders = useMemo(() => {
    return liveOrders.filter((ord) => {
      const d = ord.createdAt || ord.created_at ? new Date(ord.createdAt || ord.created_at) : null;
      return d && d.toISOString().slice(0, 10) === todayStr;
    });
  }, [liveOrders, todayStr]);

  const adminLiveMonthOrders = useMemo(() => {
    return liveOrders.filter((ord) => {
      const d = ord.createdAt || ord.created_at ? new Date(ord.createdAt || ord.created_at) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === curYearMonth;
    });
  }, [liveOrders, curYearMonth]);

  const adminMonthCommission = useMemo(() => {
    return Math.round(
      adminLiveMonthOrders.reduce((sum, ord) => {
        const subtotal = Number(ord.subtotal || ord.originalSubtotal || ord.total || 0);
        const discount = Number(ord.discountAmount || ord.discount || 0);
        const bearer = ord.discountBearer || (ord.couponCode && (ord.couponCode === "OTLOB20" || ord.couponCode === "AHLAN" || ord.couponCode === "FREEDEL" || ord.storeSlug === "all") ? "platform" : "merchant");
        const merchantGross = bearer === "platform" ? subtotal : Math.max(0, subtotal - discount);
        const matchedStore = stores.find((s) => s.id === ord.storeId || s.slug === ord.storeSlug);
        const commRate = Number(ord.commissionRateSnapshot ?? ord.commissionRate ?? matchedStore?.commissionRate ?? settings.defaultCommissionRate ?? 5);
        return sum + Number(ord.platformCommission ?? ((merchantGross * commRate) / 100));
      }, 0)
    );
  }, [adminLiveMonthOrders, stores, settings]);

  const filteredLiveOrders = useMemo(() => {
    const now = new Date();
    return liveOrders.filter((ord) => {
      // 1. Store Filter
      if (selectedOrderStore !== "all") {
        const mId =
          ord.storeId === selectedOrderStore ||
          ord.store?.id === selectedOrderStore ||
          ord.storeSlug === selectedOrderStore;
        if (!mId) return false;
      }

      // 2. Status Filter
      if (orderStatusFilter !== "all" && ord.status !== orderStatusFilter) {
        return false;
      }

      // 3. Time Filter
      const d = ord.createdAt || ord.created_at ? new Date(ord.createdAt || ord.created_at) : null;
      if (orderTimeFilter !== "all" && (!d || Number.isNaN(d.getTime()))) {
        return false;
      }

      if (orderTimeFilter === "today") {
        if (d.toISOString().slice(0, 10) !== todayStr) return false;
      } else if (orderTimeFilter === "week") {
        const diffDays = Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (orderTimeFilter === "month") {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (ym !== curYearMonth) return false;
      }

      // 4. Search Filter
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.trim().toLowerCase();
        const num = String(ord.orderNumber || "").toLowerCase();
        const cName = String(ord.customerName || "").toLowerCase();
        const cPhone = String(ord.customerPhone || "").toLowerCase();
        const sName = String(ord.storeName || ord.store?.name || "").toLowerCase();
        if (!num.includes(q) && !cName.includes(q) && !cPhone.includes(q) && !sName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [liveOrders, selectedOrderStore, orderStatusFilter, orderTimeFilter, orderSearchQuery, todayStr, curYearMonth]);

  // IF NOT SUPER ADMIN -> SHOW SUPER ADMIN LOGIN GATE
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto my-12 px-4 text-right">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-2xl font-black shadow-md mx-auto">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              بوابة دخول الإدارة العليا (Super Admin)
            </h1>
            <p className="text-xs text-gray-500">
              هذه المنطقة مخصصة فقط لمدير منصة أطلب لإدارة المحلات والتحصيلات والتقارير
            </p>
          </div>

          {adminLoginError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0"></i>
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البريد الإلكتروني للإدارة
              </label>
              <input
                type="email"
                name="admin_email"
                autoComplete="off"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdminLogin(e);
                  }
                }}
                dir="ltr"
                placeholder="أدخل البريد الإلكتروني للمسؤول"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                name="admin_password"
                autoComplete="new-password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdminLogin(e);
                  }
                }}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
              />
            </div>

            <button
              type="button"
              onClick={handleAdminLogin}
              disabled={adminLoginLoading}
              className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {adminLoginLoading ? (
                <span>جاري التحقق...</span>
              ) : (
                <>
                  <span>تسجيل الدخول كمدير المنصة</span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navTabs = [
    {
      id: "live_orders",
      label: "بث الطلبات الحية الشامل",
      icon: "fa-satellite-dish",
      badge: unseenOrdersCount > 0 ? `${unseenOrdersCount} غير مقروء` : liveOrders.length,
      badgeColor: unseenOrdersCount > 0 ? "bg-red-500" : "bg-teal-700",
    },
    {
      id: "stores",
      label: "إدارة المتاجر والتحكم",
      icon: "fa-store",
      badge: stores.length,
    },
    {
      id: "curation_categories",
      label: "تخصيص الواجهة والتصنيفات",
      icon: "fa-layer-group",
      badge: `${globalCategories.length} تصنيف`,
      badgeColor: "bg-teal-700",
    },
    {
      id: "collections",
      label: "التحصيلات والمديونيات",
      icon: "fa-money-bill-wave",
      badge: overdueStoresCount > 0 ? `${overdueStoresCount} متأخر` : null,
      badgeColor: "bg-red-500",
    },
    {
      id: "coupons",
      label: "كوبونات الخصم للمتاجر",
      icon: "fa-ticket-simple",
      badge: coupons.length,
    },
    {
      id: "announcement",
      label: "إعلانات الشريط العلوي (Swiper)",
      icon: "fa-bullhorn",
      badge: pendingAdReqsCount > 0 ? `${pendingAdReqsCount} طلب` : announcements.length,
      badgeColor: pendingAdReqsCount > 0 ? "bg-amber-500" : "bg-teal-700",
    },
    {
      id: "profits",
      label: "الأرباح الشهرية للمنصة",
      icon: "fa-chart-line",
    },
    {
      id: "applications",
      label: "طلبات انضمام المتاجر",
      icon: "fa-clipboard-list",
      badge: pendingAppsCount > 0 ? pendingAppsCount : null,
      badgeColor: "bg-amber-500",
    },
    {
      id: "reviews",
      label: "مراقبة التقييمات",
      icon: "fa-star",
      badge: reviews.length,
    },
    {
      id: "settings",
      label: "إعدادات المنصة العامة",
      icon: "fa-sliders",
    },
    {
      id: "admins",
      label: "إدارة وإضافة أدمن",
      icon: "fa-user-plus",
      badge: `${adminsList.length || 1} أدمن`,
      badgeColor: "bg-teal-700",
    },
  ];

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    setAdminFormMsg({ text: "", type: "" });
    try {
      const created = authService.addAdminAccount(newAdminForm);
      setAdminsList(authService.getAdminsList());
      setNewAdminForm({
        fullName: "",
        username: "",
        email: "",
        password: "",
        adminTitle: "مدير عمليات المنصة",
      });
      setAdminFormMsg({
        text: `تمت إضافة حساب الأدمن «${created.fullName}» (اسم المستخدم: ${created.username}) بنجاح! يمكنه الآن تسجيل الدخول للوحة الإدارة.`,
        type: "success",
      });
      showToast(`تمت إضافة الأدمن الجديد «${created.fullName}» بنجاح!`);
    } catch (err) {
      setAdminFormMsg({
        text: err.message || "تعذر إضافة حساب الأدمن.",
        type: "error",
      });
    }
  };

  const handleDeleteAdminAccount = (adminId) => {
    try {
      const updated = authService.removeAdminAccount(adminId);
      setAdminsList(updated);
      showToast("تم حذف حساب الأدمن الفرعي بنجاح.");
    } catch (err) {
      showToast(err.message || "لا يمكن حذف هذا الحساب.");
    }
  };

  const currentAdminTabObj =
    navTabs.find((t) => t.id === activeTab) || navTabs[0];

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-right">
      {/* شريط التنقل العلوي الخاص بلوحة الإدارة العليا فقط (منفصل تماماً عن الموقع العام) */}
      <header className="sticky top-0 z-40 bg-[#0D5C58] text-white shadow-md border-b border-teal-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white text-lg shadow-xs shrink-0">
              <i className="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight">
                  بوابة الإدارة العليا • Super Admin
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-amber-400 text-teal-950 px-2 py-0.5 rounded-full">
                  لوحة التحكم الخاصة
                </span>
              </div>
              <span className="block text-[11px] text-teal-100">
                إدارة المتاجر والتحصيلات والإعلانات والعمولات
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-all flex items-center gap-1.5"
              title="تحديث البيانات"
            >
              <i className="fa-solid fa-arrows-rotate text-xs"></i>
              <span className="hidden md:inline">تحديث البيانات</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs transition-all flex items-center gap-1.5"
              title="تسجيل الخروج من لوحة الإدارة"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* النافذة المنبثقة لاختيار أقسام لوحة الإدارة (القائمة الحالية) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 text-right max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-sm font-black">
                  <i className="fa-solid fa-layer-group"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    قائمة التنقل وأقسام لوحة الإدارة
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    اختر القسم المطلوب للانتقال إليه فوراً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-2">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all text-right border ${
                      isActive
                        ? "bg-[#0D5C58] text-white border-[#0D5C58] shadow-md"
                        : "bg-gray-50/80 text-gray-800 border-gray-200/80 hover:border-[#0D5C58] hover:bg-teal-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white text-[#0D5C58] shadow-2xs"
                        }`}
                      >
                        <i className={`fa-solid ${tab.icon}`}></i>
                      </div>
                      <span>{tab.label}</span>
                    </div>

                    {tab.badge && (
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                          isActive
                            ? "bg-white text-[#0D5C58]"
                            : `${tab.badgeColor || "bg-teal-700"} text-white`
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* زر تسجيل الخروج داخل قائمة التنقل المنبثقة */}
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-black bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-xs">
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </div>
                  <span>تسجيل الخروج من لوحة الإدارة</span>
                </div>
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0D5C58] text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border border-teal-300 animate-in fade-in slide-in-from-top-4 duration-200">
            <i className="fa-solid fa-circle-check text-amber-300 text-sm"></i>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Banner / Welcome Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-xl shadow-md">
              <i className="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-gray-900">
                  لوحة الإدارة والتحكم الشامل (Super Admin)
                </h1>
                <span className="text-[10px] font-bold text-[#0D5C58] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full">
                  إدارة أطلب الرسمية
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                متابعة المحلات، التحصيلات، كوبونات الخصم، وسلايدر الإعلانات العلوية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("admins")}
              className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-black transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-user-plus text-xs text-amber-700"></i>
              <span>إضافة أدمن جديد</span>
            </button>

            <button
              type="button"
              onClick={loadAllData}
              className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
              title="تحديث البيانات"
            >
              <i className="fa-solid fa-arrows-rotate text-[11px]"></i>
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* بطاقة شريط التنقل المخصصة في لوحة الإدارة (خارج الناف بار لخدمة UI/UX وسهولة التنقل) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#0D5C58]/20 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-base font-black shrink-0 shadow-2xs">
              <i className={`fa-solid ${currentAdminTabObj.icon}`}></i>
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-400 block">
                القسم المفتوح حالياً في لوحة الإدارة العليا
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm sm:text-base font-black text-gray-900">
                  {currentAdminTabObj.label}
                </span>
                {currentAdminTabObj.badge && (
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-black text-white ${
                      currentAdminTabObj.badgeColor || "bg-[#0D5C58]"
                    }`}
                  >
                    {currentAdminTabObj.badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2.5"
          >
            <i className="fa-solid fa-layer-group text-xs"></i>
            <span>قائمة التنقل السريع (القائمة الحالية)</span>
            <i className="fa-solid fa-up-right-from-square text-[11px] opacity-80"></i>
          </button>
        </div>

      {/* Main Grid Layout: Desktop Sidebar (1 Col) + Content (3 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-3.5 space-y-1.5 sticky top-20">
          <span className="text-[11px] font-bold text-gray-400 px-3 py-1 block">
            أقسام الإدارة والتحكم
          </span>

          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-right ${
                  isActive
                    ? "bg-[#0D5C58] text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-50 hover:text-[#0D5C58]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon}`}></i>
                  </div>
                  <span>{tab.label}</span>
                </div>

                {tab.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : `${tab.badgeColor || "bg-gray-100"} text-gray-700`
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-700 hover:bg-red-50 transition-all text-right"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-right-from-bracket"></i>
                </div>
                <span>تسجيل الخروج</span>
              </div>
            </button>
          </div>
        </aside>

        {/* Content Area (3 Columns) */}
        <main className="lg:col-span-3 space-y-6">
          {/* ======================================================== */}
          {/* TAB 0: GLOBAL LIVE ORDERS FEED */}
          {/* ======================================================== */}
          {activeTab === "live_orders" && (
            <div className="space-y-6 text-right">
              {/* Header & Controls */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>بث الطلبات الحية الفوري لمنصة أطلب</span>
                      {unseenOrdersCount > 0 && (
                        <span className="text-xs bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                          {unseenOrdersCount} غير مقروء
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      مراقبة حية وتدقيق شامل لكافة الطلبات الواردة لجميع المتاجر في باسوس
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setLiveOrdersLoading(true);
                      try {
                        const res = await ordersService.getOrders({ limit: 100 });
                        const items = Array.isArray(res?.items)
                          ? res.items
                          : Array.isArray(res?.data?.items)
                          ? res.data.items
                          : Array.isArray(res?.orders)
                          ? res.orders
                          : [];
                        setLiveOrders(items);
                        showToast("تم تحديث قائمة الطلبات الحية بنجاح");
                      } finally {
                        setLiveOrdersLoading(false);
                      }
                    }}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-xs ${liveOrdersLoading ? "animate-spin text-[#0D5C58]" : ""}`}></i>
                    <span>تحديث حي</span>
                  </button>
                </div>

                {/* Live Metrics KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 bg-gradient-to-br from-teal-50/70 to-white rounded-2xl border border-teal-100">
                    <span className="text-[11px] font-bold text-teal-800 block">طلبات اليوم</span>
                    <span className="text-xl font-black text-teal-950 mt-0.5 block">
                      {adminLiveTodayOrders.length} طلب
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-500 block">
                      طلبات الشهر الحالي (يوم 1)
                    </span>
                    <span className="text-xl font-black text-gray-900 mt-0.5 block">
                      {adminLiveMonthOrders.length} طلب
                    </span>
                  </div>
                  <div className="p-3.5 bg-gradient-to-br from-amber-50/70 to-white rounded-2xl border border-amber-100">
                    <span className="text-[11px] font-bold text-amber-800 block">أرباح المنصة بالشهر</span>
                    <span className="text-xl font-black text-amber-950 mt-0.5 block">
                      {adminMonthCommission.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-200">
                    <span className="text-[11px] font-bold text-gray-500 block">إجمالي المعروض</span>
                    <span className="text-xl font-black text-[#0D5C58] mt-0.5 block">
                      {filteredLiveOrders.length} طلب
                    </span>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      تصفية حسب المتجر ({stores.length} متجر)
                    </label>
                    <select
                      value={selectedOrderStore}
                      onChange={(e) => setSelectedOrderStore(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      <option value="all">كافة المتاجر ({liveOrders.length} طلب)</option>
                      {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      الفترة الزمنية
                    </label>
                    <select
                      value={orderTimeFilter}
                      onChange={(e) => setOrderTimeFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      <option value="all">كافة الفترات</option>
                      <option value="today">اليوم ({adminLiveTodayOrders.length} طلب)</option>
                      <option value="week">هذا الأسبوع (آخر 7 أيام)</option>
                      <option value="month">الشهر الحالي ({curYearMonth}) - يبدأ من يوم 1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      حالة الطلب
                    </label>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      <option value="all">كافة الحالات</option>
                      <option value="pending">جديد بانتظار التأكيد (pending)</option>
                      <option value="accepted">تم قبوله (accepted)</option>
                      <option value="preparing">جاري التجهيز (preparing)</option>
                      <option value="on_the_way">خرج مع الكابتن (on_the_way)</option>
                      <option value="delivered">تم التسليم (delivered)</option>
                      <option value="cancelled">ملغي (cancelled)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      بحث سريع
                    </label>
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="رقم الطلب، العميل، الهاتف..."
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
                  <span className="text-xs text-gray-500">
                    نتائج التصفية: <strong className="text-gray-900 font-bold">{filteredLiveOrders.length}</strong> من أصل {liveOrders.length} طلب
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = liveOrders.map((o) => o.id || o.orderNumber).filter(Boolean);
                      setSeenOrderIds(allIds);
                      try {
                        localStorage.setItem("otlob_admin_seen_orders", JSON.stringify(allIds));
                      } catch {}
                      showToast("تم تعليم كافة الطلبات كمقروءة");
                    }}
                    className="px-4 py-1.5 text-xs font-bold bg-[#E6F4F1] hover:bg-teal-100 text-[#0D5C58] rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-check-double text-xs"></i>
                    <span>تعليم الكل كمقروء</span>
                  </button>
                </div>
              </div>

              {/* Orders List */}
              {filteredLiveOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-xs">
                  لا توجد طلبات تطابق الفلترة المحددة حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLiveOrders.map((ord) => {
                      const orderKey = ord.id || ord.orderNumber;
                      const isSeen = seenOrderIds.includes(orderKey);
                      return (
                        <div
                          key={orderKey}
                          className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all ${
                            !isSeen
                              ? "bg-amber-50/40 border-amber-300 shadow-sm"
                              : "bg-white border-gray-100 hover:border-gray-200 shadow-2xs"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100/80">
                            <div className="flex items-center gap-2.5">
                              {!isSeen ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] animate-pulse">
                                  جديد
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold text-[10px]">
                                  مقروء
                                </span>
                              )}
                              <span className="font-black text-sm text-gray-900">
                                طلب #{ord.orderNumber}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({new Date(ord.createdAt || Date.now()).toLocaleTimeString("ar-EG")})
                              </span>
                              <button
                                type="button"
                                onClick={() => openStoreDrillDown(ord)}
                                className="text-xs font-black text-[#0D5C58] bg-[#E6F4F1] hover:bg-teal-100 px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="اضغط لفتح ملف وتفاصيل المتجر الكاملة"
                              >
                                <i className="fa-solid fa-store text-[10px]"></i>
                                <span>{ord.storeName || ord.store?.name || "متجر معتمد"}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                                ord.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : ord.status === "on_the_way"
                                  ? "bg-teal-50 text-[#0D5C58] border border-teal-200"
                                  : ord.status === "preparing"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}>
                                {ord.status === "pending" && "جديد قيد الانتظار"}
                                {ord.status === "accepted" && "تم القبول"}
                                {ord.status === "preparing" && "جاري التجهيز"}
                                {ord.status === "on_the_way" && "خرج مع الكابتن"}
                                {ord.status === "delivered" && "تم التسليم"}
                                {ord.status === "cancelled" && "ملغي"}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleOrderSeen(orderKey)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                  isSeen
                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                }`}
                                title={isSeen ? "تعيين كغير مقروء" : "تعيين كمقروء"}
                              >
                                <i className={`fa-solid ${isSeen ? "fa-envelope-open" : "fa-check"}`}></i>
                                <span>{isSeen ? "تحديد كغير مقروء" : "تم الاطلاع"}</span>
                              </button>
                            </div>
                          </div>

                          {/* Customer & Items Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs">
                            <div className="space-y-1 text-gray-600">
                              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-user text-gray-400 text-[10px]"></i>
                                <span>العميل: {ord.customerName}</span>
                                <span className="text-gray-400">•</span>
                                <span dir="ltr">{ord.customerPhone}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <i className="fa-solid fa-location-dot text-gray-400 text-[10px]"></i>
                                <span>العنوان: {ord.deliveryAddress || "باسوس"}</span>
                              </div>
                              {ord.notes && (
                                <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-100 mt-1">
                                  ملاحظة العميل: {ord.notes}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                              <div className="font-bold text-gray-700 flex items-center justify-between pb-1 border-b border-gray-200/60">
                                <span>أصناف الطلب:</span>
                                <span className="font-black text-[#0D5C58]">
                                  الإجمالي: {ord.total} ج.م
                                </span>
                              </div>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {Array.isArray(ord.items) && ord.items.map((it, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-800">
                                      {it.quantity}x {it.name || it.productName}
                                      {it.size?.name ? ` (${it.size.name})` : ""}
                                    </span>
                                    <span className="font-mono text-gray-500">
                                      {it.subtotal || it.price} ج.م
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Order Store Action Footer */}
                          <div className="pt-3 mt-1 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => openStoreDrillDown(ord)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <i className="fa-solid fa-store text-xs"></i>
                              <span>عرض ملف وتفاصيل المتجر الكاملة والطلبات</span>
                              <i className="fa-solid fa-arrow-left text-[10px]"></i>
                            </button>
                            <span className="text-[11px] text-gray-400">
                              انقر لمعاينة هاتف وموقع وسجل طلبات هذا المتجر
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: STORES MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === "stores" && (
            <div className="space-y-6">
              {/* Stores Top Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs text-right">
                  <span className="text-[11px] text-gray-500 font-bold block">إجمالي المتاجر</span>
                  <span className="text-xl font-black text-gray-900 mt-1 block">
                    {stores.length}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs text-right">
                  <span className="text-[11px] text-gray-500 font-bold block">ظاهرة ومعتمدة</span>
                  <span className="text-xl font-black text-emerald-700 mt-1 block">
                    {stores.filter((s) => s.isActive !== false).length}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs text-right">
                  <span className="text-[11px] text-gray-500 font-bold block">مخفية لعدم الدفع</span>
                  <span className="text-xl font-black text-red-600 mt-1 block">
                    {stores.filter((s) => s.isActive === false).length}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs text-right">
                  <span className="text-[11px] text-gray-500 font-bold block">مغلقة مؤقتاً</span>
                  <span className="text-xl font-black text-gray-600 mt-1 block">
                    {stores.filter((s) => s.isOpen === false).length}
                  </span>
                </div>
              </div>

              {/* Stores Controls Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-sm font-black text-gray-900">
                      قائمة المتاجر المسجلة في الموقع وقاعدة البيانات
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      التحكم الكامل في ظهور المتاجر، تجميد المحلات لعدم الدفع، أو حذفها نهائياً
                    </p>
                  </div>

                  {/* Add Store Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddStoreModalOpen(true)}
                    className="px-4 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>إضافة متجر جديد للمنصة</span>
                  </button>
                </div>

                {/* Global Commission Control Panel */}
                <div className="p-4 rounded-2xl bg-linear-to-l from-[#E6F4F1] to-emerald-50 border border-teal-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D5C58]"></span>
                      <h3 className="font-black text-xs sm:text-sm text-gray-900">
                        التحكم في العمولة العامة للمنصة
                      </h3>
                      <span className="text-[10px] bg-[#0D5C58] text-white px-2 py-0.5 rounded-full font-bold">
                        النسبة الحالية: {settings.defaultCommissionRate || 5}%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      حدد النسبة الافتراضية لجميع المحلات. لن تتأثر أي محلات تم تخصيص نسبة خاصة لها من الداخل.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center bg-white border border-teal-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={globalCommissionInput}
                        onChange={(e) => setGlobalCommissionInput(e.target.value)}
                        className="w-14 text-center font-black text-xs text-gray-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-gray-500">%</span>
                    </div>

                    <button
                      type="button"
                      disabled={applyingGlobalCommission}
                      onClick={handleApplyGlobalCommission}
                      className="px-4 py-2 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {applyingGlobalCommission ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                          <span>جاري التطبيق...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check-double text-xs"></i>
                          <span>تطبيق على المحلات غير المخصصة</span>
                        </>
                      )}
                    </button>

                    {customStoresCount > 0 && (
                      <button
                        type="button"
                        disabled={resettingAllCommissions}
                        onClick={handleResetAllCustomCommissions}
                        className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        title="إرجاع كافة المحلات المخصصة للنسبة الأساسية"
                      >
                        {resettingAllCommissions ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs text-amber-800"></i>
                        ) : (
                          <i className="fa-solid fa-rotate-left text-xs text-amber-800"></i>
                        )}
                        <span>إرجاع المخصصة ({customStoresCount}) للعامة</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث باسم المتجر أو الرابط..."
                      className="w-full pr-9 pl-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                    {[
                      { id: "all", label: "الكل" },
                      {
                        id: "custom_commission",
                        label: `عمولة مخصصة (${customStoresCount})`,
                        isCustomTab: true,
                      },
                      { id: "active", label: "النشطة" },
                      { id: "suspended", label: "المخفية لعدم الدفع" },
                      { id: "closed", label: "المغلقة" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStoreFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          storeFilter === f.id
                            ? f.isCustomTab
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-[#0D5C58] text-white shadow-xs"
                            : f.isCustomTab && customStoresCount > 0
                            ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f.isCustomTab && <i className="fa-solid fa-star text-[10px]"></i>}
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner when viewing Custom Commission Filter */}
                {storeFilter === "custom_commission" && (
                  <div className="p-3.5 bg-linear-to-l from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center text-sm font-black shrink-0">
                        <i className="fa-solid fa-filter"></i>
                      </div>
                      <div>
                        <span className="font-black text-amber-950 block">
                          تصفية المحلات المخصصة فقط ({filteredStores.length} متجر)
                        </span>
                        <span className="text-[11px] text-amber-800/80 block mt-0.5">
                          هذه المتاجر تم تحديد نسبة عمولة استثنائية لها تختلف عن النسبة العامة للمنصة ({settings.defaultCommissionRate || 5}%)
                        </span>
                      </div>
                    </div>
                    {filteredStores.length > 0 && (
                      <button
                        type="button"
                        disabled={resettingAllCommissions}
                        onClick={handleResetAllCustomCommissions}
                        className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {resettingAllCommissions ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        ) : (
                          <i className="fa-solid fa-rotate-left text-xs"></i>
                        )}
                        <span>إرجاع الكل للعمولة الأساسية ({settings.defaultCommissionRate || 5}%)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Stores List */}
                {loading ? (
                  <div className="py-12 text-center text-xs font-bold text-[#0D5C58]">
                    <i className="fa-solid fa-spinner fa-spin text-base block mb-2"></i>
                    جاري تحميل بيانات المتاجر...
                  </div>
                ) : filteredStores.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                    <i className="fa-solid fa-store-slash text-2xl block text-gray-300"></i>
                    <span>لا توجد متاجر مطابقة لبحثك.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredStores.map((s) => (
                      <div
                        key={s.id}
                        className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 p-3 rounded-2xl transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={s.logoUrl || s.bannerUrl || "/placeholder-dish.jpg"}
                            alt={s.name}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 mt-0.5"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&auto=format&fit=crop&q=80";
                            }}
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-gray-900">{s.name}</h3>
                              <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                /{s.slug}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  s.hasCustomCommission
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-[#E6F4F1] text-[#0D5C58]"
                                }`}
                              >
                                {s.hasCustomCommission && <i className="fa-solid fa-star text-[9px] text-amber-600"></i>}
                                <span>عمولة {s.commissionRate || 5}%</span>
                                <span className="text-[9px] opacity-75">
                                  ({s.hasCustomCommission ? "مخصصة للمحل" : "عامة"})
                                </span>
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-1">
                              {s.description || s.address || "كفر الندى"}
                            </p>

                            {/* Status badges */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.isActive !== false
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                              >
                                <i
                                  className={`fa-solid ${
                                    s.isActive !== false ? "fa-circle-check" : "fa-eye-slash"
                                  } text-[9px]`}
                                ></i>
                                <span>
                                  {s.isActive !== false ? "ظاهر بالموقع" : "مخفي لعدم الدفع"}
                                </span>
                              </span>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.isOpen !== false
                                    ? "bg-teal-50 text-[#0D5C58]"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    s.isOpen !== false ? "bg-emerald-500" : "bg-gray-400"
                                  }`}
                                ></span>
                                <span>{s.isOpen !== false ? "مفتوح للطلب" : "مغلق مؤقتاً"}</span>
                              </span>

                              {s.suspensionReason && s.isActive === false && (
                                <span className="text-[10px] text-red-600 font-medium">
                                  سبب التجميد: {s.suspensionReason}
                                </span>
                              )}
                            </div>

                            {/* Individual Commission Inline Editor */}
                            <div className="flex items-center gap-2 pt-2 pb-1 flex-wrap">
                              <span className="text-[11px] font-bold text-gray-700">تعديل عمولة المتجر:</span>
                              <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-0.5 shadow-2xs">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={storeCommissionDrafts[s.id] !== undefined ? storeCommissionDrafts[s.id] : (s.commissionRate || 5)}
                                  onChange={(e) => setStoreCommissionDrafts({ ...storeCommissionDrafts, [s.id]: e.target.value })}
                                  className="w-12 text-center text-xs font-bold text-gray-900 bg-transparent focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-gray-500">%</span>
                              </div>

                              <button
                                type="button"
                                disabled={savingStoreCommissionId === s.id}
                                onClick={() => handleSaveStoreCommission(s.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                              >
                                {savingStoreCommissionId === s.id ? (
                                  <i className="fa-solid fa-spinner fa-spin text-[9px]"></i>
                                ) : (
                                  <i className="fa-solid fa-floppy-disk text-[9px]"></i>
                                )}
                                <span>حفظ العمولة</span>
                              </button>

                              {s.hasCustomCommission && (
                                <button
                                  type="button"
                                  disabled={savingStoreCommissionId === s.id}
                                  onClick={() => handleResetStoreCommission(s.id)}
                                  className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold transition-all"
                                  title="إلغاء التخصيص واستعادة العمولة العامة للمنصة"
                                >
                                  <span>استعادة للعامة</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Order Store Action Footer */}
                          <div className="pt-3 mt-1 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setDrillDownStore(s)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <i className="fa-solid fa-store text-xs"></i>
                              <span>عرض ملف وتفاصيل المتجر الكاملة والطلبات</span>
                              <i className="fa-solid fa-arrow-left text-[10px]"></i>
                            </button>
                            <span className="text-[11px] text-gray-400">
                              انقر لمعاينة هاتف وموقع وسجل طلبات هذا المتجر
                            </span>
                          </div>
                        </div>

                        {/* Dedicated Action Buttons for this Store */}
                        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                          {/* Store Credentials Button */}
                          <button
                            type="button"
                            onClick={() => handleViewCredentials(s)}
                            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all flex items-center gap-1.5"
                            title="عرض ونسخ بيانات دخول التاجر"
                          >
                            <i className="fa-solid fa-key text-xs text-amber-700"></i>
                            <span>بيانات الدخول</span>
                          </button>

                          {/* Visibility Toggle Button */}
                          <button
                            type="button"
                            disabled={updatingId === s.id}
                            onClick={() => handleToggleStoreVisibility(s)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${
                              s.isActive !== false
                                ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            <i
                              className={`fa-solid ${
                                s.isActive !== false ? "fa-ban" : "fa-eye"
                              } text-xs`}
                            ></i>
                            <span>
                              {updatingId === s.id
                                ? "جاري..."
                                : s.isActive !== false
                                ? "إخفاء لعدم الدفع"
                                : "إظهار وتفعيل"}
                            </span>
                          </button>

                          {/* Open/Close Toggle Button */}
                          <button
                            type="button"
                            disabled={updatingId === s.id}
                            onClick={() => handleToggleStoreOpen(s)}
                            className="px-3 py-1.5 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all flex items-center gap-1.5"
                          >
                            <i
                              className={`fa-solid ${
                                s.isOpen !== false ? "fa-door-closed" : "fa-door-open"
                              } text-xs`}
                            ></i>
                            <span>{s.isOpen !== false ? "إغلاق مؤقت" : "فتح الطلب"}</span>
                          </button>

                          {/* Delete Store Button */}
                          <button
                            type="button"
                            onClick={() => setStoreToDelete(s)}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف المتجر نهائياً"
                          >
                            <i className="fa-regular fa-trash-can text-sm"></i>
                          </button>

                          {/* Direct Preview Link */}
                          <Link
                            href={`/stores/${s.slug}`}
                            target="_blank"
                            className="p-2 rounded-xl text-teal-800 hover:bg-teal-50 transition-colors"
                            title="معاينة صفحة المتجر"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1.5: HOMEPAGE CURATION & GLOBAL CATEGORIES */}
          {/* ======================================================== */}
          {activeTab === "curation_categories" && (
            <div className="space-y-6 text-right">
              {/* Curation Section 1: Global Categories Management */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-shapes text-[#0D5C58]"></i>
                      <span>إدارة التصنيفات العالمية للمنصة (Global Categories)</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      تفعيل أو تعطيل الأقسام الرئيسية. تعطيل أي قسم يخفيه من الواجهة ويمنع تسجيل المتاجر الجديدة تحته، ويمكنك إضافة تصنيفات جديدة لتوسيع المنصة في أي وقت.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold text-[#0D5C58] bg-[#E6F4F1] px-3 py-1 rounded-full">
                      {globalCategories.length} تصنيف متاح
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddCatModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <i className="fa-solid fa-plus text-xs"></i>
                      <span>إضافة تصنيف جديد</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {globalCategories.map((cat) => {
                    const isCatActive = cat.isActive !== false;
                    return (
                      <div
                        key={cat.id || cat.slug}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCatActive
                            ? "bg-white border-gray-100 hover:border-[#0D5C58]/30 shadow-2xs"
                            : "bg-gray-50 border-gray-200/80 opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                            isCatActive ? "bg-[#E6F4F1] text-[#0D5C58]" : "bg-gray-200 text-gray-500"
                          }`}>
                            <i className="fa-solid fa-utensils"></i>
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-gray-900 block truncate">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              {cat.slug}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat.id, isCatActive)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                            isCatActive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          }`}
                        >
                          <i className={`fa-solid ${isCatActive ? "fa-check" : "fa-ban"} text-[10px]`}></i>
                          <span>{isCatActive ? "نشط ومتاح" : "معطل ومخفي"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Curation Section 2: Pinned & Featured Stores */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-thumbtack text-amber-500"></i>
                      <span>تثبيت محلات الوصول السريع بالصفحة الرئيسية (Quick Access / Pinned Stores)</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      تحديد المتاجر التي تظهر في قسم الوصول السريع المميز أعلى الصفحة الرئيسية بالترتيب الذي ترغبه
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    {(homepageConfig?.featuredStores?.selectedStoreIds || homepageConfig?.featuredStores?.storeIds || []).length} متجر مثبت بالرئيسية
                  </span>
                </div>

                {/* Filter / Search Bar */}
                <div className="max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      value={storeSearchPin}
                      onChange={(e) => setStoreSearchPin(e.target.value)}
                      placeholder="ابحث عن متجر لتثبيته في الوصول السريع..."
                      className="w-full px-4 py-2 pr-9 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                    <i className="fa-solid fa-magnifying-glass absolute right-3 top-3 text-gray-400 text-xs"></i>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {stores
                    .filter((st) => !storeSearchPin.trim() || st.name.toLowerCase().includes(storeSearchPin.trim().toLowerCase()))
                    .map((st) => {
                      const currentPinnedList =
                        homepageConfig?.featuredStores?.selectedStoreIds ||
                        homepageConfig?.featuredStores?.storeIds ||
                        [];
                      const isPinned = currentPinnedList.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isPinned
                              ? "bg-amber-50/50 border-amber-300 shadow-xs"
                              : "bg-white border-gray-100 hover:border-gray-200 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                              isPinned ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                            }`}>
                              <i className="fa-solid fa-store"></i>
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-gray-900 block truncate">
                                {st.name}
                              </span>
                              <span className="text-[10px] text-gray-400 block">
                                {st.address || "باسوس"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleStorePinned(st.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                              isPinned
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                          >
                            <i className="fa-solid fa-thumbtack text-[10px]"></i>
                            <span>{isPinned ? "مثبت بالرئيسية" : "تثبيت بالواجهة"}</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Curation Section 3: Promotional Offers Slider Control */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="space-y-1">
                    <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-gift text-[#0D5C58]"></i>
                      <span>التحكم في سلايدر وبانر العروض الترويجية بالصفحة الرئيسية</span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      تعديل نص العرض، وكوبون الخصم، وتحديد المتجر المرتبط بالعرض المعروض في منتصف الرئيسية فوراً
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !offerBannerForm.enabled;
                      setOfferBannerForm({ ...offerBannerForm, enabled: nextEnabled });
                      handleSaveOfferBanner({ ...offerBannerForm, enabled: nextEnabled });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto ${
                      offerBannerForm.enabled
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>
                      {offerBannerForm.enabled
                        ? "السلايدر معروض بالرئيسية"
                        : "السلايدر مخفي حالياً"}
                    </span>
                  </button>
                </div>

                {/* Offer Banner Edit Form */}
                <form onSubmit={handleSaveOfferBanner} className="space-y-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        عنوان العرض الرئيسي
                      </label>
                      <input
                        type="text"
                        required
                        value={offerBannerForm.title}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, title: e.target.value })}
                        placeholder="مثال: ملوخية بالفراخ بـ 70 ج.م فقط أو خصم 20 ج.م"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        نص الشارة العلوية (Badge)
                      </label>
                      <input
                        type="text"
                        value={offerBannerForm.badgeText}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, badgeText: e.target.value })}
                        placeholder="مثال: عرض اليوم، عرض الجمعة"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      تفاصيل ووصف العرض بالرئيسية
                    </label>
                    <input
                      type="text"
                      required
                      value={offerBannerForm.subtitle}
                      onChange={(e) => setOfferBannerForm({ ...offerBannerForm, subtitle: e.target.value })}
                      placeholder="مثال: اطلب الآن واستخدم كود «NADA20» للطلبات فوق 200 ج.م"
                      className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        المتجر المرتبط بالعرض
                      </label>
                      <select
                        value={offerBannerForm.storeId}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, storeId: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="all">كافة المتاجر (عرض عام للمنصة)</option>
                        {stores.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        نطاق تطبيق العرض
                      </label>
                      <select
                        value={offerBannerForm.appliesTo || "order_total"}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, appliesTo: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="order_total">برومو كود على توتال المبلغ (إجمالي الطلب)</option>
                        <option value="menu_items">عرض منيو على الأصناف (يظهر على الصنف)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        كود الكوبون / البرومو كود
                      </label>
                      <input
                        type="text"
                        value={offerBannerForm.couponCode}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, couponCode: e.target.value.toUpperCase() })}
                        placeholder="مثال: NADA20"
                        className="w-full px-4 py-2.5 text-xs font-mono font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        نوع الخصم
                      </label>
                      <select
                        value={offerBannerForm.discountType || "percentage"}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, discountType: e.target.value })}
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت (ج.م)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        قيمة الخصم {offerBannerForm.discountType === "percentage" ? "(%)" : "(ج.م)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={offerBannerForm.discountValue}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, discountValue: Number(e.target.value) })}
                        placeholder="مثال: 20"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        الحد الأدنى للطلب لتفعيل الخصم (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={offerBannerForm.minOrderAmount || 0}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, minOrderAmount: Number(e.target.value) })}
                        placeholder="مثال: 200 (الطلب لازم يوصل للمبلغ دا)"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        أقصى سعر يطبق عليه الخصم / سقف الخصم (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={offerBannerForm.maxDiscount ?? ""}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, maxDiscount: e.target.value ? Number(e.target.value) : null })}
                        placeholder="مثال: 50 (سقف الخصم)"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        مدة العرض بالأيام (تلقائي)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={offerBannerForm.durationDays || 7}
                        onChange={(e) => {
                          const days = Number(e.target.value) || 1;
                          const nextEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
                          setOfferBannerForm({ ...offerBannerForm, durationDays: days, endsAt: nextEndsAt });
                        }}
                        placeholder="مثال: 7 أيام"
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        موعد انتهاء العرض والعداد التنازلي
                      </label>
                      <input
                        type="datetime-local"
                        value={offerBannerForm.endsAt ? offerBannerForm.endsAt.slice(0, 16) : ""}
                        onChange={(e) => setOfferBannerForm({ ...offerBannerForm, endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                        className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm"
                    >
                      <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                      <span>حفظ ونشر العرض فوراً في الصفحة الرئيسية</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: COLLECTIONS & DEBT (التحصيلات والمديونيات) */}
          {/* ======================================================== */}
          {activeTab === "collections" && (
            <div className="space-y-6 text-right">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[11px] text-gray-500 font-bold block">إجمالي المديونيات المستحقة</span>
                  <span className="text-xl font-black text-red-600 mt-1 block">
                    {(financialData?.totalDebts || 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[11px] text-gray-500 font-bold block">المحصل فعلياً</span>
                  <span className="text-xl font-black text-emerald-700 mt-1 block">
                    {(financialData?.totalCollected || 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[11px] text-gray-500 font-bold block">إجمالي مبيعات المتاجر</span>
                  <span className="text-xl font-black text-gray-900 mt-1 block">
                    {(financialData?.totalSales || 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[11px] text-gray-500 font-bold block">أرباح عمولات المنصة</span>
                  <span className="text-xl font-black text-[#0D5C58] mt-1 block">
                    {(financialData?.totalCommissionEarned || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Stores Debt Breakdown */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-sm font-black text-gray-900">
                      كشف مديونيات وعمولات كل محل
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      متابعة نسبة التحصيل من كل متجر، مع إمكانية تجميد المتجر فوراً عند تجاوز فترة السماح
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (stores.length > 0) {
                        setPaymentForm((prev) => ({ ...prev, storeId: stores[0].id }));
                      }
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
                  >
                    <i className="fa-solid fa-receipt text-xs"></i>
                    <span>تسجيل دفعة تحصيل جديدة</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 font-bold">
                        <th className="pb-3 pr-2">اسم المتجر</th>
                        <th className="pb-3 px-2">إجمالي المبيعات</th>
                        <th className="pb-3 px-2">نسبة العمولة</th>
                        <th className="pb-3 px-2">المستحق للمنصة</th>
                        <th className="pb-3 px-2">المسدد</th>
                        <th className="pb-3 px-2">المتبقي (المديونية)</th>
                        <th className="pb-3 px-2">الحالة</th>
                        <th className="pb-3 pl-2">إجراء التحصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {financialData.storeDebts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-bold text-gray-900">
                            <div>{item.name}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-gray-400 font-mono">/{item.slug}</span>
                              <span className="text-[10px] text-teal-700 font-bold">
                                صافي للمحل: {(item.netEarnings || 0).toLocaleString()} ج.م
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 font-bold text-gray-800">
                            <div>{(item.grossSales || 0).toLocaleString()} ج.م</div>
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({item.ordersCount || 0} طلب)
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-gray-600 font-bold">
                            <div className="flex items-center gap-1">
                              <span>{item.commissionRate}%</span>
                              {item.hasCustomCommission && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded-sm font-normal">
                                  مخصصة
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 font-black text-gray-900">
                            {(item.commissionTotal || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3.5 px-2 font-bold text-emerald-700">
                            {(item.paidAmount || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`font-black ${
                                item.remainingDebt > 0 ? "text-red-600" : "text-emerald-700"
                              }`}
                            >
                              {(item.remainingDebt || 0).toLocaleString()} ج.م
                            </span>
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === "paid"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : item.status === "overdue"
                                  ? "bg-red-50 text-red-800"
                                  : "bg-amber-50 text-amber-800"
                              }`}
                            >
                              {item.status === "paid"
                                ? "مسدد بالكامل"
                                : item.status === "overdue"
                                ? "متأخر عن السداد"
                                : "مستحق جزئياً"}
                            </span>
                          </td>
                          <td className="py-3.5 pl-2">
                            {item.remainingDebt > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentForm({
                                    storeId: item.id,
                                    amount: item.remainingDebt,
                                    paymentMethod: "vodafone_cash",
                                    referenceNumber: "",
                                    notes: "",
                                  });
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0D5C58] font-bold text-[11px] transition-colors"
                              >
                                تحصيل
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-bold">خالص</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: COUPONS MANAGEMENT (كوبونات الخصم للمتاجر) */}
          {/* ======================================================== */}
          {activeTab === "coupons" && (
            <div className="space-y-6 text-right">
              {/* Add New Coupon Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-ticket-simple text-[#0D5C58]"></i>
                    <span>إنشاء كود خصم جديد لمتجر معين أو المنصة بالكامل</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    حدد المحل المستهدف ونسبة الخصم التي ستُطبق تلقائياً على وجباته وأسعاره عند طلب العميل
                  </p>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        كود الخصم (Coupon Code) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newCouponForm.code}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, code: e.target.value.toUpperCase() })
                        }
                        placeholder="مثال: SEAFOOD20"
                        dir="ltr"
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] font-mono text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        المتجر المطبق عليه الخصم <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newCouponForm.storeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "all") {
                            setNewCouponForm({
                              ...newCouponForm,
                              storeId: "all",
                              storeName: "جميع المتاجر",
                              storeSlug: "all",
                            });
                          } else {
                            const found = stores.find((s) => s.id === val);
                            setNewCouponForm({
                              ...newCouponForm,
                              storeId: found?.id || val,
                              storeName: found?.name || "متجر",
                              storeSlug: found?.slug || "",
                            });
                          }
                        }}
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="all">ساري على جميع المتاجر</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            مخصص لـ: {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        نوع الخصم
                      </label>
                      <select
                        value={newCouponForm.discountType}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, discountType: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ مالي ثابت (ج.م)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        قيمة الخصم ({newCouponForm.discountType === "percentage" ? "%" : "ج.م"})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newCouponForm.discountValue}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, discountValue: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        الحد الأدنى لقيمة الطلب (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newCouponForm.minOrderAmount}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, minOrderAmount: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        الحد الأقصى للخصم (ج.م) <span className="text-gray-400 font-normal">(كاب للخصم)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="مثال: 50 ج.م كحد أقصى"
                        value={newCouponForm.maxDiscount}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, maxDiscount: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        مدة الصلاحية
                      </label>
                      <select
                        value={newCouponForm.durationDays}
                        onChange={(e) =>
                          setNewCouponForm({ ...newCouponForm, durationDays: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <option value={7}>أسبوع واحد (7 أيام)</option>
                        <option value={14}>أسبوعين (14 يوم)</option>
                        <option value={30}>شهر (30 يوم)</option>
                        <option value={60}>شهرين (60 يوم)</option>
                        <option value={90}>3 شهور (90 يوم)</option>
                        <option value={365}>سنة كاملة</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-plus text-xs"></i>
                        <span>إنشاء وتفعيل الكوبون</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Coupons List Table */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-black text-gray-900">سجل الكوبونات النشطة والمعتمدة:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 font-bold">
                        <th className="pb-3 pr-2">كود الكوبون</th>
                        <th className="pb-3 px-2">المتجر المطبق عليه</th>
                        <th className="pb-3 px-2">قيمة الخصم</th>
                        <th className="pb-3 px-2">الحد الأدنى</th>
                        <th className="pb-3 px-2">الحد الأقصى (كاب)</th>
                        <th className="pb-3 px-2">مرات الاستخدام</th>
                        <th className="pb-3 px-2">الحالة</th>
                        <th className="pb-3 pl-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coupons.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-mono font-black text-[#0D5C58]">
                            {c.code}
                          </td>
                          <td className="py-3.5 px-2 font-bold text-gray-900">
                            {c.storeName || "جميع المتاجر"}
                          </td>
                          <td className="py-3.5 px-2 font-black text-gray-800">
                            {c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue} ج.م`}
                          </td>
                          <td className="py-3.5 px-2 text-gray-600">
                            {c.minOrderAmount ? `${c.minOrderAmount} ج.م` : "بدون حد أدنى"}
                          </td>
                          <td className="py-3.5 px-2 text-gray-600">
                            {c.maxDiscount ? `${c.maxDiscount} ج.م` : "—"}
                          </td>
                          <td className="py-3.5 px-2 font-bold text-gray-700">
                            {c.usageCount || 0} مرة
                          </td>
                          <td className="py-3.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.active !== false
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {c.active !== false ? "مفعل وشغال" : "معطل"}
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(c.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              {c.active !== false ? "تعطيل" : "تفعيل"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600"
                              title="حذف الكوبون"
                            >
                              <i className="fa-regular fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SWIPER ANNOUNCEMENTS & MERCHANT AD REQUESTS */}
          {/* ======================================================== */}
          {activeTab === "announcement" && (
            <div className="space-y-6 text-right">
              {/* Section 1: Pending Merchant Ad Requests (موافقة الأدمن بعد الدفع) */}
              <div className="bg-white rounded-3xl border-2 border-amber-300/80 shadow-md p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs">
                      <i className="fa-solid fa-hand-holding-dollar"></i>
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-gray-900">
                        طلبات الإعلانات الواردة من المحلات (بانتظار سداد الرسوم وموافقتك)
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        أي إعلان يطلبه المحل يظهر هنا ولا يُنشر في الشريط العلوي إلا بعد استلام الرسوم وموافقتك
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                    {merchantAdRequests.filter((r) => r.status === "pending").length} طلب جديد
                  </span>
                </div>

                {merchantAdRequests.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    لا توجد طلبات إعلانات واردة حالياً من المحلات.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {merchantAdRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">{req.storeName}</span>
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                              {req.badgeText || "إعلان مميز"}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              رسوم الإعلان: {req.feeAmount || 200} ج.م
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium">«{req.text}»</p>
                          <span className="text-[10px] text-gray-400 block">
                            تاريخ تقديم الطلب: {req.submittedAt || "اليوم"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {req.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveMerchantAd(req.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-check text-xs"></i>
                                <span>تأكيد استلام الرسوم ونشر الإعلان فوراً</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectMerchantAd(req.id)}
                                className="px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs"
                              >
                                رفض
                              </button>
                            </>
                          ) : req.status === "approved" ? (
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                              <i className="fa-solid fa-circle-check"></i>
                              <span>معتمد ومنشور في السلايدر العلوي</span>
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-red-800 bg-red-100 px-3 py-1.5 rounded-xl">
                              تم رفض الإعلان
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Active Swiper Announcements & Add New */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-6">
                <div>
                  <h2 className="text-sm font-black text-gray-900">
                    شريط السلايدر العلوي (Swiper Banners) للموقع
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    الإعلانات المعروضة حالياً أعلى الموقع وتدور بنظام سلايدر متحرك تلقائياً كل 4.5 ثانية
                  </p>
                </div>

                {/* Live Swiper Preview */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 block">معاينة شكل الإعلانات كما تظهر للزوار:</span>
                  <div className="space-y-1.5">
                    {announcements.filter((a) => a.active).map((ad, idx) => (
                      <div
                        key={ad.id}
                        className="bg-[#0D5C58] text-white text-xs py-2 px-4 rounded-xl flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-400 text-teal-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {ad.badgeText || "إعلان مميز"}
                          </span>
                          <span>{ad.text}</span>
                        </div>
                        <span className="text-amber-300 underline font-bold text-[11px]">
                          {ad.storeName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Direct Announcement Form */}
                <form onSubmit={handleAddAnnouncement} className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <span className="text-xs font-black text-gray-900 block">إضافة إعلان جديد من الأدمن مباشرة:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        شارة الإعلان (Badge)
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdForm.badgeText}
                        onChange={(e) => setNewAdForm({ ...newAdForm, badgeText: e.target.value })}
                        placeholder="مثال: إعلان مميز"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {["إعلان مميز", "عرض حصري", "خصم اليوم", "طازة وسخن", "وفر الآن"].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setNewAdForm({ ...newAdForm, badgeText: b })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-[#0D5C58] text-gray-600 hover:text-[#0D5C58] transition-all"
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        نص الإعلان الترويجي
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdForm.text}
                        onChange={(e) => setNewAdForm({ ...newAdForm, text: e.target.value })}
                        placeholder="مثال: خصم 20% بكود «ندى20» على جميع الوجبات اليوم!"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        المحل المستهدف
                      </label>
                      <select
                        value={newAdForm.storeSlug}
                        onChange={(e) => {
                          const found = stores.find((s) => s.slug === e.target.value);
                          setNewAdForm({
                            ...newAdForm,
                            storeSlug: e.target.value,
                            storeName: found?.name || "متجر",
                          });
                        }}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl"
                      >
                        {stores.map((s) => (
                          <option key={s.id} value={s.slug}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    إضافة ونشر الإعلان فوراً بالسلايدر
                  </button>
                </form>

                {/* Current Announcements Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500 font-bold">
                        <th className="pb-3 pr-2">نص الإعلان</th>
                        <th className="pb-3 px-2">المتجر المعلن</th>
                        <th className="pb-3 px-2">الشارة</th>
                        <th className="pb-3 px-2">الحالة</th>
                        <th className="pb-3 pl-2">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {announcements.map((ad) => {
                        const isEditing = editingAdId === ad.id;
                        return (
                          <tr key={ad.id} className="hover:bg-gray-50/50">
                            {isEditing ? (
                              <>
                                <td className="py-3.5 pr-2">
                                  <input
                                    type="text"
                                    value={editAdForm.text}
                                    onChange={(e) => setEditAdForm({ ...editAdForm, text: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-xs border border-[#0D5C58] rounded-xl focus:outline-none"
                                  />
                                </td>
                                <td className="py-3.5 px-2 text-[#0D5C58] font-bold">{ad.storeName}</td>
                                <td className="py-3.5 px-2">
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={editAdForm.badgeText}
                                      onChange={(e) => setEditAdForm({ ...editAdForm, badgeText: e.target.value })}
                                      className="w-28 px-2 py-1 text-xs border border-amber-400 rounded-lg focus:outline-none font-bold"
                                      placeholder="الشارة"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                      {["إعلان مميز", "عرض حصري", "خصم اليوم", "طازة وسخن"].map((b) => (
                                        <button
                                          key={b}
                                          type="button"
                                          onClick={() => setEditAdForm({ ...editAdForm, badgeText: b })}
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-amber-100 text-gray-700"
                                        >
                                          {b}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-2">
                                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                    جاري التعديل
                                  </span>
                                </td>
                                <td className="py-3.5 pl-2">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditAd(ad.id)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0D5C58] hover:bg-[#0A4845] text-white transition-all shadow-2xs"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingAdId(null)}
                                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3.5 pr-2 font-bold text-gray-900">{ad.text}</td>
                                <td className="py-3.5 px-2 text-[#0D5C58] font-bold">{ad.storeName}</td>
                                <td className="py-3.5 px-2">
                                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {ad.badgeText}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ad.active ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {ad.active ? "نشط ويدور بالسلايدر" : "متوقف"}
                                  </span>
                                </td>
                                <td className="py-3.5 pl-2 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAdId(ad.id);
                                      setEditAdForm({ text: ad.text, badgeText: ad.badgeText || "إعلان مميز" });
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-all"
                                    title="تعديل الشارة ونص الإعلان"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                                    <span>تعديل الشارة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAd(ad.id)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  >
                                    {ad.active ? "إيقاف" : "تفعيل"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAd(ad.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600"
                                    title="حذف"
                                  >
                                    <i className="fa-regular fa-trash-can"></i>
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PROFITS & MONTHLY STATEMENTS */}
          {/* ======================================================== */}
          {activeTab === "profits" && (() => {
            const reports = financialData.monthlyReports || [];
            const isAll = selectedProfitMonth === "all";

            const matchedReport = isAll
              ? null
              : reports.find(
                  (m) =>
                    m.month === selectedProfitMonth ||
                    m.monthKey === selectedProfitMonth ||
                    m.monthName === selectedProfitMonth
                );

            const displayOrdersCount = isAll
              ? reports.reduce((acc, m) => acc + (Number(m.ordersCount) || 0), 0) || liveOrders.length
              : matchedReport?.ordersCount || 0;

            const displayGrossSales = isAll
              ? reports.reduce(
                  (acc, m) => acc + (Number(m.grossSales ?? m.totalSales) || 0),
                  0
                ) || financialData.totalSales || 0
              : Number(matchedReport?.grossSales ?? matchedReport?.totalSales ?? 0);

            const displayCommission = isAll
              ? reports.reduce(
                  (acc, m) => acc + (Number(m.commissionEarned) || 0),
                  0
                ) || financialData.totalCommissionEarned || 0
              : Number(matchedReport?.commissionEarned || 0);

            const displayNetEarnings = Math.max(0, displayGrossSales - displayCommission);

            return (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-6 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-chart-line text-[#0D5C58]"></i>
                      <span>التقارير والتحليلات المالية الشهرية للمنصة</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      متابعة تفصيلية لإجمالي المبيعات، عمولات المنصة، وصافي أرباح المتاجر مع فلترة دورية
                    </p>
                  </div>

                  {/* Monthly Filter (YYYY-MM) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-gray-600">الفترة المالية:</span>
                    <select
                      value={selectedProfitMonth}
                      onChange={(e) => setSelectedProfitMonth(e.target.value)}
                      className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:outline-none focus:border-[#0D5C58]"
                    >
                      <option value="all">كافة الفترات (إجمالي تراكمي)</option>
                      {reports.map((m, idx) => {
                        const mVal = m.month || m.monthKey || m.monthName;
                        return (
                          <option key={idx} value={mVal}>
                            {m.monthName || m.month}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* 4 Financial KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* KPI 1: Total Orders */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-gray-400">
                      <span className="text-xs text-gray-500 font-bold">إجمالي الطلبات</span>
                      <i className="fa-solid fa-box text-[#0D5C58] text-sm"></i>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-gray-900 block">
                      {displayOrdersCount} طلب
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {isAll ? "خلال كافة الفترات" : `في ${selectedProfitMonth}`}
                    </span>
                  </div>

                  {/* KPI 2: Gross Sales */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2">
                    <div className="flex items-center justify-between text-teal-600">
                      <span className="text-xs text-teal-800 font-bold">المبيعات الإجمالية (Gross)</span>
                      <i className="fa-solid fa-coins text-[#0D5C58] text-sm"></i>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-teal-950 block">
                      {displayGrossSales.toLocaleString()} ج.م
                    </span>
                    <span className="text-[10px] text-teal-700/80 block">
                      إجمالي قيمة فواتير الزبائن
                    </span>
                  </div>

                  {/* KPI 3: Platform Commission */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                    <div className="flex items-center justify-between text-amber-700">
                      <span className="text-xs text-amber-900 font-bold">عمولة المنصة المستحقة</span>
                      <i className="fa-solid fa-percent text-amber-600 text-sm"></i>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-amber-900 block">
                      {displayCommission.toLocaleString()} ج.م
                    </span>
                    <span className="text-[10px] text-amber-700/80 block">
                      حصة تشغيل ودعم أطلب
                    </span>
                  </div>

                  {/* KPI 4: Net Merchant Earnings */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="text-xs text-emerald-900 font-bold">صافي أرباح المتاجر</span>
                      <i className="fa-solid fa-store text-emerald-600 text-sm"></i>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-emerald-950 block">
                      {displayNetEarnings.toLocaleString()} ج.م
                    </span>
                    <span className="text-[10px] text-emerald-700/80 block">
                      المستحقات الصافية للمطاعم
                    </span>
                  </div>
                </div>

                {/* Monthly Reports Table / Cards */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-xs text-gray-700">سجل الإغلاقات والتقارير الشهرية</h3>
                  {reports.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900">{m.monthName || m.month}</span>
                          {idx === 0 && (
                            <span className="text-[10px] font-bold text-[#0D5C58] bg-[#E6F4F1] px-2 py-0.5 rounded-full">
                              الشهر الحالي
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          مبيعات المتاجر: {Number(m.grossSales ?? m.totalSales ?? 0).toLocaleString()} ج.م • الطلبات: {m.ordersCount || 0} طلب
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-xs font-bold">
                        <div>
                          <span className="text-gray-400 block text-[10px]">أرباح المنصة</span>
                          <span className="font-black text-[#0D5C58] text-sm sm:text-base">
                            {Number(m.commissionEarned || 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">المحصل نقداً</span>
                          <span className="font-black text-emerald-700 text-sm sm:text-base">
                            {Number(m.collectedAmount ?? m.collected ?? 0).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* TAB 6: STORE APPLICATIONS (طلبات الانضمام) */}
          {/* ======================================================== */}
          {activeTab === "applications" && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4 text-right">
              <div>
                <h2 className="text-sm font-black text-gray-900">
                  طلبات انضمام المتاجر الجديدة لمنصة أطلب
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  فحص بيانات المحلات التي ترغب في دخول المنصة واعتمادها لتبدأ البيع فوراً
                </p>
              </div>

              {applications.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  لا توجد طلبات انضمام حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-gray-900">{app.storeName}</h3>
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                            {app.categoryName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                          <span>المالك: {app.ownerName}</span>
                          <span>•</span>
                          <span dir="ltr">{app.phone}</span>
                          <span>•</span>
                          <span>{app.address}</span>
                        </div>
                        {app.notes && (
                          <p className="text-xs text-gray-500 bg-white p-2 rounded-xl border border-gray-200">
                            ملاحظات المحل: {app.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {app.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApplicationAction(app.id, "approved")}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-check text-xs"></i>
                              <span>قبول وتفعيل كمتجر في المنصة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplicationAction(app.id, "rejected")}
                              className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs"
                            >
                              رفض الطلب
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl">
                            تم اعتماد المتجر
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: REVIEWS MODERATION */}
          {/* ======================================================== */}
          {activeTab === "reviews" && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4 text-right">
              <div>
                <h2 className="text-sm font-black text-gray-900">مراقبة تقييمات ومراجعات العملاء</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  حجب التعليقات المسيئة أو اعتماد المراجعات الحقيقية على صفحات المتاجر
                </p>
              </div>

              {reviews.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">لا توجد مراجعات حالياً.</div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">
                            {r.customerName || "عميل"}
                          </span>
                          {r.storeName && (
                            <span className="text-[10px] text-gray-400 font-medium">
                              • {r.storeName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-black">
                            <i className="fa-solid fa-star text-amber-500 text-[9px]"></i>
                            <span>{r.rating || 5}</span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG") : ""}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 pt-1">{r.comment || "بدون تعليق نصي"}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleReview(r)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                            r.isHidden
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          }`}
                        >
                          <i className={`fa-solid ${r.isHidden ? "fa-eye-slash" : "fa-check"} text-xs`}></i>
                          <span>{r.isHidden ? "مخفي عن العامة" : "منشور ومعتمد"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReview(r.id)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 bg-red-100 text-red-800 hover:bg-red-200 shadow-2xs"
                          title="حذف هذا التقييم نهائياً وإعادة حساب متوسط تقييم المتجر"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                          <span>حذف التقييم</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: PLATFORM SETTINGS */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-6 text-right max-w-2xl">
              <div>
                <h2 className="text-sm font-black text-gray-900">إعدادات المنصة العامة</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  نسبة العمولة الافتراضية ورسوم الخدمة
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    نسبة عمولة المنصة الافتراضية للمتاجر الجديدة (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={settings?.defaultCommissionRate || 5}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })
                    }
                    className="w-full sm:w-48 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      adminService.updatePlatformSettings(settings);
                      showToast("تم حفظ إعدادات المنصة العامة بنجاح!");
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 9: ADMINS MANAGEMENT (إدارة وإضافة أدمن) */}
          {/* ======================================================== */}
          {activeTab === "admins" && (
            <div className="space-y-6 text-right">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                      <i className="fa-solid fa-user-plus text-[#0D5C58]"></i>
                      <span>إضافة أدمن جديد للوحة تحكم الإدارة</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      أضف مديرين جدد للمنصة وحدد لهم اسم المستخدم وكلمة المرور للدخول على بوابة الإدارة (/admin)
                    </p>
                  </div>
                </div>

                {adminFormMsg.text && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                      adminFormMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        adminFormMsg.type === "success"
                          ? "fa-circle-check"
                          : "fa-triangle-exclamation"
                      }`}
                    ></i>
                    <span>{adminFormMsg.text}</span>
                  </div>
                )}

                <form
                  onSubmit={handleCreateAdmin}
                  autoComplete="off"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      اسم الأدمن بالكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdminForm.fullName}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, fullName: e.target.value })
                      }
                      placeholder="مثال: أحمد محمود"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      المسمى / الصلاحية الإدارية
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.adminTitle}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, adminTitle: e.target.value })
                      }
                      placeholder="مثال: مدير عمليات المنصة"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      اسم المستخدم للدخول (Username) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={newAdminForm.username}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, username: e.target.value })
                      }
                      placeholder="مثال: ahmed_admin"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-right font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      البريد الإلكتروني (اختياري)
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={newAdminForm.email}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, email: e.target.value })
                      }
                      placeholder="ahmed_admin@otlob.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-right font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      كلمة المرور للدخول (6 خانات على الأقل) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={newAdminForm.password}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, password: e.target.value })
                      }
                      placeholder="أدخل كلمة مرور قوية للأدمن الجديد"
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <i className="fa-solid fa-user-plus text-xs"></i>
                      <span>حفظ وإضافة الأدمن الجديد</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* قائمة حسابات الأدمن المسجلة */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                <h3 className="text-sm font-black text-gray-900">
                  قائمة مديري المنصة المسجلين حالياً ({adminsList.length})
                </h3>
                <div className="divide-y divide-gray-100">
                  {adminsList.map((adm) => (
                    <div
                      key={adm.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-sm font-black shrink-0">
                          <i className="fa-solid fa-user-shield"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-gray-900">
                              {adm.fullName}
                            </span>
                            <span className="text-[10px] font-bold bg-teal-50 text-[#0D5C58] px-2 py-0.5 rounded-full border border-teal-200">
                              {adm.adminTitle || "مدير بالمنصة"}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>
                              اسم المستخدم:{" "}
                              <strong className="font-mono text-gray-800" dir="ltr">
                                {adm.username}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              البريد:{" "}
                              <strong className="font-mono text-gray-800" dir="ltr">
                                {adm.email}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {adm.isSuperAdmin ? (
                          <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                            الحساب الرئيسي (Super Admin)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteAdminAccount(adm.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5"
                          >
                            <i className="fa-regular fa-trash-can text-xs"></i>
                            <span>حذف الأدمن</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ADD NEW STORE */}
      {isAddStoreModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setIsAddStoreModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-store text-[#0D5C58]"></i>
                <span>إضافة متجر جديد لمنصة أطلب</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStoreModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs font-bold"
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم المتجر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStoreForm.name}
                  onChange={(e) =>
                    setNewStoreForm({ ...newStoreForm, name: e.target.value })
                  }
                  placeholder="مثال: كبابجي البرنس"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    الرابط الدائم (Slug)
                  </label>
                  <input
                    type="text"
                    value={newStoreForm.slug}
                    onChange={(e) =>
                      setNewStoreForm({ ...newStoreForm, slug: e.target.value })
                    }
                    placeholder="el-prince"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    التصنيف الرئيسي
                  </label>
                  <select
                    value={newStoreForm.categorySlug}
                    onChange={(e) => {
                      const text = e.target.options[e.target.selectedIndex].text;
                      setNewStoreForm({
                        ...newStoreForm,
                        categorySlug: e.target.value,
                        categoryName: text,
                      });
                    }}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                  >
                    <option value="egyptian">أكل مصري</option>
                    <option value="grills">مشويات</option>
                    <option value="bakery">مخبوزات وفطير</option>
                    <option value="seafood">أسماك وبحريات</option>
                    <option value="fastfood">سندوتشات وكريب</option>
                    <option value="grocery">بقالة وخضار</option>
                    <option value="sweets">حلويات وعصائر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عنوان المتجر وموقعه
                </label>
                <input
                  type="text"
                  value={newStoreForm.address}
                  onChange={(e) =>
                    setNewStoreForm({ ...newStoreForm, address: e.target.value })
                  }
                  placeholder="شارع السوق، بجوار مسجد النور، كفر الندى"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    رسوم التوصيل
                  </label>
                  <input
                    type="number"
                    value={newStoreForm.deliveryFee}
                    onChange={(e) =>
                      setNewStoreForm({ ...newStoreForm, deliveryFee: Number(e.target.value) })
                    }
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    الحد الأدنى للطلب
                  </label>
                  <input
                    type="number"
                    value={newStoreForm.minOrderAmount}
                    onChange={(e) =>
                      setNewStoreForm({ ...newStoreForm, minOrderAmount: Number(e.target.value) })
                    }
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    العمولة (%)
                  </label>
                  <input
                    type="number"
                    value={newStoreForm.commissionRate}
                    onChange={(e) =>
                      setNewStoreForm({ ...newStoreForm, commissionRate: Number(e.target.value) })
                    }
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  وصف مختصر للمتجر
                </label>
                <textarea
                  rows={2}
                  value={newStoreForm.description}
                  onChange={(e) =>
                    setNewStoreForm({ ...newStoreForm, description: e.target.value })
                  }
                  placeholder="أشهى المشويات الطازة والكباب البلدي..."
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl resize-none"
                />
              </div>

              {/* Merchant Credentials Fields */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-black text-amber-900 block">
                  بيانات حساب ودخول التاجر (تُسلّم لصاحب المحل):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      اسم المستخدم (Username)
                    </label>
                    <input
                      type="text"
                      value={newStoreForm.username}
                      onChange={(e) =>
                        setNewStoreForm({ ...newStoreForm, username: e.target.value })
                      }
                      placeholder="اتركه فارغاً للتوليد التلقائي"
                      dir="ltr"
                      className="w-full p-2 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      كلمة المرور المؤقتة
                    </label>
                    <input
                      type="text"
                      value={newStoreForm.password}
                      onChange={(e) =>
                        setNewStoreForm({ ...newStoreForm, password: e.target.value })
                      }
                      placeholder="password123"
                      dir="ltr"
                      className="w-full p-2 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-md transition-all"
                >
                  إضافة المتجر وتفعيله فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW MERCHANT CREDENTIALS */}
      {viewingCredentialsStore && storeCredentials && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setViewingCredentialsStore(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-key text-amber-600"></i>
                <span>بيانات دخول التاجر: {viewingCredentialsStore.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingCredentialsStore(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs font-bold"
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <p className="text-xs text-gray-500">
              هذه هي بيانات الاعتماد الخاصة بمدير المتجر للدخول إلى لوحة تحكمه وتعديل الأسعار والوجبات وكلمة مروره.
            </p>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-bold">اسم المتجر:</span>
                <span className="font-black text-gray-900">{viewingCredentialsStore.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-bold">اسم المستخدم (Username):</span>
                <span
                  className="font-mono font-black text-[#0D5C58] bg-white px-2 py-0.5 rounded-md border border-amber-200"
                  dir="ltr"
                >
                  {storeCredentials.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-bold">كلمة المرور:</span>
                <span
                  className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded-md border border-amber-200"
                  dir="ltr"
                >
                  {storeCredentials.password}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-900 font-bold">رابط لوحة تحكم التاجر:</span>
                <span className="font-mono text-[#0D5C58]" dir="ltr">
                  /merchant
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const copyContent = `بيانات دخول التاجر لمنصة أطلب:\nالمتجر: ${viewingCredentialsStore.name}\nاسم المستخدم: ${storeCredentials.username}\nكلمة المرور: ${storeCredentials.password}\nرابط الدخول: ${typeof window !== "undefined" ? window.location.origin : ""}/merchant`;
                  navigator.clipboard.writeText(copyContent);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2500);
                }}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  copiedCreds
                    ? "bg-emerald-600 text-white"
                    : "bg-[#0D5C58] hover:bg-[#0A4845] text-white shadow-md"
                }`}
              >
                <i className={`fa-solid ${copiedCreds ? "fa-check" : "fa-copy"} text-xs`}></i>
                <span>{copiedCreds ? "تم النسخ للحافظة!" : "نسخ بيانات الدخول للتاجر"}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingCredentialsStore(null)}
                className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {isPaymentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-receipt text-[#0D5C58]"></i>
                <span>تسجيل دفعة تحصيل من متجر</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs font-bold"
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اختر المتجر <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentForm.storeId}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, storeId: e.target.value })
                  }
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  المبلغ المحصل (ج.م) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="مثال: 1500"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  طريقة السداد
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                  }
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                >
                  <option value="vodafone_cash">محفظة فودافون كاش</option>
                  <option value="instapay">تحويل إنستاباي (InstaPay)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="cash">نقداً باليد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم العملية المرجعي
                </label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                  }
                  placeholder="مثال: IP-992102"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ملاحظات السداد
                </label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="سداد دفعة من عمولات هذا الشهر..."
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-md transition-all"
                >
                  تأكيد خصم المبلغ من المديونية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-sm text-gray-900">
                تأكيد حذف متجر «{storeToDelete.name}»
              </h3>
              <p className="text-xs text-gray-500">
                هل أنت متأكد من حذف هذا المتجر نهائياً من الموقع وقاعدة البيانات؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeleteStore}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all"
              >
                نعم، احذف المتجر
              </button>
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="flex-1 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD NEW PLATFORM CATEGORY */}
      {isAddCatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setIsAddCatModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-shapes text-[#0D5C58]"></i>
                <span>إضافة تصنيف جديد لمنصة أطلب</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs font-bold"
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <p className="text-xs text-gray-500">
              أضف قسماً أو تصنيفاً جديداً لتوسيع المنصة. سيظهر القسم فوراً للتجار عند التقديم وفي فلاتر الموقع.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم التصنيف بالعربية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  placeholder="مثال: مشويات وكبابجي، عصائر وفريش"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الاسم اللاتيني / الرابط (Slug)
                </label>
                <input
                  type="text"
                  value={newCatForm.slug}
                  onChange={(e) => setNewCatForm({ ...newCatForm, slug: e.target.value })}
                  placeholder="مثال: grills أو juices (اتركه فارغاً للتوليد التلقائي)"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-md transition-all"
                >
                  تأكيد وحفظ التصنيف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: STORE DRILL-DOWN (ملف وتفاصيل المتجر وطلباته الكاملة) */}
      {drillDownStore && (() => {
        const storeOrders = liveOrders.filter(
          (o) =>
            o.storeId === drillDownStore.id ||
            o.storeSlug === drillDownStore.slug ||
            o.store?.id === drillDownStore.id ||
            o.storeName === drillDownStore.name
        );
        const totalStoreSales = storeOrders.reduce((sum, o) => {
          const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
          const discount = Number(o.discountAmount || o.discount || 0);
          const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
          return sum + (bearer === "platform" ? subtotal : Math.max(0, subtotal - discount));
        }, 0);

        const commissionRate = drillDownStore.commissionRate || 5;
        const platformCut = Math.round(
          storeOrders.reduce((sum, o) => {
            const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
            const discount = Number(o.discountAmount || o.discount || 0);
            const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
            const merchantGross = bearer === "platform" ? subtotal : Math.max(0, subtotal - discount);
            const orderRate = Number(o.commissionRateSnapshot ?? o.commissionRate ?? commissionRate);
            return sum + Number(o.platformCommission ?? ((merchantGross * orderRate) / 100));
          }, 0)
        );
        const netEarnings = Math.max(0, totalStoreSales - platformCut);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
            onClick={() => setDrillDownStore(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-[#E6F4F1]/60 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-xl font-black shadow-xs">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base sm:text-lg text-gray-900">
                        {drillDownStore.name}
                      </h3>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        drillDownStore.isOpen !== false
                          ? "bg-[#E6F4F1] text-[#0D5C58]"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {drillDownStore.isOpen !== false ? "مفتوح للطلب" : "مغلق مؤقتاً"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ملف المتجر الشامل، وبيانات الاتصال والموقع وسجل كافة الطلبات الواردة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrillDownStore(null)}
                  className="w-8 h-8 rounded-full bg-white text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center font-bold text-xs transition-all"
                  aria-label="إغلاق"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Store Profile Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 font-bold block">رقم الهاتف والتواصل:</span>
                    <a
                      href={`tel:${drillDownStore.phone || "01000000000"}`}
                      className="inline-flex items-center gap-1.5 font-mono font-black text-sm text-[#0D5C58] hover:underline"
                      dir="ltr"
                    >
                      <i className="fa-solid fa-phone text-xs"></i>
                      <span>{drillDownStore.phone || "01000000000"}</span>
                    </a>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 font-bold block">العنوان والموقع:</span>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <i className="fa-solid fa-location-dot text-amber-500 text-xs"></i>
                      <span>{drillDownStore.address || "باسوس، القليوبية"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400 font-bold block">نسبة العمولة والمسؤول:</span>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <i className="fa-solid fa-percent text-teal-600 text-xs"></i>
                      <span>عمولة {commissionRate}% • {drillDownStore.ownerName || "مسؤول المتجر"}</span>
                    </div>
                  </div>
                </div>

                {/* External Links & Actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Link
                    href={`/stores/${drillDownStore.slug || drillDownStore.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-[#E6F4F1] hover:bg-teal-100 text-[#0D5C58] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>فتح ومعاينة صفحة المتجر بالويب سايت</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </Link>

                  <a
                    href={`tel:${drillDownStore.phone || "01000000000"}`}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <i className="fa-solid fa-phone-volume text-xs"></i>
                    <span>اتصال فوري بالمحل</span>
                  </a>
                </div>

                {/* Store Metrics KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold block">إجمالي الطلبات</span>
                    <span className="text-lg font-black text-gray-900 mt-0.5 block">
                      {storeOrders.length} طلب
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold block">إجمالي المبيعات</span>
                    <span className="text-lg font-black text-[#0D5C58] mt-0.5 block">
                      {totalStoreSales} ج.م
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold block">عمولة المنصة ({commissionRate}%)</span>
                    <span className="text-lg font-black text-amber-600 mt-0.5 block">
                      {platformCut} ج.م
                    </span>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                    <span className="text-[10px] text-gray-400 font-bold block">صافي أرباح المحل</span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                      {netEarnings} ج.م
                    </span>
                  </div>
                </div>

                {/* Store Specific Orders Feed */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="font-black text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                      <i className="fa-solid fa-receipt text-[#0D5C58]"></i>
                      <span>سجل طلبات متجر {drillDownStore.name} ({storeOrders.length} طلب)</span>
                    </h4>
                  </div>

                  {storeOrders.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs">
                      لا توجد طلبات مسجلة لهذا المتجر حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {storeOrders.map((ord) => (
                        <div
                          key={ord.id || ord.orderNumber}
                          className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-gray-900">
                                طلب #{ord.orderNumber}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                ({new Date(ord.createdAt || Date.now()).toLocaleTimeString("ar-EG")})
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded-lg bg-[#E6F4F1] text-[#0D5C58] font-black text-[11px]">
                              {ord.total} ج.م
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-gray-600">
                            <div>
                              <span className="font-bold">{ord.customerName}</span>
                              <span className="text-gray-400"> • </span>
                              <span dir="ltr">{ord.customerPhone}</span>
                            </div>
                            <span className="text-gray-400">{ord.deliveryAddress || "باسوس"}</span>
                          </div>

                          {Array.isArray(ord.items) && ord.items.length > 0 && (
                            <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-xl">
                              {ord.items.map((it) => `${it.quantity}x ${it.name || it.productName}`).join(" • ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDrillDownStore(null)}
                  className="px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition-all"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
