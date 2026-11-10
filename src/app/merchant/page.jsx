"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { storesService } from "@/services/stores.service";
import { ordersService } from "@/services/orders.service";
import { authService } from "@/services/auth.service";
import { adminService } from "@/services/admin.service";
import { productsService, cleanDescription } from "@/services/products.service";
import { reviewsService } from "@/services/reviews.service";
import OfferCountdown, {
  ARABIC_MONTHS,
  isOfferExpired,
} from "@/components/home/offers/OfferCountdown";

function dateToScheduleParts(isoOrDate) {
  const dt = isoOrDate ? new Date(isoOrDate) : new Date(Date.now() + 3 * 86400000);
  const validDt = Number.isNaN(dt.getTime())
    ? new Date(Date.now() + 3 * 86400000)
    : dt;
  const h24 = validDt.getHours();
  const period = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    year: validDt.getFullYear(),
    month: validDt.getMonth() + 1, // 1..12
    day: validDt.getDate(), // 1..31
    hour12,
    minute: validDt.getMinutes(),
    period,
  };
}

function schedulePartsToIso({ year, month, day, hour12, minute, period }) {
  let h24 = Number(hour12) % 12;
  if (period === "PM") h24 += 12;
  const dt = new Date(
    Number(year) || new Date().getFullYear(),
    Math.max(0, (Number(month) || 1) - 1),
    Math.max(1, Number(day) || 1),
    h24,
    Number(minute) || 0,
    0
  );
  return dt.toISOString();
}

