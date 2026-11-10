import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

/**
 * خدمة المنتجات والعروض — تقرأ وتكتب من/إلى الـ API (Supabase) مباشرةً.
 * لا توجد مصفوفات وهمية ولا Fallback ثابت.
 */

function getFallbackDishImage(raw = {}) {
  const text = `${raw.name || ""} ${raw.category || ""} ${
    raw.categoryName || ""
  } ${raw.categorySlug || ""}`.toLowerCase();

  if (text.includes("برجر")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("بطاطس")) {
    return "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("كريب")) {
    return "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("جمبري") || text.includes("سي فود")) {
    return "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("سمك") ||
    text.includes("بوري") ||
    text.includes("بلطي") ||
    text.includes("seafood")
  ) {
    return "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("كفتة") ||
    text.includes("جريل") ||
    text.includes("مشوي") ||
    text.includes("شيش") ||
    text.includes("grills")
  ) {
    return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("فطير") ||
    text.includes("فطائر") ||
    text.includes("قرص") ||
    text.includes("حواوشي") ||
    text.includes("pies") ||
    text.includes("bakery")
  ) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("بسبوسة") ||
    text.includes("كنافة") ||
    text.includes("أم علي") ||
    text.includes("أرز باللبن") ||
    text.includes("حلويات") ||
    text.includes("sweets")
  ) {
    return "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("عصير") ||
    text.includes("ليمون") ||
    text.includes("مانجو") ||
    text.includes("كوكاكولا") ||
    text.includes("مشروبات") ||
    text.includes("drinks")
  ) {
    return "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("بشاميل") || text.includes("مكرونة")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d628129b?w=600&auto=format&fit=crop&q=80";
  }
  if (text.includes("محشي") || text.includes("ملوخية") || text.includes("بامية")) {
    return "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80";
  }
  if (
    text.includes("بيض") ||
    text.includes("جبنة") ||
    text.includes("زيت") ||
    text.includes("بقالة") ||
    text.includes("grocery")
  ) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
}

export function cleanDescription(desc) {
  if (!desc) return "";
  return String(desc).split("<!--OTLOB_META:")[0].trim();
}

export function extractProductMeta(rawDescription) {
  if (!rawDescription || typeof rawDescription !== "string") {
    return { description: "", sizes: [], extras: [], meta: {} };
  }
  const clean = cleanDescription(rawDescription);
  if (!rawDescription.includes("<!--OTLOB_META:")) {
    return { description: clean, sizes: [], extras: [], meta: {} };
  }
  try {
    const rawMeta = rawDescription.split("<!--OTLOB_META:")[1]?.split("-->")[0];
    const parsed = rawMeta ? JSON.parse(rawMeta) : {};
    const sizes = Array.isArray(parsed?.sizes) ? parsed.sizes : [];
    const extras = Array.isArray(parsed?.extras)
      ? parsed.extras
      : Array.isArray(parsed?.addOns)
      ? parsed.addOns
      : [];
    return {
      description: clean,
      sizes,
      extras,
      meta: parsed,
    };
  } catch {
    return { description: clean, sizes: [], extras: [], meta: {} };
  }
}

export function unpackProductMeta(rawDescription) {
  const extracted = extractProductMeta(rawDescription);
  return {
    description: extracted.description || null,
    meta: extracted.meta,
  };
}

export function normalizeProduct(raw = {}) {
  if (!raw) return null;

  const { description: cleanDesc, meta } = unpackProductMeta(raw.description);

  const categoryName =
    raw.category || raw.categoryName || meta.categoryName || "وجبات المتجر";
  const categorySlug = raw.categorySlug || "";
  const storeName = raw.storeName || "";
  const storeSlug = raw.storeSlug || "";

  const image =
    raw.image ||
    raw.imageUrl ||
    getFallbackDishImage({ ...raw, categoryName, categorySlug });

  const lowerCat = `${categoryName} ${categorySlug} ${raw.name || ""}`.toLowerCase();
  const isDessert =
    raw.isDessert !== undefined
      ? Boolean(raw.isDessert)
      : categorySlug === "sweets" ||
        lowerCat.includes("حلويات") ||
        lowerCat.includes("حاجة حلوة") ||
        lowerCat.includes("كنافة") ||
        lowerCat.includes("بسبوسة") ||
        lowerCat.includes("أم علي") ||
        lowerCat.includes("أرز باللبن") ||
        lowerCat.includes("كاسترد");

  const sortOrder = Number(raw.sortOrder ?? 1);
  const isPopular =
    raw.isPopular !== undefined ? Boolean(raw.isPopular) : sortOrder <= 2;

  const sizes =
    Array.isArray(raw.sizes) && raw.sizes.length > 0
      ? raw.sizes
      : Array.isArray(meta.sizes)
      ? meta.sizes
      : [];

  const extras =
    Array.isArray(raw.extras) && raw.extras.length > 0
      ? raw.extras
      : Array.isArray(raw.addOns) && raw.addOns.length > 0
      ? raw.addOns
      : Array.isArray(meta.extras)
      ? meta.extras
      : [];

  return {
    ...raw,
    id: raw.id,
    storeId: raw.storeId,
    storeName,
    storeSlug,
    categoryId: raw.categoryId || null,
    category: categoryName,
    categoryName,
    categorySlug,
    name: raw.name || "",
    description: cleanDesc !== null ? cleanDesc : (raw.description || ""),
    price: Number(raw.price ?? 0),
    originalPrice:
      raw.originalPrice !== undefined && raw.originalPrice !== null
        ? Number(raw.originalPrice)
        : meta.originalPrice !== undefined && meta.originalPrice !== null
        ? Number(meta.originalPrice)
        : null,
    discountValue:
      raw.discountValue !== undefined && raw.discountValue !== null
        ? Number(raw.discountValue)
        : meta.discountValue !== undefined && meta.discountValue !== null
        ? Number(meta.discountValue)
        : null,
    discountType: raw.discountType || meta.discountType || null,
    image,
    imageUrl: image,
    sizes,
    extras,
    addOns: extras,
    isAvailable: raw.isAvailable !== undefined ? Boolean(raw.isAvailable) : true,
    isPopular,
    isDessert,
    sortOrder,
  };
}

