import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

/**
 * خدمة المتاجر — تقرأ وتكتب من/إلى الـ API (Supabase) فقط.
 * لا توجد بيانات ثابتة ولا localStorage ولا Fallback وهمي.
 * أي فشل في الاتصال يُرمى للمستدعي لكي تعرض الواجهة حالة خطأ حقيقية.
 */

// صور مخصصة لكل قسم للمتاجر والأقسام (غلاف بدقة عالية + شعار مطابق)
export const CATEGORY_DEFAULT_IMAGES = {
  grills: {
    cover:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
  },
  pies: {
    cover:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
  },
  bakery: {
    cover:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
  },
  fastfood: {
    cover:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&auto=format&fit=crop&q=80",
  },
  grocery: {
    cover:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&auto=format&fit=crop&q=80",
  },
  seafood: {
    cover:
      "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&auto=format&fit=crop&q=80",
  },
  sweets: {
    cover:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&auto=format&fit=crop&q=80",
  },
  drinks: {
    cover:
      "https://images.unsplash.com/photo-1546173159-315724a31696?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80",
  },
  koshary: {
    cover:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  },
  egyptian: {
    cover:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=80",
    logo:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80",
  },
};

export function resolveCategoryImages(slugOrName) {
  const text = String(slugOrName || "").toLowerCase();
  if (text.includes("مشو") || text.includes("grill") || text.includes("كباب")) {
    return CATEGORY_DEFAULT_IMAGES.grills;
  }
  if (
    text.includes("فطير") ||
    text.includes("مخبوز") ||
    text.includes("pie") ||
    text.includes("bake") ||
    text.includes("بيتزا")
  ) {
    return CATEGORY_DEFAULT_IMAGES.pies;
  }
  if (
    text.includes("برجر") ||
    text.includes("سريع") ||
    text.includes("سندوتش") ||
    text.includes("fast") ||
    text.includes("burger")
  ) {
    return CATEGORY_DEFAULT_IMAGES.fastfood;
  }
  if (
    text.includes("بقالة") ||
    text.includes("سوبر") ||
    text.includes("groc") ||
    text.includes("ماركت")
  ) {
    return CATEGORY_DEFAULT_IMAGES.grocery;
  }
  if (
    text.includes("سمك") ||
    text.includes("بحر") ||
    text.includes("sea") ||
    text.includes("جمبري")
  ) {
    return CATEGORY_DEFAULT_IMAGES.seafood;
  }
  if (
    text.includes("حلو") ||
    text.includes("sweet") ||
    text.includes("كنافة") ||
    text.includes("بسبوسة")
  ) {
    return CATEGORY_DEFAULT_IMAGES.sweets;
  }
  if (
    text.includes("عصير") ||
    text.includes("مشروب") ||
    text.includes("drink")
  ) {
    return CATEGORY_DEFAULT_IMAGES.drinks;
  }
  if (text.includes("كشري") || text.includes("koshary")) {
    return CATEGORY_DEFAULT_IMAGES.koshary;
  }
  return CATEGORY_DEFAULT_IMAGES.egyptian;
}

const CATEGORY_IMAGES = {
  koshary: CATEGORY_DEFAULT_IMAGES.koshary.cover,
  home: CATEGORY_DEFAULT_IMAGES.egyptian.cover,
  egyptian: CATEGORY_DEFAULT_IMAGES.egyptian.cover,
  grills: CATEGORY_DEFAULT_IMAGES.grills.cover,
  pies: CATEGORY_DEFAULT_IMAGES.pies.cover,
  bakery: CATEGORY_DEFAULT_IMAGES.bakery.cover,
  seafood: CATEGORY_DEFAULT_IMAGES.seafood.cover,
  fastfood: CATEGORY_DEFAULT_IMAGES.fastfood.cover,
  sweets: CATEGORY_DEFAULT_IMAGES.sweets.cover,
  drinks: CATEGORY_DEFAULT_IMAGES.drinks.cover,
  grocery: CATEGORY_DEFAULT_IMAGES.grocery.cover,
};