export default function MerchantDashboardPage() {
  const { user, setUser, initAuth, logout } = useAuthStore();
  const [store, setStore] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [activeTab, setActiveTab] = useState("orders"); // orders | menu | settings | finance | ad_request | security
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Add / Edit Dish modal in merchant dashboard
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [editingDishId, setEditingDishId] = useState(null);
  const [newDishForm, setNewDishForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    hasSizes: false,
    sizes: [{ id: "sz_1", name: "عادي", extraPrice: 0 }],
    hasExtras: false,
    extras: [{ id: "ex_1", name: "", price: "" }],
    hasDiscount: false,
    discountType: "percentage",
    discountValue: "",
  });

  // Customer Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Financial & Orders Monthly/Period Filter state
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // طلبات اليوم الحالي
  const todayOrders = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
      return d === todayStr;
    });
  }, [orders]);

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [orderTimeFilter, setOrderTimeFilter] = useState("all"); // "all" | "today" | "week"
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  // Inline Login form state (if not logged in as merchant)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Editable store form state
  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    deliveryTime: "٢٥-٣٥ دقيقة",
    deliveryFee: 15,
    minOrderAmount: 50,
    offerBadge: "",
    offerText: "",
    phone: "",
    isFreeDelivery: false,
    previousDeliveryFee: 15,
  });

  // Offer Countdown & Schedule State (Day, Month, Hour, Minute, Period)
  const [offerSchedule, setOfferSchedule] = useState(() => {
    return {
      ...dateToScheduleParts(new Date().toISOString()),
      endsAt: null,
      discountType: "fixed_amount",
      discountValue: 20,
      couponCode: "",
      maxDiscount: "",
      deliveryMinOrder: 150,
      deliveryDiscountType: "free",
      deliveryDiscountValue: 0,
    };
  });
  const [storeSaveToast, setStoreSaveToast] = useState("");

  // استراتيجية الخصم بالمحل: 'none' | 'coupon' | 'selected_items' | 'full_menu' | 'delivery_discount'
  const [discountStrategy, setDiscountStrategy] = useState("none");
  const [selectedOfferItemIds, setSelectedOfferItemIds] = useState([]);
  const [itemDiscountType, setItemDiscountType] = useState("percentage");
  const [itemDiscountValue, setItemDiscountValue] = useState(20);
  const [menuDiscountPercent, setMenuDiscountPercent] = useState(15);
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  // Top Swiper Ad Request state
  const [adForm, setAdForm] = useState({
    text: "",
    badgeText: "عرض مميز",
  });
  const [adRequests, setAdRequests] = useState([]);
  const [submittingAd, setSubmittingAd] = useState(false);
  const [adSuccessMsg, setAdSuccessMsg] = useState("");
  const [editingMerchantAdId, setEditingMerchantAdId] = useState(null);
  const [editMerchantAdForm, setEditMerchantAdForm] = useState({ text: "", badgeText: "" });

  // Password & credentials update state
  const [credForm, setCredForm] = useState({
    currentPassword: "",
    newUsername: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [credMsg, setCredMsg] = useState({ text: "", type: "" });
  const [savingCred, setSavingCred] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "merchant") {
      setLoading(false);
      authService.initCsrf();
      return;
    }

    let isMounted = true;
    const fetchMerchantData = async () => {
      setLoading(true);
      try {
        const storesRes = await storesService.getStores({ limit: 100 });
        const allStores = Array.isArray(storesRes?.stores) ? storesRes.stores : [];

        let targetStoreId = user?.storeId;
        let targetStoreSlug = user?.storeSlug;
        if (typeof window !== "undefined" && (!targetStoreId || !targetStoreSlug)) {
          try {
            const rawSess = localStorage.getItem("otlob_merchant_session");
            if (rawSess) {
              const parsedSess = JSON.parse(rawSess);
              targetStoreId = targetStoreId || parsedSess?.storeId;
              targetStoreSlug = targetStoreSlug || parsedSess?.storeSlug;
            }
          } catch {}
        }

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
          // مزامنة النسبة المحددة للمتجر من قبل الأدمن
          try {
            const customMap = adminService.getCustomCommissionsMap();
            const customRate =
              (currentStore.id && customMap[currentStore.id] !== undefined)
                ? customMap[currentStore.id]
                : (currentStore.slug && customMap[currentStore.slug] !== undefined)
                ? customMap[currentStore.slug]
                : undefined;

            if (customRate !== undefined) {
              currentStore.commissionRate = Number(customRate);
            } else if (currentStore.commissionRate === undefined || currentStore.commissionRate === null) {
              currentStore.commissionRate = 5;
            }
          } catch {}

          setStore({ ...currentStore });
          setIsOpen(currentStore.isOpen !== false);
          const hasRealOffer = Boolean(
            (currentStore.activeOffer && !isOfferExpired(currentStore.activeOffer.endsAt)) ||
            (currentStore.hasOffer && currentStore.offerText && currentStore.offerText.trim() && !isOfferExpired(currentStore.offerEndsAt))
          );

          const isStoreFreeDelivery = Boolean(
            currentStore.hasFreeDeliveryOffer ||
            currentStore.activeOffer?.discountType === "free_delivery"
          );

          setStoreForm({
            name: currentStore.name || "متجر معتمد",
            description: currentStore.description || "",
            deliveryTime: currentStore.deliveryTime || "٢٥-٣٥ دقيقة",
            deliveryFee: isStoreFreeDelivery ? 0 : (currentStore.deliveryFee || 15),
            minOrderAmount: currentStore.minOrderAmount || 50,
            offerBadge: hasRealOffer ? (currentStore.offerBadge || "عرض خاص") : "",
            offerText: hasRealOffer ? (currentStore.offerText || "") : "",
            phone: currentStore.phone || "",
            isFreeDelivery: isStoreFreeDelivery,
            previousDeliveryFee: Number(currentStore.deliveryFee) > 0 ? Number(currentStore.deliveryFee) : 15,
          });

          const existingEndsAt = hasRealOffer
            ? currentStore.offerEndsAt || currentStore.activeOffer?.endsAt || null
            : null;

          setOfferSchedule({
            ...dateToScheduleParts(existingEndsAt || new Date().toISOString()),
            endsAt: existingEndsAt,
            discountType:
              currentStore.activeOffer?.discountType || "fixed_amount",
            discountValue:
              Number(currentStore.activeOffer?.discountValue) || 20,
            couponCode: currentStore.activeOffer?.code || "",
          });

          // Fetch Store Orders from API
          const ordersRes = await ordersService.getOrders({
            storeId: currentStore.id,
            storeSlug: currentStore.slug,
            limit: 50,
          });
          const fetchedOrders = Array.isArray(ordersRes?.items)
            ? ordersRes.items
            : Array.isArray(ordersRes?.data?.items)
            ? ordersRes.data.items
            : Array.isArray(ordersRes?.orders)
            ? ordersRes.orders
            : [];
          setOrders(fetchedOrders);

          // Fetch Store Reviews
          try {
            const revRes = await reviewsService.getReviews({ storeId: currentStore.id });
            const revItems = revRes?.data?.items || revRes?.reviews || revRes?.items || [];
            setReviews(revItems);
          } catch {}

          // Fetch Ad requests for this store
          const allAdReqs = adminService.getMerchantAdRequests();
          const storeReqs = allAdReqs.filter(
            (r) => r.storeId === currentStore.id || r.storeSlug === currentStore.slug
          );
          setAdRequests(storeReqs);

          // Fetch Menu Products for this store (مباشرة من قاعدة البيانات)
          let loadedProducts = [];
          try {
            const prodsRes = await productsService.getProducts({
              storeId: currentStore.id,
              storeSlug: currentStore.slug,
            });
            loadedProducts = Array.isArray(prodsRes?.products) ? prodsRes.products : [];
          } catch {}

          setProducts(loadedProducts);

          // مزامنة حالة الخصم الحالية للمحل
          if (!hasRealOffer) {
            setDiscountStrategy("none");
          } else {
            const discounted = loadedProducts.filter(
              (p) => Number(p.discountValue) > 0
            );
            if (discounted.length > 0) {
              setSelectedOfferItemIds(discounted.map((p) => p.id));
              if (discounted.length === loadedProducts.length && loadedProducts.length > 1) {
                setDiscountStrategy("full_menu");
                setMenuDiscountPercent(Number(discounted[0].discountValue) || 15);
              } else {
                setDiscountStrategy("selected_items");
                setItemDiscountType(discounted[0].discountType || "percentage");
                setItemDiscountValue(Number(discounted[0].discountValue) || 20);
              }
            } else if (
              currentStore.isFreeDelivery ||
              currentStore.activeOffer?.discountType === "free_delivery" ||
              currentStore.activeOffer?.appliesTo === "delivery_discount"
            ) {
              setDiscountStrategy("delivery_discount");
            } else if (currentStore.activeOffer?.code) {
              setDiscountStrategy("coupon");
            } else if (currentStore.activeOffer?.appliesTo) {
              setDiscountStrategy(currentStore.activeOffer.appliesTo);
            } else {
              setDiscountStrategy("none");
            }

            // قراءة إعدادات وحدود العرض النشط مباشرة من بيانات المتجر في قاعدة البيانات
            if (currentStore.activeOffer) {
              if (currentStore.activeOffer.maxDiscount) {
                setOfferSchedule((prev) => ({ ...prev, maxDiscount: currentStore.activeOffer.maxDiscount }));
              }
              if (currentStore.activeOffer.minOrder) {
                setOfferSchedule((prev) => ({ ...prev, deliveryMinOrder: currentStore.activeOffer.minOrder }));
              }
            }
          }
        }
      } catch {
        // Keep clean state
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMerchantData();
    return () => {
      isMounted = false;
    };
  }, [user?.storeId, user?.storeSlug, user?.role]);

  // تحديث حي وتلقائي للطلبات الواردة كل 4 ثوانٍ لضمان ظهور أي طلب جديد فوراً
  useEffect(() => {
    if (!store?.id || !user || user.role !== "merchant") return;
    let active = true;
    const pollOrders = async () => {
      try {
        const ordersRes = await ordersService.getOrders({
          storeId: store.id,
          storeSlug: store.slug,
          limit: 50,
        });
        const fetchedOrders = Array.isArray(ordersRes?.items)
          ? ordersRes.items
          : Array.isArray(ordersRes?.data?.items)
          ? ordersRes.data.items
          : Array.isArray(ordersRes?.orders)
          ? ordersRes.orders
          : [];
        if (active) {
          setOrders(fetchedOrders);

          // Fetch Store Reviews
          try {
            const revRes = await reviewsService.getReviews({ storeId: currentStore.id });
            const revItems = revRes?.data?.items || revRes?.reviews || revRes?.items || [];
            setReviews(revItems);
          } catch {}
        }
      } catch {
        // ignore polling error
      }
    };
    const intervalId = setInterval(pollOrders, 4000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [store?.id, user]);

  const handleToggleOpen = async () => {
    if (!store?.id) return;
    setUpdatingStatus(true);
    const nextStatus = !isOpen;
    try {
      await storesService.updateStore(store.id, { isOpen: nextStatus });
      setIsOpen(nextStatus);
    } catch {
      setIsOpen(nextStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const updateOfferSchedulePart = (changes) => {
    setOfferSchedule((prev) => {
      const next = { ...prev, ...changes };
      const endsAt = schedulePartsToIso(next);
      return { ...next, endsAt };
    });
  };

  const applyQuickDuration = (hoursToAdd) => {
    const targetDate = new Date(Date.now() + hoursToAdd * 3600 * 1000);
    const iso = targetDate.toISOString();
    setOfferSchedule((prev) => ({
      ...prev,
      ...dateToScheduleParts(iso),
      endsAt: iso,
    }));
  };

  const handleStopOfferImmediately = async () => {
    if (!store?.id) return;
    setSavingStore(true);
    try {
      const prevFee =
        Number(storeForm.previousDeliveryFee) > 0
          ? Number(storeForm.previousDeliveryFee)
          : Number(storeForm.deliveryFee) > 0
          ? Number(storeForm.deliveryFee)
          : 15;

      const res = await storesService.saveStoreOfferWithSchedule(store, {
        offerText: "",
        isFreeDelivery: false,
        stopImmediately: true,
      });

      try {
        await storesService.updateStore(store.id, {
          isFreeDelivery: false,
          deliveryFee: prevFee,
          offerBadge: "عرض خاص",
        });
      } catch {
        // Updated via saveStoreOfferWithSchedule
      }

      setStoreForm((prev) => ({
        ...prev,
        offerText: "",
        isFreeDelivery: false,
        deliveryFee: prevFee,
        previousDeliveryFee: prevFee,
        offerBadge: "عرض خاص",
      }));
      setOfferSchedule((prev) => ({
        ...prev,
        endsAt: res?.offerEndsAt || new Date(Date.now() - 60000).toISOString(),
      }));
      setStore((prev) => ({
        ...prev,
        hasOffer: false,
        isFreeDelivery: false,
        hasFreeDeliveryOffer: false,
        deliveryFee: prevFee,
        offerBadge: "عرض خاص",
        offerText: null,
        offerEndsAt: null,
      }));
      setStoreSaveToast("تم إيقاف العرض وإخفاؤه من صفحة المتجر فوراً.");
      setTimeout(() => setStoreSaveToast(""), 4000);
    } catch (err) {
      console.warn("Stop offer warning:", err?.message || err);
      setStoreSaveToast("تم إيقاف العرض وإخفاؤه من صفحة المتجر فوراً.");
      setTimeout(() => setStoreSaveToast(""), 4000);
    } finally {
      setSavingStore(false);
    }
  };

  const handleSaveStoreDetails = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!store?.id) return;

    const isDeliveryDiscount = discountStrategy === "delivery_discount";
    const deliveryMinOrderVal = Number(offerSchedule.deliveryMinOrder) || 0;

    // تفعيل التوصيل المجاني الشامل إذا تم اختياره من قسم التوصيل أو كاستراتيجية بدون حد أدنى
    const isFree = Boolean(
      storeForm.isFreeDelivery ||
      (isDeliveryDiscount && offerSchedule.deliveryDiscountType === "free" && deliveryMinOrderVal === 0)
    );

    if (discountStrategy === "none" && !isFree) {
      setSavingStore(true);
      setStoreSaveToast("");
      try {
        const prevFee =
          Number(storeForm.deliveryFee) > 0
            ? Number(storeForm.deliveryFee)
            : Number(storeForm.previousDeliveryFee) || 15;

        // إلغاء خصومات الأصناف إن وجدت
        const updated = products.map((prod) => ({
          ...prod,
          discountType: null,
          discountValue: 0,
          hasDiscount: false,
        }));
        setProducts(updated);
        for (const p of products) {
          if (p.hasDiscount || Number(p.discountValue) > 0) {
            productsService.updateProduct(p.id, { discountType: null, discountValue: 0 }).catch(() => {});
          }
        }

        await storesService.saveStoreOfferWithSchedule(store, {
          offerText: "",
          isFreeDelivery: false,
          stopImmediately: true,
        });

        await storesService.updateStore(store.id, {
          name: storeForm.name,
          description: storeForm.description,
          offerBadge: "",
          deliveryMinutes: 30,
          deliveryFee: prevFee,
          isFreeDelivery: false,
          minOrder: Number(storeForm.minOrderAmount),
        });

        setStoreForm((prev) => ({
          ...prev,
          offerText: "",
          offerBadge: "",
          isFreeDelivery: false,
          deliveryFee: prevFee,
          previousDeliveryFee: prevFee,
        }));
        setOfferSchedule((prev) => ({ ...prev, endsAt: null }));
        setStore((prev) => ({
          ...prev,
          ...storeForm,
          deliveryFee: prevFee,
          isFreeDelivery: false,
          hasFreeDeliveryOffer: false,
          offerBadge: "",
          offerText: "",
          hasOffer: false,
          offerEndsAt: null,
        }));
        setStoreSaveToast("تم حفظ بيانات المتجر بنجاح وبدون أي عروض مفعلة!");
        setTimeout(() => setStoreSaveToast(""), 4000);
      } catch (err) {
        console.error("Save store error:", err);
        setStoreSaveToast(err?.message || "حدث خطأ أثناء حفظ بيانات المتجر.");
        setTimeout(() => setStoreSaveToast(""), 4000);
      } finally {
        setSavingStore(false);
      }
      return;
    }

    if (isDeliveryDiscount && !isFree) {
      const minVal = Number(offerSchedule.deliveryMinOrder);
      if (!minVal || minVal <= 0) {
        setStoreSaveToast("يرجى تحديد الحد الأدنى لقيمة الطلب لتفعيل خصم التوصيل (حقل إلزامي).");
        return;
      }
    }

    setSavingStore(true);
    setStoreSaveToast("");
    const computedEndsAt = schedulePartsToIso(offerSchedule);

    const prevFee =
      Number(storeForm.deliveryFee) > 0
        ? Number(storeForm.deliveryFee)
        : Number(storeForm.previousDeliveryFee) || 15;
    const effectiveFee = isFree ? 0 : prevFee;

    let effectiveBadge = storeForm.offerBadge || "عرض خاص";
    if (isDeliveryDiscount) {
      effectiveBadge = deliveryMinOrderVal > 0
        ? `توصيل مجاني فوق ${deliveryMinOrderVal} ج`
        : "توصيل مجاني";
    } else if (isFree) {
      effectiveBadge = "توصيل مجاني";
    } else if (discountStrategy === "full_menu") {
      effectiveBadge = `خصم ${Number(menuDiscountPercent) || 15}%`;
    } else if (discountStrategy === "selected_items") {
      effectiveBadge = "خصومات خاصة";
    } else if (discountStrategy === "coupon") {
      effectiveBadge = offerSchedule.couponCode ? `كوبون ${offerSchedule.couponCode}` : "كوبون خصم";
    }

    let effectiveOfferText = storeForm.offerText;
    if (isDeliveryDiscount) {
      effectiveOfferText =
        deliveryMinOrderVal > 0
          ? `عرض خاص: توصيل مجاني على الطلبات بقيمة ${deliveryMinOrderVal} ج.م أو أكثر!`
          : "عرض خاص: توصيل مجاني على جميع الطلبات!";
    } else if (isFree) {
      effectiveOfferText =
        effectiveOfferText || "عرض خاص: توصيل مجاني على جميع الطلبات!";
    } else if (discountStrategy === "full_menu") {
      effectiveOfferText = `خصم ${Number(menuDiscountPercent) || 15}% على جميع أصناف المنيو!`;
    } else if (discountStrategy === "selected_items") {
      effectiveOfferText = "خصومات حصرية على وجبات مختارة من المنيو!";
    } else if (discountStrategy === "coupon" && offerSchedule.couponCode) {
      effectiveOfferText = `استخدم كود ${offerSchedule.couponCode} واحصل على خصم فوري!`;
    } else if (!isFree && !isDeliveryDiscount) {
      if (effectiveOfferText?.includes("توصيل مجاني")) {
        effectiveOfferText = "";
      }
    }

    try {
      // 1) تطبيق استراتيجية الخصم المختارة وحفظها على المنتجات
      if (discountStrategy === "selected_items") {
        const updated = products.map((prod) => {
          const isSelected = selectedOfferItemIds.includes(prod.id);
          return {
            ...prod,
            discountType: isSelected ? itemDiscountType : null,
            discountValue: isSelected ? Number(itemDiscountValue) || 0 : 0,
            hasDiscount: isSelected,
          };
        });

        for (const p of updated) {
          if (selectedOfferItemIds.includes(p.id) || Number(p.discountValue) > 0) {
            productsService
              .updateProduct(p.id, {
                discountType: p.discountType,
                discountValue: p.discountValue,
              })
              .catch(() => {});
          }
        }
        setProducts(updated);
      } else if (discountStrategy === "full_menu") {
        // الخصم يطبّق على مستوى كامل المنيو والطلب عبر جدول offers مع الالتزام الصارم بسقف الخصم (max_discount)
        const updated = products.map((prod) => ({
          ...prod,
          discountType: null,
          discountValue: 0,
          hasDiscount: false,
        }));
        setProducts(updated);
      } else if (discountStrategy === "delivery_discount" || discountStrategy === "coupon") {
        // إزالة الخصم المباشر من الأصناف وتفعيل خصم التوصيل أو الكوبون
        const updated = products.map((prod) => ({
          ...prod,
          discountType: null,
          discountValue: 0,
          hasDiscount: false,
        }));
        setProducts(updated);

        if (discountStrategy === "coupon" && offerSchedule.couponCode?.trim()) {
          adminService.createCoupon({
            code: offerSchedule.couponCode.trim(),
            storeId: store.id,
            storeName: store.name,
            storeSlug: store.slug,
            discountType:
              offerSchedule.discountType === "percentage"
                ? "percentage"
                : "fixed",
            discountValue: Number(offerSchedule.discountValue) || 20,
            minOrderAmount: Number(storeForm.minOrderAmount) || 0,
            maxDiscount: offerSchedule.maxDiscount ? Number(offerSchedule.maxDiscount) : null,
            endsAt: computedEndsAt,
            discountBearer: "merchant",
          });
        }
      }

      await storesService.saveStoreOfferWithSchedule(store, {
        offerText: effectiveOfferText,
        offerBadge: effectiveBadge,
        endsAt: computedEndsAt,
        discountType: isDeliveryDiscount
          ? (offerSchedule.deliveryDiscountType === "free" ? "free_delivery" : "delivery_discount")
          : (isFree ? "free_delivery" : offerSchedule.discountType),
        discountValue: isDeliveryDiscount
          ? (offerSchedule.deliveryDiscountType === "free" ? 0 : Number(offerSchedule.deliveryDiscountValue) || 0)
          : (isFree ? 0 : (discountStrategy === "full_menu" ? Number(menuDiscountPercent) || 15 : offerSchedule.discountValue)),
        minOrder: isDeliveryDiscount
          ? deliveryMinOrderVal
          : (discountStrategy === "selected_items" ? 0 : Number(storeForm.minOrderAmount) || 0),
        maxDiscount: offerSchedule.maxDiscount ? Number(offerSchedule.maxDiscount) : null,
        appliesTo: discountStrategy,
        selectedProductIds: discountStrategy === "selected_items" ? selectedOfferItemIds : [],
        code: discountStrategy === "coupon" ? offerSchedule.couponCode : null,
        isFreeDelivery: isFree,
      });

      await storesService.updateStore(store.id, {
        name: storeForm.name,
        description: storeForm.description,
        offerBadge: effectiveBadge,
        deliveryMinutes: 30,
        deliveryFee: effectiveFee,
        isFreeDelivery: isFree,
        minOrder: Number(storeForm.minOrderAmount),
      });

      setOfferSchedule((prev) => ({ ...prev, endsAt: computedEndsAt }));
      setStore((prev) => ({
        ...prev,
        ...storeForm,
        deliveryFee: effectiveFee,
        isFreeDelivery: isFree,
        hasFreeDeliveryOffer: isFree,
        offerBadge: effectiveBadge,
        offerText: effectiveOfferText,
        hasOffer: Boolean(isFree || effectiveOfferText?.trim()),
        offerEndsAt: computedEndsAt,
      }));
      setStoreSaveToast(
        isFree
          ? "تم تفعيل عرض التوصيل المجاني (0 ج.م) وظهوره كعرض للعملاء بنجاح!"
          : "تم حفظ بيانات المتجر وتفعيل العرض بنجاح!"
      );
      setTimeout(() => setStoreSaveToast(""), 4000);
    } catch (err) {
      console.error("Save offer error:", err);
      setStoreSaveToast(err?.message || "حدث خطأ أثناء حفظ العرض.");
      setTimeout(() => setStoreSaveToast(""), 4000);
    } finally {
      setSavingStore(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersService.updateOrderStatus(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
  };

  const handleToggleProductAvailability = async (product) => {
    const nextAvailability = !product.isAvailable;
    try {
      const res = await productsService.updateProduct(product.id, {
        isAvailable: nextAvailability,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? (res?.product || { ...p, isAvailable: nextAvailability }) : p
        )
      );
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً.");
        logout();
      } else {
        alert("تعذر تحديث حالة توفر الصنف في قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("هل أنت متأكد من حذف هذا الصنف من القائمة؟")) return;
    try {
      await productsService.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً.");
        logout();
      } else {
        alert("تعذر حذف الصنف من قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    }
  };

  const openAddDishModal = () => {
    setEditingDishId(null);
    setNewDishForm({
      name: "",
      price: "",
      category: "",
      description: "",
      hasSizes: false,
      sizes: [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
      hasExtras: false,
      extras: [{ id: "ex_1", name: "", price: "" }],
    });
    setShowAddDishModal(true);
  };

  const openEditDishModal = (prod) => {
    const existingSizes =
      Array.isArray(prod.sizes) && prod.sizes.length > 0
        ? prod.sizes.map((s, idx) => ({
            id: s.id || `sz_${idx + 1}`,
            name: s.name || "",
            extraPrice: idx === 0 ? 0 : Number(s.extraPrice ?? s.price ?? 0) || 0,
          }))
        : [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }];

    const rawExtras =
      Array.isArray(prod.extras) && prod.extras.length > 0
        ? prod.extras
        : Array.isArray(prod.addOns) && prod.addOns.length > 0
        ? prod.addOns
        : [];

    const existingExtras =
      rawExtras.length > 0
        ? rawExtras.map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            name: ex.name || "",
            price: ex.price ?? "",
          }))
        : [{ id: "ex_1", name: "", price: "" }];

    setEditingDishId(prod.id);
    setNewDishForm({
      name: prod.name || "",
      price: prod.price ?? "",
      category: prod.category || prod.categoryName || "",
      description: cleanDescription(prod.description) || "",
      hasSizes: Array.isArray(prod.sizes) && prod.sizes.length > 0,
      sizes: existingSizes,
      hasExtras: rawExtras.length > 0,
      extras: existingExtras,
      hasDiscount: Boolean(prod.discountValue && Number(prod.discountValue) > 0),
      discountType: prod.discountType || "percentage",
      discountValue: prod.discountValue ?? "",
    });
    setShowAddDishModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newDishForm.name.trim() || !newDishForm.price) return;

    const cleanSizes = newDishForm.hasSizes
      ? newDishForm.sizes
          .map((s, idx) => ({
            id: s.id || `sz_${idx + 1}`,
            name: String(s.name || "").trim(),
            extraPrice: idx === 0 ? 0 : Math.max(0, Number(s.extraPrice) || 0),
          }))
          .filter((s) => s.name.length > 0)
      : [];

    const cleanExtras = newDishForm.hasExtras
      ? newDishForm.extras
          .map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            name: String(ex.name || "").trim(),
            price: Math.max(0, Number(ex.price) || 0),
          }))
          .filter((ex) => ex.name.length > 0)
      : [];

    const payload = {
      storeId: store?.id,
      storeSlug: store?.slug,
      storeName: store?.name,
      name: newDishForm.name.trim(),
      price: Number(newDishForm.price),
      category: newDishForm.category.trim() || "أصناف مميزة",
      categoryName: newDishForm.category.trim() || "أصناف مميزة",
      description: newDishForm.description.trim(),
      sizes: cleanSizes,
      extras: cleanExtras,
      addOns: cleanExtras,
      discountType: newDishForm.hasDiscount ? newDishForm.discountType : null,
      discountValue:
        newDishForm.hasDiscount && Number(newDishForm.discountValue) > 0
          ? Number(newDishForm.discountValue)
          : 0,
    };

    try {
      if (editingDishId) {
        const res = await productsService.updateProduct(editingDishId, payload);
        if (!res?.product) {
          throw new Error("لم يتم إرجاع بيانات الصنف المحدثة من الخادم");
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === editingDishId ? res.product : p))
        );
      } else {
        payload.isAvailable = true;
        const res = await productsService.createProduct(payload);
        if (!res?.product) {
          throw new Error("لم يتم إرجاع بيانات الصنف الجديد من الخادم");
        }
        setProducts((prev) => [res.product, ...prev]);
      }
      setShowAddDishModal(false);
      setEditingDishId(null);
    } catch (err) {
      const isAuthErr =
        err?.status === 401 ||
        err?.response?.status === 401 ||
        String(err?.message || "").includes("تسجيل الدخول");
      if (isAuthErr) {
        alert("انتهت جلسة تسجيل الدخول أو التوكين غير موجود. يرجى تسجيل الدخول مجدداً للمتابعة.");
        logout();
      } else {
        alert("تعذر حفظ الصنف في قاعدة البيانات: " + (err?.response?.data?.message || err?.message || ""));
      }
    }
  };

  const handleSubmitAdRequest = (e) => {
    e.preventDefault();
    if (!adForm.text.trim()) return;
    setSubmittingAd(true);
    setAdSuccessMsg("");
    try {
      const newReq = adminService.submitMerchantAdRequest({
        storeId: store?.id,
        storeName: store?.name,
        storeSlug: store?.slug,
        text: adForm.text.trim(),
        badgeText: adForm.badgeText.trim() || "عرض مميز",
      });
      setAdRequests((prev) => [newReq, ...prev]);
      setAdSuccessMsg("تم إرسال طلب نشر الإعلان للإدارة بنجاح! سيتم مراجعته وتفعيله في الشريط العلوي بعد سداد الرسوم.");
      setAdForm({ text: "", badgeText: "عرض مميز" });
    } catch {
      // ignore
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleSaveEditMerchantAd = (reqId) => {
    if (!editMerchantAdForm.text?.trim() && !editMerchantAdForm.badgeText?.trim()) return;
    adminService.updateMerchantAdRequest(reqId, editMerchantAdForm);
    setAdRequests(
      adminService
        .getMerchantAdRequests()
        .filter((r) => r.storeId === store?.id || r.storeSlug === store?.slug)
    );
    setEditingMerchantAdId(null);
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    if (credForm.newPassword && credForm.newPassword !== credForm.confirmPassword) {
      setCredMsg({
        text: "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.",
        type: "error",
      });
      return;
    }
    setSavingCred(true);
    setCredMsg({ text: "", type: "" });
    try {
      const updatedCred = await authService.updateMerchantCredentials(
        store?.id || user?.storeId,
        {
          currentPassword: credForm.currentPassword,
          newUsername: credForm.newUsername,
          newPassword: credForm.newPassword,
        }
      );
      if (updatedCred && user) {
        setUser({
          ...user,
          username: updatedCred.username,
          email: updatedCred.email,
        });
      }
      setCredMsg({
        text: `تم تحديث بيانات الدخول بنجاح! اسم المستخدم الحالي هو «${updatedCred?.username || user?.username}» ويمكنك استخدامه مع كلمة المرور الجديدة لتسجيل الدخول.`,
        type: "success",
      });
      setCredForm({
        currentPassword: "",
        newUsername: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setCredMsg({
        text: err?.message || "حدث خطأ أثناء تحديث بيانات الدخول.",
        type: "error",
      });
    } finally {
      setSavingCred(false);
    }
  };

  const handleInlineLogin = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await authService.login({
        email: loginIdentifier.trim(),
        password: loginPassword.trim(),
      });
      if (res?.user) {
        setUser(res.user);
      }
    } catch (err) {
      setLoginError(err.message || "اسم المستخدم أو كلمة المرور غير صحيحة.");
    } finally {
      setLoginLoading(false);
    }
  };

  // IF NOT LOGGED IN AS A MERCHANT -> SHOW MERCHANT LOGIN PORTAL
  if (!user || user.role !== "merchant") {
    return (
      <div className="max-w-md mx-auto my-12 px-4 text-right">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-2xl font-black shadow-md mx-auto">
              <i className="fa-solid fa-store"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              تسجيل دخول التاجر المعتمد
            </h1>
            <p className="text-xs text-gray-500">
              أدخل اسم المستخدم وكلمة المرور المسلمة لك من إدارة المنصة لإدارة مطعمك
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0"></i>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleInlineLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المستخدم للمتجر (Username)
              </label>
              <input
                type="text"
                name="merchant_username"
                autoComplete="off"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInlineLogin(e);
                  }
                }}
                placeholder="أدخل اسم المستخدم الخاص بالمتجر"
                dir="ltr"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800 text-right font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                name="merchant_password"
                autoComplete="new-password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInlineLogin(e);
                  }
                }}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] focus:bg-white text-gray-800"
              />
            </div>

            <button
              type="button"
              onClick={handleInlineLogin}
              disabled={loginLoading}
              className="w-full py-3 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <span>جاري التحقق...</span>
              ) : (
                <>
                  <span>تسجيل الدخول للوحة التاجر</span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-gray-400">
            إذا لم تستلم بيانات دخول متجرك بعد، يرجى التواصل مع إدارة أطلب.
          </div>
        </div>
      </div>
    );
  }

  // التحليل المالي والفلترة الشهرية (YYYY-MM)
  const availableMonths = Array.from(
    new Set(
      orders
        .map((o) => {
          const d = o.createdAt ? new Date(o.createdAt) : null;
          if (!d || Number.isNaN(d.getTime())) return null;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
        .filter(Boolean)
    )
  ).sort().reverse();

  const filteredOrders = orders.filter((o) => {
    const date = o.createdAt ? new Date(o.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return false;

    // فلترة الشهر المختار (الافتراضي هو الشهر الحالي الذي يبدأ من يوم 1 ويتصفر تلقائياً)
    if (selectedMonth !== "all") {
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (yearMonth !== selectedMonth) return false;
    }

    // فلترة اليوم / الأسبوع
    if (orderTimeFilter === "today") {
      const todayStr = new Date().toISOString().slice(0, 10);
      return date.toISOString().slice(0, 10) === todayStr;
    }
    if (orderTimeFilter === "week") {
      const diffDays = Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }

    return true;
  });

  const visibleOrdersList = filteredOrders.filter((o) => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) {
      return false;
    }
    return true;
  });

  const totalSales = filteredOrders.reduce((sum, o) => {
    const subtotal = Number(o.subtotal || o.originalSubtotal || o.total || 0);
    const discount = Number(o.discountAmount || o.discount || 0);
    const bearer = o.discountBearer || (o.couponCode && (o.couponCode === "OTLOB20" || o.couponCode === "AHLAN" || o.couponCode === "FREEDEL" || o.storeSlug === "all") ? "platform" : "merchant");
    return sum + (bearer === "platform" ? subtotal : Math.max(0, subtotal - discount));
  }, 0);

  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  // إحصائيات تقييمات العملاء
  const totalReviewsCount =
    reviews.length > 0
      ? reviews.length
      : store?.reviewsCount && Number(store.reviewsCount) > 0
      ? Number(store.reviewsCount)
      : 0;

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) /
          reviews.length
        ).toFixed(1)
      : store?.rating && Number(store.rating) > 0
      ? Number(store.rating).toFixed(1)
      : null;

  const ratingCounts = {
    5: reviews.filter((r) => Number(r.rating) === 5).length,
    4: reviews.filter((r) => Number(r.rating) === 4).length,
    3: reviews.filter((r) => Number(r.rating) === 3).length,
    2: reviews.filter((r) => Number(r.rating) === 2).length,
    1: reviews.filter((r) => Number(r.rating) === 1).length,
  };

  const merchantNavTabs = [
    {
      id: "orders",
      label: "الطلبات الواردة الحية",
      icon: "fa-list-check",
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} جديد` : orders.length,
      badgeColor: pendingOrdersCount > 0 ? "bg-red-600" : "bg-teal-700",
    },
    {
      id: "menu",
      label: "قائمة الأصناف والمنيو والأسعار",
      icon: "fa-utensils",
      badge: `${products.length} صنف`,
      badgeColor: "bg-teal-700",
    },
    {
      id: "reviews",
      label: "تقييمات العملاء",
      icon: "fa-star",
      badge: reviews.length > 0 ? `${reviews.length} تقييم` : null,
      badgeColor: "bg-amber-600",
    },
    {
      id: "settings",
      label: "بيانات المتجر والعرض الداخلي",
      icon: "fa-pen-to-square",
      badge: null,
    },
    {
      id: "finance",
      label: "المستحقات والتقارير المالية",
      icon: "fa-money-bill-wave",
      badge: `${totalSales} ج.م`,
      badgeColor: "bg-emerald-700",
    },
    {
      id: "ad_request",
      label: "طلب إعلان بالشريط العلوي للمنصة",
      icon: "fa-bullhorn",
      badge: adRequests.length > 0 ? adRequests.length : null,
      badgeColor: "bg-amber-600",
    },
    {
      id: "security",
      label: "تغيير اسم المستخدم وكلمة المرور",
      icon: "fa-key",
      badge: null,
    },
  ];

  const currentTabObj =
    merchantNavTabs.find((t) => t.id === activeTab) || merchantNavTabs[0];

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-right">
      {/* شريط التنقل العلوي الخاص بلوحة تحكم التاجر فقط (منفصل تماماً عن الموقع العام) */}
      <header className="sticky top-0 z-40 bg-[#0D5C58] text-white shadow-md border-b border-teal-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white text-lg shadow-xs shrink-0">
              <i className="fa-solid fa-store"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight">
                  بوابة التاجر • {store?.name || "متجر معتمد"}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-amber-400 text-teal-950 px-2 py-0.5 rounded-full">
                  لوحة التحكم الخاصة
                </span>
              </div>
              <span className="block text-[11px] text-teal-100">
                حساب المتجر: {user?.username || store?.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-teal-50 text-xs font-bold border border-white/15">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              ></span>
              <span>{isOpen ? "المتجر مفتوح" : "المتجر مغلق"}</span>
            </span>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
              title="تسجيل الخروج من لوحة التاجر"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* النافذة المنبثقة لاختيار أقسام لوحة التحكم (القائمة الحالية) */}
      {isNavModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsNavModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-sm font-black">
                  <i className="fa-solid fa-layer-group"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    قائمة التنقل وأقسام لوحة التاجر
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    اختر القسم المطلوب للانتقال إليه فوراً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-2">
              {merchantNavTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "settings") {
                        setIsEditingStore(true);
                      } else {
                        setIsEditingStore(false);
                      }
                      setIsNavModalOpen(false);
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

                    {tab.badge !== null && tab.badge !== undefined && (
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
                  setIsNavModalOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-black bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-xs">
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </div>
                  <span>تسجيل الخروج من حساب المتجر</span>
                </div>
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Top Header & Store Status Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0D5C58] text-white flex items-center justify-center text-xl sm:text-2xl shadow-sm shrink-0">
              <i className="fa-solid fa-store"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-gray-900">
                  لوحة تحكم المتجر: {store?.name || "متجر معتمد"}
                </h1>
                <span className="text-[10px] font-bold text-[#0D5C58] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full">
                  تاجر معتمد
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                إدارة الطلبات الحية، تعديل الأصناف والمنيو، ضبط عداد العروض، ومتابعة المستحقات المالية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Store Status Switch */}
            <div className="flex items-center gap-2.5 bg-gray-50 p-2 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700">حالة المطعم:</span>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleToggleOpen}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 ${
                  isOpen
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-red-600 text-white shadow-xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span>
                  {updatingStatus
                    ? "جاري..."
                    : isOpen
                    ? "مفتوح لاستقبال الطلبات"
                    : "مغلق مؤقتاً"}
                </span>
              </button>
            </div>
          </div>
        </div>

      {/* بطاقة شريط التنقل المخصصة (خارج الناف بار لخدمة UI/UX وسهولة الوصول للأقسام) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#0D5C58]/20 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E6F4F1] text-[#0D5C58] flex items-center justify-center text-base font-black shrink-0 shadow-2xs">
            <i className={`fa-solid ${currentTabObj.icon}`}></i>
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">
              القسم المفتوح حالياً في لوحة التاجر
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm sm:text-base font-black text-gray-900">
                {currentTabObj.label}
              </span>
              {currentTabObj.badge !== null && currentTabObj.badge !== undefined && (
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-black text-white ${
                    currentTabObj.badgeColor || "bg-[#0D5C58]"
                  }`}
                >
                  {currentTabObj.badge}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNavModalOpen(true)}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2.5"
        >
          <i className="fa-solid fa-layer-group text-xs"></i>
          <span>قائمة التنقل السريع (القائمة الحالية)</span>
          <i className="fa-solid fa-up-right-from-square text-[11px] opacity-80"></i>
        </button>
      </div>

      {/* Store Banner Preview (Internal store page offer + Live Countdown) */}
      <div className="bg-[#E6F4F1] border border-teal-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D5C58] text-white flex items-center justify-center text-sm shrink-0">
            <i className="fa-solid fa-ticket-simple"></i>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#0D5C58] block">
              العرض الداخلي الظاهر للزبائن في صفحة مطعمك مباشرة (مع عداد التوقف التلقائي)
            </span>
            {storeForm.offerText && offerSchedule.endsAt && !isOfferExpired(offerSchedule.endsAt) ? (
              <span className="text-xs sm:text-sm font-black text-gray-900 block">
                {storeForm.offerText}
              </span>
            ) : (
              <span className="text-xs font-bold text-red-600 block">
                لا يوجد عرض نشط حالياً (تم إيقاف العرض أو انتهى وقته)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {storeForm.offerText && offerSchedule.endsAt && (
            <OfferCountdown endsAt={offerSchedule.endsAt} />
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setIsEditingStore(true);
            }}
            className="self-start sm:self-auto px-4 py-2 rounded-full bg-[#0D5C58] text-white hover:bg-[#0A4845] font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <i className="fa-solid fa-stopwatch text-xs"></i>
            <span>تعديل العرض وموعد انتهائه</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs text-gray-500 font-bold">إجمالي الطلبات</span>
            <i className="fa-solid fa-box text-[#0D5C58] text-sm"></i>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900 block">
            {orders.length} طلب
          </span>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs text-gray-500 font-bold">المبيعات الإجمالية</span>
            <i className="fa-solid fa-coins text-[#0D5C58] text-sm"></i>
          </div>
          <span className="text-xl sm:text-2xl font-black text-gray-900 block">
            {totalSales} ج.م
          </span>
        </div>

        <div
          onClick={() => setActiveTab("reviews")}
          className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between space-y-2 cursor-pointer hover:border-amber-400/50 transition-all"
        >
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs text-gray-500 font-bold">تقييم المتجر</span>
            <i className="fa-solid fa-star text-amber-500 text-sm"></i>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 block">
              {averageRating ? `${averageRating} ★` : "متجر جديد"}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {totalReviewsCount > 0
                ? `من ${totalReviewsCount} تقييم (عرض التقييمات)`
                : "لا توجد تقييمات بعد"}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs text-gray-500 font-bold">عمولة المنصة</span>
            <i className="fa-solid fa-percent text-emerald-600 text-sm"></i>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block">
            {store?.commissionRate || 5}%
          </span>
        </div>
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          {store?.isActive === false || Boolean(store?.suspensionReason) ? (
            <div className="p-6 sm:p-10 rounded-2xl border-2 border-red-200 bg-red-50 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base sm:text-lg font-black text-red-900">
                  تم إيقاف استقبال الطلبات مؤقتاً لوجود مستحقات متأخرة واجبة السداد
                </h3>
                <p className="text-xs text-red-700 leading-relaxed">
                  نظراً لتجاوز الحد الأقصى للمستحقات أو وجود عمولات معلقة، تم تعليق ظهور متجرك وتلقي طلبات جديدة حتى تتم التسوية المالية.
                  {store?.suspensionReason && (
                    <span className="block mt-1 font-bold text-red-800">
                      سبب التجميد: {store.suspensionReason}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("finance")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors shadow-lg shadow-red-600/20"
              >
                <i className="fa-solid fa-file-invoice-dollar"></i>
                <span>الانتقال إلى المستحقات والتقارير المالية</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header & Quick Live Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>الطلبات الواردة الحية لمطعم {store?.name}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    تحديث حالة الطلب يرسل تنبيهاً فورياً للمندوب والعميل
                  </p>
                </div>
              </div>

              {/* Quick Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100">
                  <span className="text-[11px] font-bold text-teal-800 block">أوردرات اليوم</span>
                  <span className="text-xl font-black text-teal-950 block">{todayOrders.length} طلب</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-500 block">
                    {selectedMonth === currentYearMonth ? "طلبات الشهر (يوم 1)" : "طلبات الفترة"}
                  </span>
                  <span className="text-xl font-black text-gray-900 block">{filteredOrders.length} طلب</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <span className="text-[11px] font-bold text-amber-800 block">قيد الانتظار</span>
                  <span className="text-xl font-black text-amber-950 block">{pendingOrdersCount} جديد</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-800 block">مبيعات الفترة</span>
                  <span className="text-xl font-black text-emerald-950 block">{totalSales.toLocaleString("ar-EG")} ج.م</span>
                </div>
              </div>

              {/* Filter Toolbar (Month, Period: Day/Week, Status) */}
              <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white focus:outline-none focus:border-[#0D5C58]"
                  >
                    <option value={currentYearMonth}>الشهر الحالي ({currentYearMonth}) - يبدأ من يوم 1</option>
                    <option value="all">كافة الشهور (تراكمي)</option>
                    {availableMonths
                      .filter((ym) => ym !== currentYearMonth)
                      .map((ym) => (
                        <option key={ym} value={ym}>
                          شهر {ym}
                        </option>
                      ))}
                  </select>

                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-gray-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setOrderTimeFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        orderTimeFilter === "all"
                          ? "bg-[#0D5C58] text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderTimeFilter("today")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        orderTimeFilter === "today"
                          ? "bg-[#0D5C58] text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      اليوم ({todayOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderTimeFilter("week")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        orderTimeFilter === "week"
                          ? "bg-[#0D5C58] text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      هذا الأسبوع
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">الحالة:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white focus:outline-none focus:border-[#0D5C58]"
                  >
                    <option value="all">كافة الحالات ({filteredOrders.length})</option>
                    <option value="pending">جديد بانتظار التأكيد (pending)</option>
                    <option value="accepted">تم القبول (accepted)</option>
                    <option value="preparing">جاري التجهيز (preparing)</option>
                    <option value="on_the_way">مع المندوب (on_the_way)</option>
                    <option value="delivered">تم التسليم (delivered)</option>
                    <option value="cancelled">ملغي (cancelled)</option>
                  </select>
                </div>
              </div>

          {loading ? (
            <div className="p-10 text-center text-xs font-bold text-[#0D5C58]">
              جاري تحميل الطلبات...
            </div>
          ) : visibleOrdersList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              لا توجد طلبات تطابق الفلترة المحددة.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrdersList.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">
                        طلب #{ord.orderNumber}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({new Date(ord.createdAt || Date.now()).toLocaleTimeString("ar-EG")})
                      </span>
                    </div>

                    <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <i className="fa-solid fa-user text-gray-400 text-[10px]"></i>
                      <span>{ord.customerName}</span>
                      <span className="text-gray-400">•</span>
                      <span dir="ltr">{ord.customerPhone}</span>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <i className="fa-solid fa-location-dot text-gray-400 text-[10px]"></i>
                      <span>{ord.deliveryAddress}</span>
                    </div>

                    {ord.items && ord.items.length > 0 && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded-xl border border-gray-200 mt-2">
                        {ord.items.map((it, idx) => (
                          <span key={idx} className="inline-block mr-2 text-[11px] font-bold">
                            {it.quantity}x {it.name || it.productName} ({it.price ?? it.unitPrice} ج.م)
                          </span>
                        ))}
                      </div>
                    )}

                    {ord.notes && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1.5 font-medium">
                        <i className="fa-regular fa-comment-dots ml-1.5"></i>
                        <span>تفاصيل وملاحظات الطلب: {ord.notes}</span>
                      </div>
                    )}

                    {(Number(ord.discountAmount || ord.discount) > 0) && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {ord.discountBearer === "platform" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-[#0D5C58] font-bold">
                            خصم منصة ({ord.discountAmount || ord.discount} ج.م - مخصوم من عمولة المنصة لمصلحة المحل)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            خصم متجر ({ord.discountAmount || ord.discount} ج.م - العمولة على السعر قبل الخصم)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="font-black text-[#0D5C58]">
                        إجمالي العميل: {ord.total} ج.م
                      </span>
                      {Number(ord.subtotal) > 0 && ord.subtotal !== ord.total && (
                        <span className="text-gray-400 text-[11px]">
                          (الأصناف: {ord.subtotal} ج.م)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Status Action Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {ord.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(ord.id, "accepted")}
                        className="px-4 py-2 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-check text-xs"></i>
                        <span>قبول الطلب</span>
                      </button>
                    )}

                    {ord.status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(ord.id, "preparing")}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-fire-burner text-xs"></i>
                        <span>بدء التحضير بالمطبخ</span>
                      </button>
                    )}

                    {ord.status === "preparing" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(ord.id, "on_the_way")}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-motorcycle text-xs"></i>
                        <span>تسليم للكابتن</span>
                      </button>
                    )}

                    {ord.status === "on_the_way" && (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-[#0D5C58] text-xs font-bold border border-teal-200 flex items-center gap-1.5">
                          <i className="fa-solid fa-motorcycle text-xs"></i>
                          <span>خرج مع الكابتن</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(ord.id, "delivered")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                        >
                          <i className="fa-solid fa-check text-xs"></i>
                          <span>تم التوصيل</span>
                        </button>
                      </div>
                    )}

                    {ord.status === "delivered" && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check text-xs"></i>
                        <span>تم التسليم بنجاح</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    )}

      {/* Tab: Menu & Dishes Management */}
      {activeTab === "menu" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-utensils text-[#0D5C58]"></i>
                <span>قائمة أصناف ومنتجات {store?.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600 font-medium">
                  {products.length} صنف
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                تحكم في إتاحة الوجبات فورياً، أضف أصنافاً جديدة، وحدد الأحجام والإضافات الخاصة بمتجرك.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddDishModal}
              className="px-4 py-2.5 rounded-2xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>إضافة صنف جديد للمطعم</span>
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-xl text-gray-300">
                <i className="fa-solid fa-bowl-food"></i>
              </div>
              <p className="text-xs font-bold text-gray-500">
                لا توجد أصناف مسجلة لهذا المطعم حتى الآن.
              </p>
              <button
                type="button"
                onClick={openAddDishModal}
                className="px-4 py-2 rounded-xl bg-teal-50 text-[#0D5C58] font-bold text-xs hover:bg-teal-100 transition-all"
              >
                + أضف الصنف الأول
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    prod.isAvailable !== false
                      ? "bg-white border-gray-200 shadow-xs"
                      : "bg-gray-50/70 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C58] shrink-0 border border-[#0D5C58]/20 flex items-center justify-center">
                        <i className="fa-solid fa-utensils text-xs"></i>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-snug">
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-[#0D5C58]">
                            {prod.price} ج.م
                          </span>
                          {(prod.category || prod.categoryName) && (
                            <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-medium">
                              {prod.category || prod.categoryName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditDishModal(prod)}
                        title="تعديل الصنف والأحجام والإضافات"
                        className="w-7 h-7 rounded-lg text-gray-500 hover:text-[#0D5C58] hover:bg-teal-50 flex items-center justify-center transition-all text-xs"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        title="حذف الصنف"
                        className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all text-xs"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>

                  {prod.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {cleanDescription(prod.description)}
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      {Array.isArray(prod.sizes) && prod.sizes.length > 0 && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          {prod.sizes.length} أحجام
                        </span>
                      )}
                      {(Array.isArray(prod.addOns) && prod.addOns.length > 0) ||
                      (Array.isArray(prod.extras) && prod.extras.length > 0) ? (
                        <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                          {(prod.extras || prod.addOns).length} إضافات
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleProductAvailability(prod)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        prod.isAvailable !== false
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          prod.isAvailable !== false
                            ? "bg-emerald-600"
                            : "bg-red-600"
                        }`}
                      ></span>
                      <span>
                        {prod.isAvailable !== false ? "متاح للطلب" : "غير متاح"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Dish Modal */}
          {showAddDishModal && (
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => {
                setShowAddDishModal(false);
                setEditingDishId(null);
              }}
            >
              <div
                className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <i
                      className={`fa-solid ${
                        editingDishId ? "fa-pen-to-square" : "fa-circle-plus"
                      } text-[#0D5C58]`}
                    ></i>
                    <span>
                      {editingDishId
                        ? `تعديل الصنف: ${newDishForm.name}`
                        : `إضافة صنف جديد لقائمة ${store?.name}`}
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDishModal(false);
                      setEditingDishId(null);
                    }}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      اسم الصنف / الوجبة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ربع تيس مشوي، أو طبق مكرونة بشاميل"
                      value={newDishForm.name}
                      onChange={(e) =>
                        setNewDishForm({ ...newDishForm, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        السعر الأساسي (ج.م) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="مثال: 95"
                        value={newDishForm.price}
                        onChange={(e) =>
                          setNewDishForm({ ...newDishForm, price: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        القسم / التصنيف
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: وجبات رئيسية"
                        value={newDishForm.category}
                        onChange={(e) =>
                          setNewDishForm({ ...newDishForm, category: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      وصف الصنف والمكونات
                    </label>
                    <textarea
                      rows={2}
                      placeholder="أدخل وصفاً شهياً للوجبة أو مواصفات المنتج..."
                      value={newDishForm.description}
                      onChange={(e) =>
                        setNewDishForm({ ...newDishForm, description: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] resize-none"
                    ></textarea>
                  </div>

                  {/* Sizes Dynamic Builder */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={newDishForm.hasSizes}
                          onChange={(e) =>
                            setNewDishForm({
                              ...newDishForm,
                              hasSizes: e.target.checked,
                              sizes:
                                newDishForm.sizes?.length > 0
                                  ? newDishForm.sizes
                                  : [{ id: "sz_1", name: "حجم عادي", extraPrice: 0 }],
                            })
                          }
                          className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                        />
                        <span>تفعيل خيارات الأحجام لهذا الصنف</span>
                      </label>
                      {newDishForm.hasSizes && (
                        <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                          عدد الأحجام: {newDishForm.sizes.length}
                        </span>
                      )}
                    </div>

                    {newDishForm.hasSizes && (
                      <div className="space-y-2.5 pt-2 border-t border-gray-200/70">
                        <p className="text-[11px] text-gray-500">
                          الحجم الأول يأخذ السعر الأساسي للصنف ({newDishForm.price || 0} ج.م)، والأحجام الإضافية تكتب فيها مقدار الزيادة (مثل +20 ج.م):
                        </p>

                        {newDishForm.sizes.map((sz, idx) => (
                          <div
                            key={sz.id || idx}
                            className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                          >
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder={
                                  idx === 0
                                    ? "اسم الحجم الأول (مثال: صغير / عادي)"
                                    : "اسم الحجم (مثال: وسط أو كبير)"
                                }
                                value={sz.name}
                                onChange={(e) => {
                                  const updated = [...newDishForm.sizes];
                                  updated[idx] = {
                                    ...updated[idx],
                                    name: e.target.value,
                                  };
                                  setNewDishForm({ ...newDishForm, sizes: updated });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D5C58]"
                              />
                            </div>

                            {idx === 0 ? (
                              <div className="px-2.5 py-1.5 rounded-lg bg-[#E6F4F1] text-[#0D5C58] text-[11px] font-bold shrink-0">
                                السعر الأساسي (+0 ج.م)
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs font-black text-[#0D5C58]">+</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="20"
                                  value={sz.extraPrice}
                                  onChange={(e) => {
                                    const updated = [...newDishForm.sizes];
                                    updated[idx] = {
                                      ...updated[idx],
                                      extraPrice: e.target.value,
                                    };
                                    setNewDishForm({ ...newDishForm, sizes: updated });
                                  }}
                                  className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D5C58] text-center font-bold"
                                />
                                <span className="text-[11px] text-gray-500">ج.م</span>
                              </div>
                            )}

                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = newDishForm.sizes.filter(
                                    (_, i) => i !== idx
                                  );
                                  setNewDishForm({ ...newDishForm, sizes: updated });
                                }}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs shrink-0"
                                title="حذف هذا الحجم"
                              >
                                <i className="fa-regular fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setNewDishForm({
                              ...newDishForm,
                              sizes: [
                                ...newDishForm.sizes,
                                {
                                  id: `sz_${Date.now()}`,
                                  name: "",
                                  extraPrice: "",
                                },
                              ],
                            })
                          }
                          className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                          <span>إضافة حجم جديد (+سعر إضافي)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Extras Dynamic Builder */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={newDishForm.hasExtras}
                          onChange={(e) =>
                            setNewDishForm({
                              ...newDishForm,
                              hasExtras: e.target.checked,
                              extras:
                                newDishForm.extras?.length > 0
                                  ? newDishForm.extras
                                  : [{ id: "ex_1", name: "", price: "" }],
                            })
                          }
                          className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                        />
                        <span>تفعيل الإضافات الاختيارية لهذا الصنف</span>
                      </label>
                      {newDishForm.hasExtras && (
                        <span className="text-[10px] font-bold bg-[#E6F4F1] text-[#0D5C58] px-2 py-0.5 rounded-full">
                          عدد الإضافات: {newDishForm.extras.length}
                        </span>
                      )}
                    </div>

                    {newDishForm.hasExtras && (
                      <div className="space-y-2.5 pt-2 border-t border-gray-200/70">
                        {newDishForm.extras.map((ex, idx) => (
                          <div
                            key={ex.id || idx}
                            className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200"
                          >
                            <input
                              type="text"
                              placeholder="اسم الإضافة (مثال: صوص شيدر أو جبنة إضافية)"
                              value={ex.name}
                              onChange={(e) => {
                                const updated = [...newDishForm.extras];
                                updated[idx] = {
                                  ...updated[idx],
                                  name: e.target.value,
                                };
                                setNewDishForm({ ...newDishForm, extras: updated });
                              }}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D5C58]"
                            />

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs font-black text-[#0D5C58]">+</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="15"
                                value={ex.price}
                                onChange={(e) => {
                                  const updated = [...newDishForm.extras];
                                  updated[idx] = {
                                    ...updated[idx],
                                    price: e.target.value,
                                  };
                                  setNewDishForm({ ...newDishForm, extras: updated });
                                }}
                                className="w-20 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0D5C58] text-center font-bold"
                              />
                              <span className="text-[11px] text-gray-500">ج.م</span>
                            </div>

                            {newDishForm.extras.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = newDishForm.extras.filter(
                                    (_, i) => i !== idx
                                  );
                                  setNewDishForm({ ...newDishForm, extras: updated });
                                }}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-xs shrink-0"
                                title="حذف هذه الإضافة"
                              >
                                <i className="fa-regular fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() =>
                            setNewDishForm({
                              ...newDishForm,
                              extras: [
                                ...newDishForm.extras,
                                {
                                  id: `ex_${Date.now()}`,
                                  name: "",
                                  price: "",
                                },
                              ],
                            })
                          }
                          className="w-full py-2 rounded-xl border border-dashed border-[#0D5C58] text-[#0D5C58] hover:bg-[#E6F4F1] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                          <span>إضافة إضافة أخرى</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Item-Level Promotion / Discount */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={newDishForm.hasDiscount}
                          onChange={(e) =>
                            setNewDishForm({
                              ...newDishForm,
                              hasDiscount: e.target.checked,
                              discountType: newDishForm.discountType || "percentage",
                              discountValue: newDishForm.discountValue || "",
                            })
                          }
                          className="rounded text-[#0D5C58] focus:ring-[#0D5C58]"
                        />
                        <span>تفعيل خصم أو عرض خاص على هذا الصنف</span>
                      </label>
                      {newDishForm.hasDiscount && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          عرض ترويجي نشط
                        </span>
                      )}
                    </div>

                    {newDishForm.hasDiscount && (
                      <div className="pt-2 border-t border-gray-200/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            نوع الخصم
                          </label>
                          <select
                            value={newDishForm.discountType}
                            onChange={(e) =>
                              setNewDishForm({
                                ...newDishForm,
                                discountType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          >
                            <option value="percentage">نسبة مئوية (%)</option>
                            <option value="fixed">مبلغ ثابت من السعر (ج.م)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            {newDishForm.discountType === "percentage"
                              ? "قيمة الخصم المئوي (%)"
                              : "مبلغ الخصم المباشر (ج.م)"}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={newDishForm.discountType === "percentage" ? "100" : undefined}
                            placeholder={newDishForm.discountType === "percentage" ? "مثال: 20" : "مثال: 15"}
                            value={newDishForm.discountValue}
                            onChange={(e) =>
                              setNewDishForm({
                                ...newDishForm,
                                discountValue: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDishModal(false);
                        setEditingDishId(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold shadow-xs"
                    >
                      {editingDishId ? "حفظ تعديلات الصنف" : "حفظ الصنف ونشره"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Store Details & Internal Offer Editor */}
      {(activeTab === "settings" || isEditingStore) && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6">
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-gray-900">
                تعديل بيانات المتجر والعرض الداخلي
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                أي تعديل هنا يظهر مباشرة في صفحة مطعمك أمام زوار التطبيق بدون الحاجة لموافقة مسبقة
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveStoreDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  اسم المتجر / المطعم
                </label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الوصف المختصر (سنة التأسيس والشارع)
                </label>
                <input
                  type="text"
                  value={storeForm.description}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div className="sm:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#E6F4F1]/60 border border-teal-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-200/70">
                  <div>
                    <h4 className="font-black text-sm text-[#0D5C58] flex items-center gap-2">
                      <i className="fa-solid fa-stopwatch"></i>
                      <span>إعدادات العرض وعدّاد التوقف التلقائي (اليوم والشهر والساعة)</span>
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      حدد نص العرض، وحدد متى يقف العرض بالضبط (اليوم، الشهر، والساعة) وسيظهر عداد تنازلي حي للعملاء ويقف العرض تلقائياً عند انتهاء الوقت.
                    </p>
                  </div>
                  {storeForm.offerText && (
                    <button
                      type="button"
                      onClick={handleStopOfferImmediately}
                      className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <i className="fa-solid fa-ban text-[10px]"></i>
                      <span>إيقاف العرض فوراً</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      شارة العرض (Badge)
                    </label>
                    <input
                      type="text"
                      value={storeForm.offerBadge || "عرض خاص"}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, offerBadge: e.target.value })
                      }
                      placeholder="مثال: عرض خاص"
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {["عرض خاص", "وفر 20%", "خصم اليوم", "طازة وحصري", "لفترة محدودة"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setStoreForm({ ...storeForm, offerBadge: b })}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-teal-200 hover:border-[#0D5C58] text-[#0D5C58] transition-all"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      نص العرض الداخلي الخاص بصفحتك
                    </label>
                    <input
                      type="text"
                      value={storeForm.offerText}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, offerText: e.target.value })
                      }
                      placeholder="مثال: خصم ٢٠ ج.م بكود NADA20 على طلبات ٢٠٠ ج.م أو أكثر"
                      className="w-full px-4 py-2.5 text-xs bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    />
                  </div>
                </div>

                {/* ─── اختيار نوع العرض (كوبون خصم | خصم على أصناف معينة | خصم على كامل المنيو) ─── */}
                <div className="space-y-3 pt-2 border-t border-teal-200/80">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-black text-gray-900">
                      حدد استراتيجية الخصم بالمحل:
                    </label>
                    <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      اختر طريقة واحدة لتطبيق العرض
                    </span>
                  </div>

                  {/* 5 بطاقات اختيار حصرية */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* خيار 0: بدون عروض */}
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountStrategy("none");
                        setStoreForm((p) => ({
                          ...p,
                          offerBadge: "",
                          offerText: "",
                          isFreeDelivery: false,
                          deliveryFee: Number(p.previousDeliveryFee) > 0 ? Number(p.previousDeliveryFee) : 15,
                        }));
                        setOfferSchedule((p) => ({ ...p, endsAt: null }));
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        discountStrategy === "none"
                          ? "bg-white border-[#0D5C58] shadow-sm ring-2 ring-[#0D5C58]/20"
                          : "bg-white/70 border-teal-100 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-ban"></i>
                        </div>
                        <input
                          type="radio"
                          checked={discountStrategy === "none"}
                          onChange={() => {
                            setDiscountStrategy("none");
                            setStoreForm((p) => ({
                              ...p,
                              offerBadge: "",
                              offerText: "",
                              isFreeDelivery: false,
                              deliveryFee: Number(p.previousDeliveryFee) > 0 ? Number(p.previousDeliveryFee) : 15,
                            }));
                            setOfferSchedule((p) => ({ ...p, endsAt: null }));
                          }}
                          className="accent-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">بدون عروض</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          تجميد وإلغاء أي عروض نشطة على المتجر حالياً
                        </div>
                      </div>
                    </button>

                    {/* خيار 1: كوبون خصم */}
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountStrategy("coupon");
                        if (storeForm.isFreeDelivery) {
                          const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                          setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                        }
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        discountStrategy === "coupon"
                          ? "bg-white border-[#0D5C58] shadow-sm ring-2 ring-[#0D5C58]/20"
                          : "bg-white/70 border-teal-100 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0D5C58] flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-ticket"></i>
                        </div>
                        <input
                          type="radio"
                          checked={discountStrategy === "coupon"}
                          onChange={() => {
                            setDiscountStrategy("coupon");
                            if (storeForm.isFreeDelivery) {
                              const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                              setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                            }
                          }}
                          className="accent-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">كوبون خصم (برومو كود)</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          تفعيل كود يدخله العميل في الشيك أوت للحصول على الخصم
                        </div>
                      </div>
                    </button>

                    {/* خيار 2: خصم على أصناف معينة */}
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountStrategy("selected_items");
                        if (storeForm.isFreeDelivery) {
                          const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                          setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                        }
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        discountStrategy === "selected_items"
                          ? "bg-white border-[#0D5C58] shadow-sm ring-2 ring-[#0D5C58]/20"
                          : "bg-white/70 border-teal-100 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-burger"></i>
                        </div>
                        <input
                          type="radio"
                          checked={discountStrategy === "selected_items"}
                          onChange={() => {
                            setDiscountStrategy("selected_items");
                            if (storeForm.isFreeDelivery) {
                              const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                              setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                            }
                          }}
                          className="accent-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">خصم على أصناف معينة</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          اختر وجبات محددة ليظهر بجانبها الخصم والسعر المخفض
                        </div>
                      </div>
                    </button>

                    {/* خيار 3: خصم على المنيو بالكامل */}
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountStrategy("full_menu");
                        if (storeForm.isFreeDelivery) {
                          const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                          setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                        }
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        discountStrategy === "full_menu"
                          ? "bg-white border-[#0D5C58] shadow-sm ring-2 ring-[#0D5C58]/20"
                          : "bg-white/70 border-teal-100 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-tags"></i>
                        </div>
                        <input
                          type="radio"
                          checked={discountStrategy === "full_menu"}
                          onChange={() => {
                            setDiscountStrategy("full_menu");
                            if (storeForm.isFreeDelivery) {
                              const prevFee = Number(storeForm.previousDeliveryFee) || 15;
                              setStoreForm((p) => ({ ...p, isFreeDelivery: false, deliveryFee: prevFee }));
                            }
                          }}
                          className="accent-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">خصم على المنيو كله</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          تطبيق نسبة خصم شاملة على جميع أصناف ووجبات المحل
                        </div>
                      </div>
                    </button>

                    {/* خيار 4: خصم التوصيل (أو توصيل مجاني مشروط) */}
                    <button
                      type="button"
                      onClick={() => setDiscountStrategy("delivery_discount")}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        discountStrategy === "delivery_discount"
                          ? "bg-white border-[#0D5C58] shadow-sm ring-2 ring-[#0D5C58]/20"
                          : "bg-white/70 border-teal-100 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
                          <i className="fa-solid fa-motorcycle"></i>
                        </div>
                        <input
                          type="radio"
                          checked={discountStrategy === "delivery_discount"}
                          onChange={() => setDiscountStrategy("delivery_discount")}
                          className="accent-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">خصم على التوصيل (مشروط)</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          توصيل مجاني أو مخفض مشروط بوصول السلة للحد الأدنى
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* تفاصيل الخيار 1: كوبون الخصم */}
                  {discountStrategy === "coupon" && (
                    <div className="p-3.5 bg-white rounded-2xl border border-teal-200 grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          كود الكوبون
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={offerSchedule.couponCode}
                          onChange={(e) =>
                            setOfferSchedule({
                              ...offerSchedule,
                              couponCode: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="مثال: SALE20"
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          نوع الخصم
                        </label>
                        <select
                          value={offerSchedule.discountType}
                          onChange={(e) =>
                            setOfferSchedule({
                              ...offerSchedule,
                              discountType: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                        >
                          <option value="fixed_amount">مبلغ ثابت (ج.م)</option>
                          <option value="percentage">نسبة مئوية (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          قيمة الخصم
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={offerSchedule.discountValue}
                          onChange={(e) =>
                            setOfferSchedule({
                              ...offerSchedule,
                              discountValue: e.target.value,
                            })
                          }
                          placeholder="مثال: 20"
                          className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          الحد الأقصى للخصم (ج.م) <span className="text-gray-400 font-normal">(كاب)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={offerSchedule.maxDiscount || ""}
                          onChange={(e) =>
                            setOfferSchedule({
                              ...offerSchedule,
                              maxDiscount: e.target.value,
                            })
                          }
                          placeholder="مثال: 50 ج.م كحد أقصى"
                          className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                        />
                      </div>
                    </div>
                  )}

                  {/* تفاصيل الخيار 2: خصم على أصناف معينة */}
                  {discountStrategy === "selected_items" && (
                    <div className="p-3.5 bg-white rounded-2xl border border-teal-200 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            نوع الخصم للأصناف المختارة
                          </label>
                          <select
                            value={itemDiscountType}
                            onChange={(e) => setItemDiscountType(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          >
                            <option value="percentage">نسبة مئوية (%)</option>
                            <option value="fixed_amount">مبلغ ثابت (ج.م)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            قيمة الخصم على الصنف
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={itemDiscountValue}
                            onChange={(e) => setItemDiscountValue(e.target.value)}
                            placeholder={itemDiscountType === "percentage" ? "مثال: 20%" : "مثال: 15 ج.م"}
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            الحد الأقصى للخصم (ج.م) <span className="text-gray-400 font-normal">(كاب)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={offerSchedule.maxDiscount || ""}
                            onChange={(e) =>
                              setOfferSchedule({
                                ...offerSchedule,
                                maxDiscount: e.target.value,
                              })
                            }
                            placeholder="مثال: 40 ج.م"
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>
                      </div>

                      {/* حقل اختيار وبحث الأصناف */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-gray-900">
                            اختر الأصناف التي ينطبق عليها العرض ({selectedOfferItemIds.length} محددة):
                          </label>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setSelectedOfferItemIds(products.map((p) => p.id))}
                              className="text-[#0D5C58] hover:underline font-bold"
                            >
                              تحديد الكل
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedOfferItemIds([])}
                              className="text-red-600 hover:underline font-bold"
                            >
                              إلغاء التحديد
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            placeholder="ابحث عن صنف لاختياره..."
                            className="w-full pl-3 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        </div>

                        {/* قائمة الأصناف للاختيار */}
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl p-2 bg-gray-50/50 space-y-1">
                          {products
                            .filter((p) =>
                              itemSearchTerm
                                ? p.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                                  p.category?.toLowerCase().includes(itemSearchTerm.toLowerCase())
                                : true
                            )
                            .map((p) => {
                              const isChecked = selectedOfferItemIds.includes(p.id);
                              const origPrice = Number(p.price) || 0;
                              const discVal = Number(itemDiscountValue) || 0;
                              const afterPrice =
                                itemDiscountType === "percentage"
                                    ? Math.max(0, Math.round(origPrice * (1 - discVal / 100)))
                                    : Math.max(0, origPrice - discVal);

                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                    isChecked ? "bg-white shadow-2xs border border-teal-200" : "hover:bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedOfferItemIds((prev) => [...prev, p.id]);
                                        } else {
                                          setSelectedOfferItemIds((prev) =>
                                            prev.filter((id) => id !== p.id)
                                          );
                                        }
                                      }}
                                      className="accent-[#0D5C58] w-4 h-4 rounded"
                                    />
                                    <div>
                                      <div className="text-xs font-bold text-gray-900">{p.name}</div>
                                      <div className="text-[10px] text-gray-400">
                                        {p.category || "وجبات"} • السعر الأصلي: {origPrice} ج.م
                                      </div>
                                    </div>
                                  </div>

                                  {isChecked && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <span className="text-[10px] text-gray-400 line-through">
                                        {origPrice} ج.م
                                      </span>
                                      <span className="font-black text-[#0D5C58] bg-[#E6F4F1] px-1.5 py-0.5 rounded">
                                        {afterPrice} ج.م
                                      </span>
                                      <span className="text-[10px] text-red-600 font-bold">
                                        ({itemDiscountType === "percentage" ? `-${discVal}%` : `-${discVal} ج.م`})
                                      </span>
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* تفاصيل الخيار 3: خصم على كامل المنيو */}
                  {discountStrategy === "full_menu" && (
                    <div className="p-3.5 bg-white rounded-2xl border border-teal-200 space-y-2 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            نسبة الخصم على كامل المنيو (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={menuDiscountPercent}
                            onChange={(e) => setMenuDiscountPercent(e.target.value)}
                            placeholder="مثال: 15"
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            الحد الأقصى للخصم (ج.م) <span className="text-gray-400 font-normal">(كاب)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={offerSchedule.maxDiscount || ""}
                            onChange={(e) =>
                              setOfferSchedule({
                                ...offerSchedule,
                                maxDiscount: e.target.value,
                              })
                            }
                            placeholder="مثال: 60 ج.م كحد أقصى"
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>
                        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl leading-relaxed">
                          <i className="fa-solid fa-circle-check text-emerald-600 ml-1"></i>
                          سيتم شطب السعر وعرض الخصم {menuDiscountPercent || 0}% لجميع أصناف المتجر تلقائياً!
                        </div>
                      </div>
                    </div>
                  )}

                  {/* تفاصيل الخيار 4: خصم التوصيل المشروط */}
                  {discountStrategy === "delivery_discount" && (
                    <div className="p-3.5 bg-white rounded-2xl border border-teal-200 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            طريقة الخصم على التوصيل
                          </label>
                          <select
                            value={offerSchedule.deliveryDiscountType || "free"}
                            onChange={(e) =>
                              setOfferSchedule({
                                ...offerSchedule,
                                deliveryDiscountType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          >
                            <option value="free">توصيل مجاني بالكامل (0 ج.م)</option>
                            <option value="fixed">خصم مبلغ محدد من التوصيل</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 mb-1">
                            الحد الأدنى لقيمة الطلب لتفعيل الخصم (ج.م) <span className="text-red-500 font-black">* إلزامي</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={offerSchedule.deliveryMinOrder || ""}
                            onChange={(e) =>
                              setOfferSchedule({
                                ...offerSchedule,
                                deliveryMinOrder: e.target.value,
                              })
                            }
                            placeholder="مثال: 150 ج.م"
                            className="w-full px-3 py-2 text-xs font-bold bg-amber-50/50 border border-amber-300 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                          />
                        </div>

                        {offerSchedule.deliveryDiscountType === "fixed" ? (
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              قيمة الخصم من رسوم التوصيل (ج.م)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={offerSchedule.deliveryDiscountValue || ""}
                              onChange={(e) =>
                                setOfferSchedule({
                                  ...offerSchedule,
                                  deliveryDiscountValue: e.target.value,
                                })
                              }
                              placeholder="مثال: 10 ج.م"
                              className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              الحد الأقصى للخصم (ج.م) <span className="text-gray-400 font-normal">(كاب اختياري)</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={offerSchedule.maxDiscount || ""}
                              onChange={(e) =>
                                setOfferSchedule({
                                  ...offerSchedule,
                                  maxDiscount: e.target.value,
                                })
                              }
                              placeholder="مثال: 30 ج.م"
                              className="w-full px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 p-2.5 rounded-xl leading-relaxed">
                        <i className="fa-solid fa-circle-info text-[#0D5C58] ml-1"></i>
                        <span>
                          شرط التطبيق: لن يستفيد العميل من الخصم أو التوصيل المجاني إلا إذا وصل إجمالي سلة المشتريات إلى {offerSchedule.deliveryMinOrder || 0} ج.م فأكثر. إذا كانت السلة أقل، سيتم تطبيق رسوم التوصيل المعتادة للمحل تلقائياً.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Duration Presets (يقف بعد قد إيه) */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-gray-800">
                    تحديد سريع — يقف العرض بعد قد إيه؟
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { label: "بعد ساعتين", hours: 2 },
                      { label: "بعد 6 ساعات", hours: 6 },
                      { label: "بعد 12 ساعة", hours: 12 },
                      { label: "بعد يوم (24 ساعة)", hours: 24 },
                      { label: "بعد 3 أيام", hours: 72 },
                      { label: "بعد أسبوع (7 أيام)", hours: 168 },
                    ].map((preset) => (
                      <button
                        key={preset.hours}
                        type="button"
                        onClick={() => applyQuickDuration(preset.hours)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#0D5C58] hover:text-white text-[#0D5C58] border border-teal-300 text-[11px] font-bold transition-all shadow-2xs active:scale-95"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Explicit Day, Month, Hour, Minute, AM/PM Selectors */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      يوم الانتهاء
                    </label>
                    <select
                      value={offerSchedule.day}
                      onChange={(e) =>
                        updateOfferSchedulePart({ day: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          يوم {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      شهر الانتهاء
                    </label>
                    <select
                      value={offerSchedule.month}
                      onChange={(e) =>
                        updateOfferSchedulePart({ month: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      {ARABIC_MONTHS.map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {mName} ({idx + 1})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      الساعة كام؟
                    </label>
                    <select
                      value={offerSchedule.hour12}
                      onChange={(e) =>
                        updateOfferSchedulePart({ hour12: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          الساعة {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      الدقيقة
                    </label>
                    <select
                      value={offerSchedule.minute}
                      onChange={(e) =>
                        updateOfferSchedulePart({ minute: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      {[0, 15, 30, 45, 59].map((min) => (
                        <option key={min} value={min}>
                          :{String(min).padStart(2, "0")} دقيقة
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      صباحاً / مساءً
                    </label>
                    <select
                      value={offerSchedule.period}
                      onChange={(e) =>
                        updateOfferSchedulePart({ period: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-teal-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                    >
                      <option value="AM">صباحاً (ص)</option>
                      <option value="PM">مساءً (م)</option>
                    </select>
                  </div>
                </div>

                {/* Live Countdown Preview inside Form */}
                <div className="p-3.5 rounded-2xl bg-white border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-bold text-gray-700">
                    معاينة عداد العرض الذي سيظهر للعملاء:
                  </div>
                  <OfferCountdown endsAt={offerSchedule.endsAt} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  وقت التوصيل التقديري
                </label>
                <input
                  type="text"
                  value={storeForm.deliveryTime}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, deliveryTime: e.target.value })
                  }
                  placeholder="٢٥-٣٥ دقيقة"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              {/* بطاقة تفعيل عرض التوصيل المجاني للعملاء */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-linear-to-l from-emerald-50 via-teal-50 to-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                    <i className="fa-solid fa-gift"></i>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-gray-900 flex items-center gap-2">
                      <span>عرض التوصيل المجاني (0 ج.م)</span>
                      {storeForm.isFreeDelivery && (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <i className="fa-solid fa-check text-[9px]"></i>
                          <span>مفعل الآن كعرض</span>
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      عند تفعيل هذا الخيار تصبح رسوم التوصيل 0 ج.م تلقائياً ويظهر للعملاء في الكروت وصفحة المنيو والسلة شارة «توصيل مجاني (عرض)».
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextFree = !storeForm.isFreeDelivery;
                    const prevFee =
                      Number(storeForm.deliveryFee) > 0
                        ? Number(storeForm.deliveryFee)
                        : Number(storeForm.previousDeliveryFee) || 15;
                    setStoreForm({
                      ...storeForm,
                      isFreeDelivery: nextFree,
                      deliveryFee: nextFree ? 0 : prevFee,
                      previousDeliveryFee: prevFee,
                      offerBadge: nextFree
                        ? "توصيل مجاني"
                        : storeForm.offerBadge === "توصيل مجاني"
                        ? "عرض خاص"
                        : storeForm.offerBadge,
                      offerText: nextFree
                        ? storeForm.offerText ||
                          "عرض خاص: توصيل مجاني على جميع الطلبات!"
                        : "",
                    });
                    if (nextFree) {
                      setOfferSchedule((prev) => ({
                        ...prev,
                        discountType: "free_delivery",
                        discountValue: 0,
                      }));
                    } else {
                      if (discountStrategy === "delivery_discount") {
                        setDiscountStrategy("coupon");
                      }
                      setOfferSchedule((prev) => ({
                        ...prev,
                        discountType: "percentage",
                        deliveryDiscountType: "fixed",
                      }));
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                    storeForm.isFreeDelivery
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      storeForm.isFreeDelivery
                        ? "fa-toggle-on text-emerald-300"
                        : "fa-toggle-off text-gray-400"
                    } text-base`}
                  ></i>
                  <span>
                    {storeForm.isFreeDelivery
                      ? "التوصيل المجاني مفعل (0 ج.م)"
                      : "تفعيل التوصيل المجاني"}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رسوم التوصيل (ج.م)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    disabled={storeForm.isFreeDelivery}
                    value={storeForm.deliveryFee}
                    onChange={(e) =>
                      setStoreForm({ ...storeForm, deliveryFee: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none focus:border-[#0D5C58] ${
                      storeForm.isFreeDelivery
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-800 font-black cursor-not-allowed"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  />
                  {storeForm.isFreeDelivery && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      مجاناً (عرض نشط)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الحد الأدنى للطلب (ج.م)
                </label>
                <input
                  type="number"
                  value={storeForm.minOrderAmount}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, minOrderAmount: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم هاتف المحل للطلبات
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={storeForm.phone}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, phone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-right"
                />
              </div>
            </div>

            {storeSaveToast && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>{storeSaveToast}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSaveStoreDetails}
                disabled={savingStore}
                className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk text-xs"></i>
                <span>{savingStore ? "جاري الحفظ..." : "حفظ التغييرات وتفعيل عداد العرض"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditingStore(false);
                  setActiveTab("orders");
                }}
                className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Request Top Swiper Banner Ad (موافقة الإدارة بعد الدفع) */}
      {activeTab === "ad_request" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6 max-w-3xl">
          <div className="pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm shadow-xs">
                <i className="fa-solid fa-bullhorn"></i>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                طلب نشر إعلان مميز في الشريط العلوي للمنصة (سلايدر الموقع العام)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              يظهر هذا الإعلان في أعلى شاشة الموقع لجميع الزوار. يخضع الإعلان لمراجعة وقبول الإدارة بعد استلام الرسوم (200 ج.م / أسبوع).
            </p>
          </div>

          {adSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <i className="fa-solid fa-circle-check shrink-0"></i>
              <span>{adSuccessMsg}</span>
            </div>
          )}

          {/* New Ad Request Form */}
          <form onSubmit={handleSubmitAdRequest} className="space-y-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <span className="text-xs font-black text-gray-900 block">
              تقديم طلب إعلان جديد:
            </span>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                نص الإعلان الترويجي المقترح <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={adForm.text}
                onChange={(e) => setAdForm({ ...adForm, text: e.target.value })}
                placeholder="مثال: خصم 20% على جميع الوجبات العائلية طوال عطلة نهاية الأسبوع!"
                className="w-full px-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-gray-800 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عنوان الشارة (Badge)
                </label>
                <input
                  type="text"
                  value={adForm.badgeText}
                  onChange={(e) => setAdForm({ ...adForm, badgeText: e.target.value })}
                  placeholder="مثال: عرض مميز أو طازة اليوم"
                  className="w-full px-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["عرض مميز", "خصم 20%", "طازة اليوم", "حصري لأهالينا", "لفترة محدودة"].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setAdForm({ ...adForm, badgeText: b })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-[#0D5C58] text-gray-700 hover:text-[#0D5C58] transition-all"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رسوم الإعلان المقررة
                </label>
                <div className="px-4 py-2 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-bold">
                  200 ج.م (تُسدد لإدارة المنصة عبر فودافون كاش أو إنستاباي)
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAd}
              className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
              <span>{submittingAd ? "جاري الإرسال..." : "إرسال طلب الإعلان لإدارة المنصة"}</span>
            </button>
          </form>

          {/* Previous Ad Requests Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-gray-900">سجل طلبات الإعلانات الخاصة بمتجرك:</h4>
            {adRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                لا توجد طلبات إعلانات سابقة. قدم طلبك الآن ليصل مطعمك لآلاف العملاء!
              </div>
            ) : (
              <div className="space-y-2">
                {adRequests.map((req) => {
                  const isEditing = editingMerchantAdId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      {isEditing ? (
                        <div className="w-full space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">شارة الإعلان</label>
                              <input
                                type="text"
                                value={editMerchantAdForm.badgeText}
                                onChange={(e) => setEditMerchantAdForm({ ...editMerchantAdForm, badgeText: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs border border-amber-400 rounded-xl focus:outline-none"
                              />
                              <div className="flex flex-wrap gap-1 mt-1">
                                {["عرض مميز", "خصم 20%", "طازة اليوم", "حصري"].map((b) => (
                                  <button
                                    key={b}
                                    type="button"
                                    onClick={() => setEditMerchantAdForm({ ...editMerchantAdForm, badgeText: b })}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-amber-100 text-gray-700"
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">نص الإعلان</label>
                              <input
                                type="text"
                                value={editMerchantAdForm.text}
                                onChange={(e) => setEditMerchantAdForm({ ...editMerchantAdForm, text: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs border border-[#0D5C58] rounded-xl focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditMerchantAd(req.id)}
                              className="px-4 py-1.5 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white text-xs font-bold transition-all"
                            >
                              حفظ التعديلات
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMerchantAdId(null)}
                              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                                {req.badgeText}
                              </span>
                              <span className="text-xs font-bold text-gray-900">{req.text}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 block">
                              تاريخ الطلب: {req.submittedAt || "حديثاً"} • الرسوم: 200 ج.م
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMerchantAdId(req.id);
                                setEditMerchantAdForm({ text: req.text, badgeText: req.badgeText || "عرض مميز" });
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-all"
                              title="تعديل شارة الإعلان ونصه"
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                              <span>تعديل الشارة</span>
                            </button>

                            {req.status === "approved" ? (
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-check text-xs"></i>
                                <span>معتمد ومنشور بالشريط العلوي</span>
                              </span>
                            ) : req.status === "rejected" ? (
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-xmark text-xs"></i>
                                <span>تم الرفض لعدم سداد الرسوم</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-clock text-xs"></i>
                                <span>قيد مراجعة الإدارة وسداد الرسوم</span>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Security & Credentials Update */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6 max-w-2xl">
          <div className="pb-3 border-b border-gray-100">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-lock text-[#0D5C58]"></i>
              <span>تغيير اسم المستخدم وكلمة المرور الخاصة بمتجرك</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              استخدم هذه الصفحة لتغيير كلمة المرور المؤقتة التي استلمتها من إدارة المنصة لحماية حسابك
            </p>
          </div>

          {credMsg.text && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 border ${
                credMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              <i
                className={`fa-solid ${
                  credMsg.type === "success" ? "fa-circle-check" : "fa-triangle-exclamation"
                } text-sm`}
              ></i>
              <span>{credMsg.text}</span>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">المتجر الحالي:</span>
              <span className="font-black text-gray-900">{store?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">اسم المستخدم الحالي:</span>
              <span className="font-mono font-bold text-[#0D5C58]" dir="ltr">
                {user?.username || store?.slug}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                كلمة المرور الحالية <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={credForm.currentPassword}
                onChange={(e) =>
                  setCredForm({ ...credForm, currentPassword: e.target.value })
                }
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المستخدم الجديد (اتركه فارغاً إذا كنت لا تريد تغييره)
              </label>
              <input
                type="text"
                value={credForm.newUsername}
                onChange={(e) =>
                  setCredForm({ ...credForm, newUsername: e.target.value })
                }
                placeholder="مثال: haj_sayed_2026"
                dir="ltr"
                className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-gray-800 text-right font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={credForm.newPassword}
                  onChange={(e) =>
                    setCredForm({ ...credForm, newPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={credForm.confirmPassword}
                  onChange={(e) =>
                    setCredForm({ ...credForm, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0D5C58] text-gray-800"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingCred}
                className="px-6 py-2.5 rounded-full bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fa-solid fa-key text-xs"></i>
                <span>{savingCred ? "جاري التحديث..." : "حفظ بيانات الدخول الجديدة"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Customer Reviews Management */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-star text-amber-500"></i>
                <span>تقييمات وآراء العملاء لمطعم {store?.name}</span>
                <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                  {reviews.length} تقييم
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                متابعة انطباعات العملاء وجودة الوجبات وتقديم بلاغات عند وجود تقييمات مسيئة
              </p>
            </div>
          </div>

          {/* Review Stats Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-gray-50/80 border border-gray-100">
            {/* Average Rating Block */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-white rounded-xl border border-gray-100 shadow-2xs">
              <span className="text-4xl font-black text-gray-900">{averageRating || "—"}</span>
              <div className="flex items-center gap-1 text-amber-400 text-sm my-1.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={
                      averageRating && star <= Math.round(Number(averageRating))
                        ? "fa-solid fa-star"
                        : "fa-regular fa-star text-gray-300"
                    }
                  ></i>
                ))}
              </div>
              <span className="text-xs text-gray-500 font-bold">
                متوسط التقييم العام من {totalReviewsCount} عميل
              </span>
            </div>

            {/* Star Distribution Progress Bars */}
            <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingCounts[stars] || 0;
                const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-gray-600 font-bold flex items-center gap-1 shrink-0">
                      <span>{stars}</span>
                      <i className="fa-solid fa-star text-[10px] text-amber-400"></i>
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-14 text-gray-400 text-[11px] font-mono text-left shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-gray-700">جميع مراجعات العملاء</h4>
            {reviewsLoading ? (
              <div className="p-8 text-center text-xs text-teal-800 font-bold">
                <i className="fa-solid fa-spinner animate-spin text-sm ml-2"></i>
                جاري تحميل تقييمات العملاء...
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs">
                لا توجد تقييمات أو تعليقات مسجلة لهذا المتجر حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E6F4F1] text-[#0D5C58] font-bold text-xs flex items-center justify-center">
                          {rev.userName ? rev.userName[0] : "ع"}
                        </div>
                        <div>
                          <span className="text-xs font-black text-gray-900 block">
                            {rev.userName || "عميل أطلب"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {rev.createdAt
                              ? new Date(rev.createdAt).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "مؤخراً"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-amber-400 text-xs" dir="ltr">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <i
                              key={s}
                              className={
                                s <= rev.rating
                                  ? "fa-solid fa-star"
                                  : "fa-regular fa-star text-gray-300"
                              }
                            ></i>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setReportingReviewId(rev.id);
                            setReportReason("");
                          }}
                          className="text-[11px] text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
                          title="الإبلاغ عن تقييم غير لائق"
                        >
                          <i className="fa-regular fa-flag text-[10px]"></i>
                          <span className="hidden sm:inline">إبلاغ</span>
                        </button>
                      </div>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-gray-700 bg-gray-50/60 p-3 rounded-xl border border-gray-100/60 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Review Modal */}
          {reportingReviewId && (
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setReportingReviewId(null)}
            >
              <div
                className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-flag text-red-500"></i>
                    <span>إرسال بلاغ عن تقييم للإدارة</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReportingReviewId(null)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <p className="text-xs text-gray-600">
                  يرجى توضيح سبب الاعتراض على هذا التقييم (مثلاً: إساءة لفظية، أو تقييم كيدي لا يتعلق بالطلب) لمراجعته من قبل إدارة المنصة:
                </p>

                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="اكتب سبب البلاغ بالتفصيل..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#0D5C58] resize-none"
                ></textarea>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingReviewId(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={submittingReport || !reportReason.trim()}
                    onClick={async () => {
                      if (!reportReason.trim()) return;
                      setSubmittingReport(true);
                      try {
                        await reviewsService.createReviewReport({
                          reviewId: reportingReviewId,
                          reason: reportReason.trim(),
                        });
                        alert("تم إرسال البلاغ بنجاح للإدارة وسيقوم فريق الدعم بمراجعته.");
                        setReportingReviewId(null);
                        setReportReason("");
                      } catch (err) {
                        alert(err?.message || "حدث خطأ أثناء إرسال البلاغ.");
                      } finally {
                        setSubmittingReport(false);
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    {submittingReport ? (
                      <span>جاري الإرسال...</span>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                        <span>إرسال البلاغ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Financial Reports & Earnings */}
      {activeTab === "finance" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 space-y-6">
          <div className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-money-bill-wave text-[#0D5C58]"></i>
                <span>المستحقات والتقارير المالية للمتجر</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                متابعة إجمالي المبيعات، نسبة عمولة المنصة، وصافي أرباح المتجر مع إمكانية التصفية الشهرية
              </p>
            </div>

            {/* Monthly Filter (YYYY-MM) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">الفترة المالية:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:outline-none focus:border-[#0D5C58]"
              >
                <option value="all">كافة الشهور (إجمالي تراكمي)</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    شهر {ym}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
              <span className="text-xs text-gray-500 font-bold block">
                إجمالي المبيعات المحققة
              </span>
              <span className="text-2xl font-black text-teal-950 block">
                {totalSales} ج.م
              </span>
              <span className="text-[11px] text-gray-400 block">
                من إجمالي {orders.length} طلبات
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1.5">
              <span className="text-xs text-amber-900 font-bold block">
                عمولة المنصة ({store?.commissionRate || 5}%)
              </span>
              <span className="text-2xl font-black text-amber-700 block">
                {((totalSales * (store?.commissionRate || 5)) / 100).toFixed(2)} ج.م
              </span>
              <span className="text-[11px] text-amber-700/80 block">
                نسبة التشغيل والدعم الفني
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
              <span className="text-xs text-emerald-800 font-bold block">
                صافي أرباح المتجر
              </span>
              <span className="text-2xl font-black text-emerald-950 block">
                {(
                  totalSales -
                  (totalSales * (store?.commissionRate || 5)) / 100
                ).toFixed(2)}{" "}
                ج.م
              </span>
              <span className="text-[11px] text-emerald-700 block">
                بعد خصم عمولة المنصة
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
