"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import ProductCard from "@/components/common/ProductCard";
import { useCartStore } from "@/store/useCartStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { storesService, normalizeStore } from "@/services/stores.service";
import { productsService } from "@/services/products.service";
import { reviewsService } from "@/services/reviews.service";
import { adminService } from "@/services/admin.service";
import OfferCountdown, { isOfferExpired } from "@/components/home/offers/OfferCountdown";

const FALLBACK_STORE = {
  id: "",
  name: "المتجر",
  description: "طعم مصري، أصيل • باسوس والقليوبية",
  rating: 4.8,
  reviewsCount: 128,
  deliveryTime: "٢٥-٣٥ دقيقة",
  deliveryFee: 10,
  minOrderAmount: 50,
  isOpen: true,
  category: "أكلات سريعة",
  imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
};

export default function StoreDetailsPage({ params, slug: explicitSlug, initialStore = null }) {
  let resolvedParams = null;
  if (params && typeof params.then === "function") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    resolvedParams = use(params);
  } else {
    resolvedParams = params;
  }
  const slug = explicitSlug || resolvedParams?.slug || "";

  const [store, setStore] = useState(() => (initialStore ? normalizeStore(initialStore) : null));
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchMenu, setSearchMenu] = useState("");
  const [loading, setLoading] = useState(!initialStore);
  const [mounted, setMounted] = useState(false);

  // Store Reviews & Rating Modal State
  const [reviews, setReviews] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [modalRating, setModalRating] = useState(5);
  const [modalHoverRating, setModalHoverRating] = useState(0);
  const [modalComment, setModalComment] = useState("");
  const [modalAuthorName, setModalAuthorName] = useState("");
  const [isSubmittingModalReview, setIsSubmittingModalReview] = useState(false);
  const [modalReviewSuccess, setModalReviewSuccess] = useState(false);
  const [modalReviewError, setModalReviewError] = useState("");

  const {
    items,
    getSubtotal,
    getTotalAmount,
    getTotalCount,
  } = useCartStore();

  const { toggleFavoriteStore, isFavoriteStore } = useFavoritesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStoreData = async () => {
      if (!slug) return;
      if (!initialStore) setLoading(true);
      try {
        const storeRes = await storesService.getStoreBySlugOrId(slug);
        const storeData = storeRes?.store || storeRes || null;

        if (isMounted && storeData) {
          setStore(storeData);
        }

        const effectiveStoreId = storeData?.id || initialStore?.id;
        if (effectiveStoreId) {
          const prodRes = await productsService.getProducts({ storeId: effectiveStoreId });
          if (isMounted) {
            const prods = Array.isArray(prodRes?.products) ? prodRes.products : [];
            setProducts(prods);
          }
        }
      } catch {
        // Fallback to initial state
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStoreData();
    return () => {
      isMounted = false;
    };
  }, [slug, initialStore]);

  const activeStore = store || FALLBACK_STORE;
  const isFav =
    mounted &&
    (isFavoriteStore(activeStore.id) || isFavoriteStore(activeStore.slug));

  // جلب العرض النشط المعتمد للمتجر
  const activeOffer = useMemo(() => {
    const candidate =
      activeStore?.effectiveActiveOffer ||
      activeStore?.activeOffer ||
      (Array.isArray(activeStore?.activeOffers) && activeStore.activeOffers[0]) ||
      null;

    if (candidate && !isOfferExpired(candidate.endsAt)) {
      return candidate;
    }
    return null;
  }, [activeStore]);

  // التحقق مما إذا كان المتجر يقدم عرض توصيل مجاني نشط (رسوم التوصيل 0 ج.م)
  const isFreeDelivery = Boolean(
    activeStore.hasFreeDeliveryOffer ||
    activeStore.isFreeDelivery ||
    activeOffer?.discountType === "free_delivery"
  );
  const effectiveDeliveryFee =
    isFreeDelivery || Number(activeStore.deliveryFee) === 0
      ? 0
      : Number(activeStore.deliveryFee || 10);

  const hasActiveStoreOffer = Boolean(
    (activeOffer && !isOfferExpired(activeOffer.endsAt)) ||
    (activeStore.hasOffer && activeStore.offerText && !isOfferExpired(activeStore.offerEndsAt))
  );

  // تطبيق الخصم على مستوى الصنف (Item-Level Discounts) لجميع أصناف المنيو
  const enrichedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.map((prod) => {
      // 1. إذا كان الصنف مخصصاً له خصم فردي خاص به
      if (prod.discountValue && Number(prod.discountValue) > 0) {
        const rawPrice = Number(prod.originalPrice || prod.price) || 0;
        const dType = prod.discountType === "percentage" ? "percentage" : "fixed";
        const dVal = Number(prod.discountValue);
        let effPrice = Number(prod.price) || 0;
        if (!prod.originalPrice) {
          effPrice =
            dType === "percentage"
              ? Math.max(0, Math.round(rawPrice * (1 - dVal / 100)))
              : Math.max(0, rawPrice - dVal);
        }
        return {
          ...prod,
          deliveryFee: effectiveDeliveryFee,
          originalPrice: rawPrice > effPrice ? rawPrice : null,
          price: effPrice,
          unitPrice: effPrice,
          discountValue: dVal,
          discountType: dType,
          discountBadge:
            prod.discountBadge ||
            (dType === "percentage" ? `خصم ${dVal}%` : `خصم ${dVal} ج.م`),
        };
      }

      // 2. إذا كان هناك عرض متجر يطبق على أصناف معينة فقط (Specific Items)
      const isSpecificOffer =
        activeOffer &&
        Number(activeOffer.discountValue) > 0 &&
        (activeOffer.appliesTo === "specific" ||
          activeOffer.appliesTo === "selected_items" ||
          activeOffer.applies_to === "specific");

      const isProductInOffer =
        isSpecificOffer &&
        Array.isArray(activeOffer.productIds || activeOffer.product_ids) &&
        (activeOffer.productIds || activeOffer.product_ids).some(
          (id) => String(id) === String(prod.id)
        );

      if (isProductInOffer) {
        const rawPrice = Number(prod.price) || 0;
        const dType =
          activeOffer.discountType === "percentage" ? "percentage" : "fixed";
        const dVal = Number(activeOffer.discountValue);
        const effPrice =
          dType === "percentage"
            ? Math.max(0, Math.round(rawPrice * (1 - dVal / 100)))
            : Math.max(0, rawPrice - dVal);

        return {
          ...prod,
          deliveryFee: effectiveDeliveryFee,
          originalPrice: rawPrice,
          price: effPrice,
          unitPrice: effPrice,
          discountValue: dVal,
          discountType: dType,
          discountBadge:
            dType === "percentage" ? `خصم ${dVal}%` : `خصم ${dVal} ج.م`,
        };
      }

      return {
        ...prod,
        deliveryFee: effectiveDeliveryFee,
      };
    });
  }, [products, activeOffer, effectiveDeliveryFee]);

  // Dynamic store menu categories derived from its actual products
  const storeCategories = useMemo(() => {
    const cats = new Set();
    enrichedProducts.forEach((p) => {
      if (p.category && p.category !== "الأكثر طلباً") {
        cats.add(p.category);
      }
    });
    return Array.from(cats);
  }, [enrichedProducts]);

  // Menu tabs: الكل + الأكثر طلباً (if any) + actual store categories + reviews
  const menuTabs = useMemo(() => {
    const list = [{ id: "all", label: "الكل" }];
    const hasPopular = enrichedProducts.some((p) => p.isPopular);
    if (hasPopular) {
      list.push({ id: "popular", label: "الأكثر طلباً" });
    }
    storeCategories.forEach((cat) => {
      list.push({ id: cat, label: cat });
    });
    list.push({
      id: "reviews",
      label: `آراء العملاء (${reviews.length})`,
    });
    return list;
  }, [enrichedProducts, storeCategories, reviews.length]);

  const averageStoreRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) /
          reviews.length
        ).toFixed(1)
      : (activeStore?.rating || 4.8);

  const handleStoreReviewSubmit = async (e) => {
    e.preventDefault();
    if (!activeStore?.id || !modalRating) return;
    setIsSubmittingModalReview(true);
    setModalReviewError("");
    try {
      const res = await reviewsService.createReview({
        storeId: activeStore.id,
        rating: modalRating,
        comment: modalComment.trim() || undefined,
        userName: modalAuthorName.trim() || undefined,
      });

      const newReview = res?.review || res?.data?.review || {
        id: `rev-${Date.now()}`,
        rating: modalRating,
        comment: modalComment.trim(),
        userName: modalAuthorName.trim() || "عميل أطلب",
        createdAt: new Date().toISOString(),
      };

      setReviews((prev) => [newReview, ...prev]);
      setModalReviewSuccess(true);
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setModalReviewSuccess(false);
        setModalComment("");
      }, 2500);
    } catch (err) {
      setModalReviewError(err?.message || "حدث خطأ أثناء حفظ التقييم، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmittingModalReview(false);
    }
  };

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter((p) => {
      const matchCategory =
        activeTab === "all" ||
        (activeTab === "popular" && p.isPopular) ||
        p.category === activeTab ||
        p.categorySlug === activeTab;

      const matchSearch =
        !searchMenu.trim() ||
        p.name.toLowerCase().includes(searchMenu.trim().toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchMenu.trim().toLowerCase()));

      return matchCategory && matchSearch;
    });
  }, [enrichedProducts, activeTab, searchMenu]);

  // Separate sections: Most popular & Desserts (حاجة حلوة)
  const popularDishes = useMemo(() => {
    return enrichedProducts.filter((p) => p.isPopular && !p.isDessert);
  }, [enrichedProducts]);

  const dessertProducts = useMemo(() => {
    return enrichedProducts.filter((p) => p.isDessert || p.category === "حاجة حلوة");
  }, [enrichedProducts]);

  // Cart summary calculations — STRICT ZEROES WHEN CART IS EMPTY
  const rawCount = mounted ? getTotalCount() : 0;
  const rawSubtotal = mounted ? getSubtotal() : 0;
  const cartCount = rawCount;
  const cartSubtotal = rawCount > 0 ? rawSubtotal : 0;

  // فحص استحقاق التوصيل المجاني بدقة بناءً على الحد الأدنى للعرض
  const meetsFreeDelivery = Boolean(
    isFreeDelivery &&
    (!activeOffer?.minOrder || cartSubtotal >= Number(activeOffer.minOrder))
  );
  const deliveryFee = rawCount > 0 ? (meetsFreeDelivery ? 0 : Number(activeStore.deliveryFee || 15)) : 0;

  // حساب الخصم الفعلي من العرض النشط إن وجد وفق الحدود والمدد المعتمدة وسقف الخصم (max_discount)
  const discount = useMemo(() => {
    if (rawCount === 0 || !activeOffer) return 0;
    if (activeOffer.discountType === "free_delivery") return 0;

    const minOrd = Number(activeOffer.minOrder || activeOffer.min_order || 0);
    if (minOrd > 0 && cartSubtotal < minOrd) return 0;

    let d = 0;
    if (activeOffer.discountType === "percentage") {
      d = Math.round((cartSubtotal * Number(activeOffer.discountValue || 0)) / 100);
    } else {
      d = Number(activeOffer.discountValue || 0);
    }
    const cap = Number(activeOffer.maxDiscount ?? activeOffer.max_discount ?? 0);
    if (cap > 0) {
      d = Math.min(d, cap);
    }
    return Math.min(cartSubtotal, d);
  }, [rawCount, activeOffer, cartSubtotal]);

  const cartTotal = rawCount > 0 ? Math.max(0, cartSubtotal + deliveryFee - discount) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/stores" className="hover:text-gray-600 transition-colors">
          المتاجر
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-bold">{activeStore.name}</span>
      </div>

      {/* Store Hero Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center shadow-xs relative overflow-hidden">
        {/* Right Info */}
        <div className="space-y-3 sm:space-y-4 text-right order-2 lg:order-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                activeStore.isOpen !== false
                  ? "bg-[#E6F4F1] text-[#0D5C58]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {activeStore.isOpen !== false ? "مفتوح للطلب" : "مغلق مؤقتاً"}
            </span>

            <div className="bg-[#E6F4F1] text-[#0D5C58] text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
              <i className="fa-solid fa-star text-amber-500 text-[10px]"></i>
              <span>{activeStore.rating || 4.8}</span>
              <span className="text-[10px] text-gray-400 font-normal">
                ({activeStore.reviewsCount || 128} تقييم)
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
            {activeStore.name}
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-lg">
            {activeStore.description || "طعم مصري، أصيل • كفر الندى"}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <i className="fa-regular fa-clock text-gray-400"></i>
              <span>{activeStore.deliveryTime || "٢٥-٣٥ دقيقة"}</span>
            </span>
            <span>•</span>
            {isFreeDelivery ? (
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <i className="fa-solid fa-gift text-xs"></i>
                <span>توصيل مجاني (عرض)</span>
              </span>
            ) : (
              <span>توصيل {effectiveDeliveryFee} ج.م</span>
            )}
            <span>•</span>
            <span>حد أدنى {activeStore.minOrderAmount || 50} ج.م</span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => toggleFavoriteStore(activeStore)}
              className={`px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
                isFav
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <i
                className={`text-sm ${
                  isFav ? "fa-solid fa-heart text-red-500" : "fa-regular fa-heart"
                }`}
              ></i>
              <span>{isFav ? "في المفضلة" : "حفظ في المفضلة"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("تم نسخ رابط المتجر بنجاح!");
                }
              }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-share-nodes text-xs"></i>
              <span>مشاركة</span>
            </button>
          </div>
        </div>

        {/* Left Photo with Mobile Floating Favorite Heart */}
        <div className="order-1 lg:order-2 flex justify-center relative">
          <div className="w-full max-w-md aspect-4/3 rounded-2xl overflow-hidden shadow-sm relative">
            <img
              src={
                activeStore.bannerUrl ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
              }
              alt={activeStore.name}
              className="w-full h-full object-cover"
            />

            {/* Mobile prominent heart button on cover image */}
            <button
              type="button"
              onClick={() => toggleFavoriteStore(activeStore)}
              className="lg:hidden absolute top-3 left-3 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center active:scale-90 transition-transform z-10"
              aria-label="إضافة للمفضلة"
            >
              <i
                className={`text-base ${
                  isFav ? "fa-solid fa-heart text-red-500" : "fa-regular fa-heart text-gray-700"
                }`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      {/* Store Offer Banner (Shows restaurant offer or platform targeted store offer) */}
      {hasActiveStoreOffer && (
        <div className="bg-[#E6F4F1] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-teal-200 text-[#0D5C58] text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D5C58] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
              <i className="fa-solid fa-ticket-simple text-base"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-[#0D5C58]">
                  عرض خاص من {activeStore.name}:
                </span>
                {activeOffer?.code && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(activeOffer.code);
                        alert(`تم نسخ كود الخصم: ${activeOffer.code}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-white hover:bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-md font-mono font-bold text-[#0D5C58] cursor-pointer transition-colors active:scale-95"
                    title="اضغط لنسخ الكود"
                  >
                    <i className="fa-regular fa-copy text-[10px]"></i>
                    <span>كود: {activeOffer.code}</span>
                  </button>
                )}
                {activeOffer?.discountValue && (
                  <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[11px] font-black">
                    {activeOffer.discountType === "percentage"
                      ? `خصم ${activeOffer.discountValue}%`
                      : `خصم ${activeOffer.discountValue} ج.م`}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-xs mt-0.5">
                {activeOffer?.title || activeStore.offerText}
                {activeOffer?.minOrder ? ` (للطلبات التي تزيد عن ${activeOffer.minOrder} ج.م)` : ""}
                {activeOffer?.maxDiscount ? ` • سقف الخصم ${activeOffer.maxDiscount} ج.م` : ""}
              </p>
            </div>
          </div>

          {activeOffer?.endsAt && (
            <div className="shrink-0 self-start sm:self-auto">
              <OfferCountdown endsAt={activeOffer.endsAt} variant="compact" />
            </div>
          )}
        </div>
      )}

      {/* Main Content Layout (Menu & Cart Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
        {/* Menu Area (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search inside menu */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              دور في منيو {activeStore.name}
            </label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
                placeholder="ابحث عن أكلة، وجبة، أو إضافة..."
                className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-[#0D5C58] shadow-xs"
              />
              {searchMenu && (
                <button
                  type="button"
                  onClick={() => setSearchMenu("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* Menu Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {menuTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  activeTab === tab.id
                    ? "bg-[#0D5C58] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Menu Items Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                {activeTab === "all"
                  ? "قائمة الوجبات"
                  : activeTab === "popular"
                  ? "الأصناف الأكثر طلباً"
                  : activeTab}
              </h3>
              <span className="text-xs text-gray-400">
                ({filteredProducts.length} صنف)
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs font-bold text-[#0D5C58]">
                جاري تحميل المنيو...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-gray-100 text-gray-400 space-y-1">
                <i className="fa-solid fa-utensils text-2xl text-gray-300"></i>
                <p className="text-xs font-bold text-gray-600">
                  لا توجد أصناف مطابقة في هذا القسم.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setSearchMenu("");
                  }}
                  className="text-xs text-[#0D5C58] hover:underline font-bold mt-1"
                >
                  عرض جميع الأصناف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            )}
          </div>

          {/* Section: حاجة حلوة وإضافاتها (Only if the restaurant has desserts!) */}
          {dessertProducts.length > 0 && activeTab === "all" && !searchMenu && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <i className="fa-solid fa-ice-cream text-[#0D5C58]"></i>
                  <span>حاجة حلوة وإضافاتها</span>
                </h3>
                <span className="text-xs text-[#0D5C58] font-bold bg-[#E6F4F1] px-2.5 py-0.5 rounded-full">
                  تحلية طازجة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {dessertProducts.map((prod) => (
                  <div key={prod.id} className="space-y-2">
                    <ProductCard product={prod} />

                    {/* Add-ons list if defined on the dessert */}
                    {Array.isArray(prod.addOns) && prod.addOns.length > 0 && (
                      <div className="bg-[#E6F4F1]/60 border border-teal-100 rounded-xl p-3 text-xs space-y-1.5">
                        <span className="font-bold text-[#0D5C58] block text-[11px]">
                          إضافات على مزاجك:
                        </span>
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-700">
                          {prod.addOns.map((add) => (
                            <span
                              key={add.id || add.name}
                              className="bg-white px-2 py-0.5 rounded-md border border-teal-200"
                            >
                              {add.name} {add.price > 0 ? `(+${add.price} ج.م)` : "(مجاناً)"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Cart & Delivery Info (1 Col) */}
        <div className="space-y-6">
          {/* Order Summary Box — STRICT ZEROES WHEN CART IS EMPTY */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4 shadow-xs text-right">
            <h3 className="font-black text-gray-900 text-sm">ملخص الطلب</h3>
            <p className="text-xs text-gray-400">
              {activeStore.name} •{" "}
              {cartCount > 0 ? `${cartCount} أصناف` : "السلة فارغة"}
            </p>

            <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div className="flex justify-between">
                <span>المجموع الفرعي</span>
                <span className="font-bold">
                  {cartCount > 0 ? `${cartSubtotal} ج.م` : "٠ ج.م"}
                </span>
              </div>

              <div className="flex justify-between">
                <span>رسوم التوصيل</span>
                <span className="font-bold">
                  {cartCount > 0 ? `${deliveryFee} ج.م` : "٠ ج.م"}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>خصم «ندى٢٠»</span>
                  <span>-{discount} ج.م</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="font-bold text-sm text-gray-900">الإجمالي</span>
              <span className="font-black text-lg text-[#0D5C58]">
                {cartCount > 0 ? `${cartTotal} ج.م` : "٠ ج.م"}
              </span>
            </div>

            {cartCount > 0 ? (
              <Link
                href="/checkout"
                className="w-full py-3 rounded-xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs text-center flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-98"
              >
                <span>متابعة لإتمام الطلب</span>
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs text-center cursor-not-allowed"
              >
                السلة فارغة - اختار وجبتك
              </button>
            )}

            <p className="text-[10px] text-gray-400 text-center">
              السعر شامل الرسوم • بدون أي تكاليف مخفية
            </p>
          </div>

          {/* Delivery Information Box */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-2 shadow-xs text-right">
            <h4 className="font-black text-gray-900 text-xs">معلومات التوصيل</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              كفر الندى • ميدان الساقية، شارع السوق وحي المدرسة
            </p>
            <p className="text-[11px] text-[#0D5C58] font-bold pt-1">
              متاح الدفع كاش أو بالمحفظة
            </p>
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="text-center text-[11px] text-gray-400 pt-4 pb-16 lg:pb-0">
        الأسعار بالجنيه المصري • الصور للتوضيح
      </div>

      {/* Mobile Floating Cart Button — ONLY SHOWS WHEN CART HAS ITEMS */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 z-30">
          <Link
            href="/cart"
            className="w-full py-3.5 px-5 rounded-2xl bg-[#0D5C58] hover:bg-[#0A4845] text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between transition-transform active:scale-95 border-2 border-white"
          >
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-basket-shopping text-sm"></i>
              <span>عرض السلة</span>
              <span>•</span>
              <span>{cartCount} أصناف</span>
            </div>
            <span className="font-black">{cartTotal} ج.م</span>
          </Link>
        </div>
      )}
    </div>
  );
}