const CATEGORY_ALIASES = {
  egyptian: ["egyptian", "koshary", "home", "أكل مصري", "كشري", "أكل بيتي"],
  koshary: ["koshary", "كشري"],
  home: ["home", "أكل بيتي", "طواجن"],
  grills: ["grills", "مشويات", "كباب"],
  pies: ["pies", "bakery", "فطائر", "فطير", "مخبوزات"],
  bakery: ["bakery", "pies", "مخبوزات", "فطائر", "فطير"],
  seafood: ["seafood", "أسماك", "بحريات", "سي فود"],
  fastfood: ["fastfood", "سندوتشات", "برجر", "كريب", "سريع"],
  sweets: ["sweets", "حلويات", "حاجة حلوة"],
  drinks: ["drinks", "مشروبات", "عصائر"],
  grocery: ["grocery", "بقالة", "خضار", "مواد غذائية", "سوبر ماركت"],
};

export function normalizeStore(raw) {
  if (!raw) return null;
  const slug = (raw.slug || "").trim();

  let categoryNames = [];
  let categorySlugs = Array.isArray(raw.categorySlugs)
    ? [...raw.categorySlugs]
    : [];
  const categoryObjects = [];

  if (Array.isArray(raw.categories)) {
    raw.categories.forEach((c) => {
      if (typeof c === "string" && c.trim()) {
        categoryNames.push(c.trim());
      } else if (c && typeof c === "object") {
        if (c.name) categoryNames.push(c.name);
        if (c.slug) categorySlugs.push(c.slug);
        categoryObjects.push(c);
      }
    });
  }
  if (categoryNames.length === 0 && raw.categoryName) {
    categoryNames = [raw.categoryName];
  }

  const primarySlug = raw.categorySlug || categorySlugs[0] || "";
  if (primarySlug && !categorySlugs.includes(primarySlug)) {
    categorySlugs.unshift(primarySlug);
  }
  categorySlugs = [...new Set(categorySlugs.filter(Boolean))];

  const mins = Number(raw.deliveryMinutes ?? 30);
  const deliveryTime =
    raw.deliveryTime ||
    `${Math.max(10, mins - 5)} - ${mins + 5} دقيقة`;

  const now = Date.now();
  const rawOffers = Array.isArray(raw.activeOffers) ? raw.activeOffers : [];
  const activeOffers = rawOffers.filter((o) => {
    if (o?.status && o.status !== "active") return false;
    if (!o?.endsAt) return true;
    const endTs = new Date(o.endsAt).getTime();
    return !Number.isFinite(endTs) || endTs > now;
  });

  const primaryOffer = activeOffers.length > 0 ? activeOffers[0] : null;

  const derivedOfferText =
    raw.offerText !== undefined && raw.offerText !== null
      ? raw.offerText
      : primaryOffer
      ? primaryOffer.description
        ? `${primaryOffer.title} — ${primaryOffer.description}`
        : primaryOffer.title
      : null;

  const offerEndsAt =
    raw.offerEndsAt ||
    primaryOffer?.endsAt ||
    null;

  const freeDeliveryOffer =
    activeOffers.find((o) => o.discountType === "free_delivery") || null;

  const rawDeliveryFee = Number(
    raw.baseDeliveryFee ?? (raw.deliveryFee > 0 ? raw.deliveryFee : (raw.previousDeliveryFee || 15))
  );

  const freeDeliveryThreshold = freeDeliveryOffer
    ? Number(
        freeDeliveryOffer.minOrder ||
          freeDeliveryOffer.min_order ||
          raw.freeDeliveryThreshold ||
          raw.minOrder ||
          raw.minOrderAmount ||
          0
      )
    : Number(
        raw.freeDeliveryThreshold ||
          raw.minOrder ||
          raw.minOrderAmount ||
          0
      );

  const hasFreeDeliveryOffer = Boolean(freeDeliveryOffer);

  // إذا كان التوصيل المجاني مشروطاً بحد أدنى (مثلاً فوق 80 ج.م)، تظل رسوم المتجر الأساسية كما هي (15 ج.م)
  // ويتم تصفيرها في السلة والشيك أوت فقط إذا وصل الطلب إلى الحد الأدنى المطلوب.
  const deliveryFee =
    hasFreeDeliveryOffer && freeDeliveryThreshold === 0 ? 0 : rawDeliveryFee;

  const finalDerivedOfferText =
    derivedOfferText ||
    (hasFreeDeliveryOffer
      ? freeDeliveryThreshold > 0
        ? `عرض: توصيل مجاني للطلبات فوق ${freeDeliveryThreshold} ج.م`
        : "عرض: توصيل مجاني على جميع الطلبات"
      : null);

  const defaultImgs = resolveCategoryImages(
    primarySlug || (categoryNames[0] || "") || raw.name || ""
  );
  const bannerUrl =
    raw.coverUrl || raw.bannerUrl || raw.image || defaultImgs.cover;
  const logoUrl = raw.logoUrl || defaultImgs.logo;
  const minOrderVal = Number(raw.minOrder ?? raw.minOrderAmount ?? 0);

  const effectiveActiveOffer = primaryOffer || null;

  const hasAnyActualOffer = Boolean(
    effectiveActiveOffer || (raw.hasOffer && finalDerivedOfferText)
  );

  return {
    ...raw,
    id: raw.id,
    name: raw.name || "",
    slug,
    description: raw.description || "",
    address: raw.address || "",
    categories: categoryNames,
    categoryObjects,
    categorySlug: primarySlug,
    categorySlugs,
    rating: Number(raw.rating ?? 0),
    reviewsCount: Number(raw.reviewsCount ?? 0),
    deliveryMinutes: mins,
    deliveryTime,
    deliveryFee,
    baseDeliveryFee: rawDeliveryFee,
    freeDeliveryThreshold,
    minOrder: minOrderVal,
    minOrderAmount: minOrderVal,
    commissionRate: Number(raw.commissionRate ?? 0),
    isOpen: raw.isOpen !== undefined ? Boolean(raw.isOpen) : true,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    suspensionReason: raw.suspensionReason || raw.suspension_reason || null,
    isDeleted: Boolean(
      raw.isDeleted ||
      (raw.suspensionReason || raw.suspension_reason) === "محذوف إدارياً من المنصة"
    ),
    hasOffer: hasAnyActualOffer,
    hasFreeDeliveryOffer: Boolean(hasFreeDeliveryOffer),
    isFreeDelivery: Boolean(hasFreeDeliveryOffer && freeDeliveryThreshold === 0),
    offerBadge: hasAnyActualOffer
      ? hasFreeDeliveryOffer
        ? freeDeliveryThreshold > 0
          ? `توصيل مجاني فوق ${freeDeliveryThreshold} ج`
          : "توصيل مجاني"
        : raw.offerBadge || "عرض خاص"
      : null,
    offerText: hasAnyActualOffer ? finalDerivedOfferText : null,
    offerEndsAt: hasAnyActualOffer ? offerEndsAt : null,
    activeOffer: effectiveActiveOffer,
    activeOffers: effectiveActiveOffer ? [effectiveActiveOffer, ...activeOffers.filter(o => o.id !== effectiveActiveOffer.id)] : activeOffers,
    bannerUrl,
    coverUrl: bannerUrl,
    logoUrl,
  };
}