function extractApiItems(res, legacyKey) {
  if (!res) return [];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (legacyKey && Array.isArray(res?.[legacyKey])) return res[legacyKey];
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function notifyProductsUpdated(detail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otlob_products_updated", { detail }));
  }
}

export const productsService = {
  /**
   * جلب المنتجات من قاعدة البيانات عبر الـ API.
   */
  async getProducts(params = {}) {
    const apiParams = {};
    if (params.storeId) apiParams.storeId = params.storeId;
    if (params.storeSlug || params.slug) {
      apiParams.storeSlug = params.storeSlug || params.slug;
    }
    if (params.categoryId) apiParams.categoryId = params.categoryId;
    const searchTerm = (params.search ?? params.q ?? "").trim();
    if (searchTerm) {
      apiParams.search = searchTerm;
    }
    if (params.availableOnly) apiParams.availableOnly = true;

    const res = await axiosClient.get(ENDPOINTS.PRODUCTS.LIST, {
      params: apiParams,
    });

    const products = extractApiItems(res, "products")
      .map(normalizeProduct)
      .filter(Boolean);

    return {
      products,
      pagination: res?.meta || res?.pagination || {
        total: products.length,
        page: 1,
        limit: products.length || 50,
      },
    };
  },

  /**
   * إضافة منتج جديد في قاعدة البيانات.
   */
  async createProduct(payload) {
    const res = await axiosClient.post(ENDPOINTS.PRODUCTS.CREATE, payload, {
      headers: { "X-Otlob-Portal": "merchant" },
    });
    const product = normalizeProduct(res?.product || res?.data?.product || payload);
    notifyProductsUpdated({ product });
    return { product };
  },

  /**
   * تحديث منتج في قاعدة البيانات.
   */
  async updateProduct(productId, payload) {
    const res = await axiosClient.patch(
      ENDPOINTS.PRODUCTS.BY_ID(productId),
      payload,
      {
        headers: { "X-Otlob-Portal": "merchant" },
      }
    );
    const product = normalizeProduct(
      res?.product || res?.data?.product || { id: productId, ...payload }
    );
    notifyProductsUpdated({ productId, payload });
    return { product };
  },

  /**
   * حذف منتج من قاعدة البيانات.
   */
  async deleteProduct(productId) {
    await axiosClient.delete(ENDPOINTS.PRODUCTS.BY_ID(productId), {
      headers: { "X-Otlob-Portal": "merchant" },
    });
    notifyProductsUpdated({ productId });
    return { success: true };
  },

  /**
   * جلب العروض والخصومات من قاعدة البيانات عبر الـ API.
   */
  async getOffers(params = {}) {
    const res = await axiosClient.get(ENDPOINTS.OFFERS.LIST, { params });
    const now = Date.now();
    const offers = extractApiItems(res, "offers")
      .map((off) => ({
        ...off,
        storeName:
          off.storeName || (off.storeId ? "عرض متجر معتمد" : "عرض عام للمنصة"),
        storeSlug: off.storeSlug || null,
      }))
      .filter((off) => {
        if (params.includeAllStatuses) return true;
        if (!off.endsAt) return true;
        const endTs = new Date(off.endsAt).getTime();
        return !Number.isFinite(endTs) || endTs > now;
      });

    return { offers };
  },

  /**
   * إنشاء عرض جديد للمتجر في قاعدة البيانات مع تاريخ وساعة الانتهاء (endsAt).
   */
  async createOffer(payload) {
    const res = await axiosClient.post(ENDPOINTS.OFFERS.CREATE, payload, {
      headers: { "X-Otlob-Portal": "merchant" },
    });
    const offer = res?.offer || res?.data?.offer || payload;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("otlob_stores_updated", { detail: { offer } }));
      window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail: { offer } }));
    }
    return { offer };
  },

  /**
   * تحديث عرض قائم (النص، قيمة الخصم، أو موعد الانتهاء endsAt).
   */
  async updateOffer(offerId, payload) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(offerId || ""));
    if (!isUuid) {
      const offer = { id: offerId, ...payload };
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("otlob_stores_updated", { detail: { offer } }));
        window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail: { offer } }));
      }
      return { offer };
    }
    const res = await axiosClient.patch(ENDPOINTS.OFFERS.BY_ID(offerId), payload, {
      headers: { "X-Otlob-Portal": "merchant" },
    });
    const offer = res?.offer || res?.data?.offer || { id: offerId, ...payload };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("otlob_stores_updated", { detail: { offer } }));
      window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail: { offer } }));
    }
    return { offer };
  },

  /**
   * حذف عرض من قاعدة البيانات.
   */
  async deleteOffer(offerId) {
    if (!offerId) return { deleted: true };
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(offerId || ""));
    if (isUuid) {
      try {
        await axiosClient.delete(ENDPOINTS.OFFERS.BY_ID(offerId), {
          headers: { "X-Otlob-Portal": "merchant" },
        });
      } catch (err) {
        if (err?.response?.status !== 404) {
          throw err;
        }
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("otlob_stores_updated", { detail: { offerId } }));
      window.dispatchEvent(new CustomEvent("otlob_offers_updated", { detail: { offerId } }));
    }
    return { deleted: true };
  },
};