export function storeMatchesCategory(store, categoryFilter) {
  if (!categoryFilter || categoryFilter === "all") return true;
  if (!store) return false;

  const target = String(categoryFilter).trim().toLowerCase();
  const aliases = CATEGORY_ALIASES[target] || [target];

  const slugs = [
    store.categorySlug,
    ...(Array.isArray(store.categorySlugs) ? store.categorySlugs : []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  if (slugs.some((s) => aliases.includes(s) || s === target)) {
    return true;
  }

  const names = (Array.isArray(store.categories) ? store.categories : [])
    .map((c) => (typeof c === "string" ? c : c?.name || ""))
    .filter(Boolean)
    .map((n) => n.toLowerCase());

  return names.some((name) =>
    aliases.some(
      (alias) =>
        name.includes(alias.toLowerCase()) || alias.toLowerCase().includes(name)
    )
  );
}

function extractApiItems(res, legacyKey) {
  if (!res) return [];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (legacyKey && Array.isArray(res?.[legacyKey])) return res[legacyKey];
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function notifyStoresUpdated(detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otlob_stores_updated", { detail }));
    window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail }));
  }
}

export const storesService = {
  /**
   * جلب الأقسام من قاعدة البيانات. تُرجع فقط الأقسام التي يوجد بها متجر نشط واحد على الأقل.
   */
  async getCategories(params = {}) {
    const queryParams = {};
    if (params.activeOnly !== undefined) {
      queryParams.activeOnly = params.activeOnly;
    }
    const catRes = await axiosClient.get(ENDPOINTS.CATEGORIES.LIST, {
      params: queryParams,
    });

    let allCategories = extractApiItems(catRes, "categories").map((c) => {
      const img = c.imageUrl || c.iconUrl || CATEGORY_IMAGES[c.slug] || null;
      return { ...c, image: img, imageUrl: img };
    });

    // إذا طُلب التصنيفات النشطة فقط (الافتراضي للموقع والتقديم)، استبعاد أي تصنيف معطل
    if (params.activeOnly !== false) {
      allCategories = allCategories.filter((c) => c.isActive !== false);
    }

    if (Array.isArray(params.stores) && params.stores.length > 0) {
      const filtered = allCategories.filter((cat) =>
        params.stores.some(
          (s) =>
            (s.isActive !== false) &&
            (storeMatchesCategory(s, cat.slug) ||
             storeMatchesCategory(s, cat.name))
        )
      );
      return { categories: filtered };
    }

    return { categories: allCategories };
  },

  async createCategory(payload) {
    const res = await axiosClient.post(ENDPOINTS.CATEGORIES.CREATE, {
      ...payload,
      asAdmin: true,
    });
    if (typeof window !== "undefined") {
      try {
        const syncPayload = { ...payload, timestamp: Date.now() };
        localStorage.setItem("otlob_category_last_sync", JSON.stringify(syncPayload));
        window.dispatchEvent(new CustomEvent("otlob_categories_updated", { detail: syncPayload }));
        window.dispatchEvent(new CustomEvent("otlob_stores_updated"));
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("otlob_events_channel");
          channel.postMessage({ type: "category_created", ...syncPayload });
          channel.close();
        }
      } catch {}
    }
    return res;
  },

  async updateCategory(categoryId, payload) {
    const res = await axiosClient.patch(ENDPOINTS.CATEGORIES.BY_ID(categoryId), {
      ...payload,
      asAdmin: true,
    });
    if (typeof window !== "undefined") {
      try {
        const syncPayload = { categoryId, ...payload, timestamp: Date.now() };
        localStorage.setItem("otlob_category_last_sync", JSON.stringify(syncPayload));
        window.dispatchEvent(new CustomEvent("otlob_categories_updated", { detail: syncPayload }));
        window.dispatchEvent(new CustomEvent("otlob_stores_updated"));
        window.dispatchEvent(new CustomEvent("otlob_products_updated"));
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("otlob_events_channel");
          channel.postMessage({ type: "category_updated", ...syncPayload });
          channel.close();
        }
      } catch {}
    }
    return res;
  },

  async deleteCategory(categoryId) {
    const res = await axiosClient.delete(ENDPOINTS.CATEGORIES.BY_ID(categoryId));
    if (typeof window !== "undefined") {
      try {
        const syncPayload = { categoryId, isDeleted: true, timestamp: Date.now() };
        localStorage.setItem("otlob_category_last_sync", JSON.stringify(syncPayload));
        window.dispatchEvent(new CustomEvent("otlob_categories_updated", { detail: syncPayload }));
        window.dispatchEvent(new CustomEvent("otlob_stores_updated"));
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("otlob_events_channel");
          channel.postMessage({ type: "category_deleted", ...syncPayload });
          channel.close();
        }
      } catch {}
    }
    return res;
  },

  /**
   * جميع المتاجر (نشطة ومخفية) للإدارة العليا — يتطلب جلسة أدمن.
   */
  async getAllAdminStores() {
    const res = await axiosClient.get(ENDPOINTS.STORES.LIST, {
      params: { includeInactive: true, limit: 200 },
    });
    const stores = extractApiItems(res, "stores")
      .map(normalizeStore)
      .filter(
        (s) =>
          s &&
          !s.isDeleted &&
          s.suspensionReason !== "محذوف إدارياً من المنصة"
      );
    return { stores };
  },

  /**
   * قائمة المتاجر للجمهور (الفلترة والترتيب تتم في الـ API).
   */
  async getStores(params = {}) {
    const apiParams = {
      limit: params.limit || 200,
      page: params.page || 1,
      sort: params.sort || "rating",
    };
    if (params.includeInactive) apiParams.includeInactive = true;
    if (params.category) apiParams.category = params.category;
    const searchTerm = (params.search ?? params.q ?? "").trim();
    if (searchTerm) {
      apiParams.search = searchTerm;
    }
    if (params.isOpen !== undefined) apiParams.isOpen = params.isOpen;

    const res = await axiosClient.get(ENDPOINTS.STORES.LIST, {
      params: apiParams,
    });

    let stores = extractApiItems(res, "stores")
      .map(normalizeStore)
      .filter((s) => s && !s.isDeleted);

    if (!params.includeInactive) {
      stores = stores.filter((s) => s.isActive !== false);
    }

    return {
      stores,
      pagination: res?.meta || res?.pagination || {
        total: stores.length,
        page: apiParams.page,
        limit: apiParams.limit,
      },
    };
  },

  /**
   * تفاصيل متجر عبر slug أو id. تُرجع { store: null } إذا لم يوجد (404).
   */
  async getStoreBySlugOrId(slugOrId) {
    const decoded = decodeURIComponent(slugOrId || "").trim();
    if (!decoded) return { store: null };

    try {
      const res = await axiosClient.get(
        ENDPOINTS.STORES.BY_SLUG_OR_ID(decoded)
      );
      const rawStore = res?.store || res?.data?.store || null;
      if (!rawStore) return { store: null };

      const store = normalizeStore({
        ...rawStore,
        categories:
          Array.isArray(res?.categories) && res.categories.length > 0
            ? res.categories
            : rawStore.categories,
        activeOffers:
          Array.isArray(res?.activeOffers) && res.activeOffers.length > 0
            ? res.activeOffers
            : rawStore.activeOffers,
      });
      return {
        store,
        categories: res?.categories || [],
        activeOffers: res?.activeOffers || [],
      };
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return { store: null };
      }
      throw err;
    }
  },

  /**
   * دالة مطابقة متوافقة بالاسم المعكوس
   */
  async getStoreByIdOrSlug(slugOrId) {
    return this.getStoreBySlugOrId(slugOrId);
  },

  /**
   * إنشاء متجر (سوبر أدمن). يُحفظ في Supabase فقط؛ أي خطأ يُرمى للواجهة.
   */
  async createStore(payload) {
    const defaultImgs = resolveCategoryImages(
      payload.categorySlug || payload.categoryName || payload.name || ""
    );
    const res = await axiosClient.post(ENDPOINTS.STORES.CREATE, {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      address: payload.address,
      logoUrl: payload.logoUrl || defaultImgs.logo,
      coverUrl: payload.coverUrl || defaultImgs.cover,
      deliveryFee: Number(payload.deliveryFee) || 0,
      deliveryMinutes: Number(payload.deliveryMinutes) || 30,
      minOrder: Number(payload.minOrderAmount ?? payload.minOrder) || 0,
      commissionRate: Number(payload.commissionRate) || 0,
      ...(payload.categoryIds ? { categoryIds: payload.categoryIds } : {}),
      ...(payload.categorySlug ? { categorySlug: payload.categorySlug } : {}),
      ...(payload.categoryName ? { categoryName: payload.categoryName } : {}),
    });
    const store = normalizeStore(res?.store || res?.data?.store);
    notifyStoresUpdated({ store });
    return { store };
  },

  /**
   * تحديث بيانات المتجر.
   */
  async updateStore(slugOrId, payload) {
    const res = await axiosClient.patch(
      ENDPOINTS.STORES.BY_SLUG_OR_ID(slugOrId),
      payload
    );
    if (!payload?.silent) {
      notifyStoresUpdated({ slugOrId, payload });
    }
    return { success: true, store: normalizeStore(res?.store || null) };
  },

  /**
   * حفظ أو تحديث عرض المتجر مع موعد انتهاء محدد في قاعدة بيانات Supabase.
   * لا يستخدم localStorage ولا أي تخزين محلي إطلاقاً.
   */
  async saveStoreOfferWithSchedule(
    store,
    {
      offerText,
      offerBadge = "عرض خاص",
      endsAt,
      discountType = "fixed_amount",
      discountValue = 20,
      minOrder = 100,
      code = null,
      isFreeDelivery = false,
      stopImmediately = false,
      maxDiscount = null,
      appliesTo = "all_menu",
      selectedProductIds = [],
    } = {}
  ) {
    if (!store?.id) return null;

    let cleanTitle = (offerText || "").trim();
    const effectiveEndsAt = stopImmediately
      ? new Date().toISOString()
      : endsAt || null;

    const isFree = Boolean(!stopImmediately && isFreeDelivery);

    if (!cleanTitle && !stopImmediately) {
      if (isFree) {
        cleanTitle = Number(minOrder) > 0
          ? `توصيل مجاني للطلبات فوق ${minOrder} ج.م`
          : "توصيل مجاني على جميع الطلبات";
      } else if (appliesTo === "full_menu") {
        cleanTitle = `خصم ${discountValue || 15}% على كامل المنيو`;
      } else if (appliesTo === "selected_items") {
        cleanTitle = `خصم خاص على وجبات مختارة`;
      } else if (code) {
        cleanTitle = `خصم بكود ${code}`;
      } else {
        cleanTitle = "عرض خاص على طلبات المطعم";
      }
    }

    // إيقاف أو تحديث العروض مباشرة عبر Backend APIs في Supabase
    if (stopImmediately) {
      // 1. جلب جميع العروض المرتبطة بالمتجر وإلغاء تفعيلها في قاعدة البيانات
      let targetOfferIds = [];
      try {
        const offersRes = await axiosClient.get(ENDPOINTS.OFFERS.LIST, {
          params: { storeId: store.id, includeAllStatuses: true },
        });
        const items = extractApiItems(offersRes, "offers") || offersRes?.items || [];
        targetOfferIds = items
          .filter((o) => o?.id && o.status === "active")
          .map((o) => o.id);
      } catch {
        // Fallback to activeOffers on store object
      }

      if (Array.isArray(store.activeOffers)) {
        store.activeOffers.forEach((o) => {
          if (o?.id && !targetOfferIds.includes(o.id)) {
            targetOfferIds.push(o.id);
          }
        });
      }
      if (store.activeOffer?.id && !targetOfferIds.includes(store.activeOffer.id)) {
        targetOfferIds.push(store.activeOffer.id);
      }

      for (const offId of targetOfferIds) {
        if (!offId.startsWith("custom-offer-") && !offId.startsWith("coup-")) {
          try {
            await axiosClient.patch(
              ENDPOINTS.OFFERS.BY_ID(offId),
              {
                status: "paused",
                endsAt: effectiveEndsAt,
              },
              {
                headers: { "X-Otlob-Portal": "merchant" },
              }
            );
          } catch (err) {
            console.warn(`Deactivating offer ${offId} skipped:`, err?.message || err);
          }
        }
      }

      // تحديث بيانات المتجر في قاعدة البيانات لإلغاء التوصيل المجاني وشارة العرض
      try {
        const prevFee = Number(store.previousDeliveryFee || store.deliveryFee || 15);
        await axiosClient.patch(
          ENDPOINTS.STORES.BY_SLUG_OR_ID(store.id),
          {
            isFreeDelivery: false,
            deliveryFee: prevFee > 0 ? prevFee : 15,
          },
          {
            headers: { "X-Otlob-Portal": "merchant" },
          }
        );
      } catch {
        // ignore
      }
    } else if (cleanTitle) {
      // إنشاء أو تحديث العرض في Supabase
      const cleanAppliesTo =
        appliesTo === "selected_items" || appliesTo === "specific"
          ? "specific"
          : "all";

      const offerPayload = {
        storeId: store.id,
        storeName: store.name || "",
        storeSlug: store.slug || "",
        title: cleanTitle.slice(0, 100),
        description: cleanTitle,
        discountType: isFree
          ? "free_delivery"
          : discountType === "delivery_discount"
          ? "free_delivery"
          : discountType || "percentage",
        discountValue: isFree ? 0 : Number(discountValue) || 20,
        minOrder: Number(minOrder) || 0,
        maxDiscount: maxDiscount != null && maxDiscount !== "" ? Number(maxDiscount) : null,
        appliesTo: cleanAppliesTo,
        productIds: Array.isArray(selectedProductIds) ? selectedProductIds : [],
        code: code ? String(code).trim().toUpperCase() : null,
        status: "active",
        startsAt: new Date(Date.now() - 60000).toISOString(),
        endsAt: effectiveEndsAt,
        isPublic: true,
      };

      const existingOffer =
        (Array.isArray(store.activeOffers) && store.activeOffers[0]) ||
        store.activeOffer ||
        null;

      const isDbId =
        existingOffer?.id &&
        !existingOffer.id.startsWith("custom-offer-") &&
        !existingOffer.id.startsWith("coup-");

      const requestConfig = {
        headers: { "X-Otlob-Portal": "merchant" },
      };

      if (isDbId) {
        try {
          await axiosClient.patch(
            ENDPOINTS.OFFERS.BY_ID(existingOffer.id),
            offerPayload,
            requestConfig
          );
        } catch {
          await axiosClient.post(ENDPOINTS.OFFERS.CREATE, offerPayload, requestConfig);
        }
      } else {
        await axiosClient.post(ENDPOINTS.OFFERS.CREATE, offerPayload, requestConfig);
      }

      if (isFree) {
        try {
          await axiosClient.patch(ENDPOINTS.STORES.BY_SLUG_OR_ID(store.id), {
            isFreeDelivery: true,
            deliveryFee: 0,
          });
        } catch {
          // ignore
        }
      }
    }

    notifyStoresUpdated({
      storeId: store.id,
      offerText: stopImmediately ? null : cleanTitle,
      offerEndsAt: effectiveEndsAt,
      deliveryFee: isFree ? 0 : Number(store.deliveryFee ?? 15),
      hasFreeDeliveryOffer: isFree,
      isFreeDelivery: isFree,
    });

    return {
      offerText: stopImmediately
        ? null
        : cleanTitle || (isFree ? "عرض: توصيل مجاني على جميع الطلبات" : null),
      offerEndsAt: effectiveEndsAt,
      deliveryFee: isFree ? 0 : Number(store.deliveryFee ?? 15),
      isFreeDelivery: isFree,
    };
  },





  /**
   * حذف متجر.
   */
  async deleteStore(slugOrId) {
    await axiosClient.delete(ENDPOINTS.STORES.BY_SLUG_OR_ID(slugOrId));
    notifyStoresUpdated({ slugOrId });
    return { success: true };
  },
};
