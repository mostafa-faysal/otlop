export function toCategoryDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    iconUrl: entity.iconUrl || entity.imageUrl || null,
    imageUrl: entity.imageUrl || entity.iconUrl || null,
    sortOrder: Number(entity.sortOrder ?? 0),
    isActive: Boolean(entity.isActive),
  };
}

/**
 * تحويل كيان المتجر (StoreEntity) إلى DTO مع إخفاء الحقول المالية والإدارية الحساسة عن الجمهور العام
 */
export function toStoreDTO(entity, { includeFinancials = false } = {}) {
  if (!entity) return null;
  const base = {
    id: entity.id,
    ownerId: entity.ownerId || null,
    name: entity.name,
    slug: entity.slug,
    description: entity.description || null,
    logoUrl: entity.logoUrl || null,
    coverUrl: entity.coverUrl || null,
    phone: entity.phone ?? null,
    address: entity.address || null,
    lat:
      entity.lat !== null && entity.lat !== undefined
        ? Number(entity.lat)
        : null,
    lng:
      entity.lng !== null && entity.lng !== undefined
        ? Number(entity.lng)
        : null,
    rating: Number(entity.rating ?? 0),
    reviewsCount: Number(entity.reviewsCount ?? 0),
    deliveryFee: Number(entity.deliveryFee ?? 0),
    deliveryMinutes: Number(entity.deliveryMinutes ?? 30),
    minOrder: Number(entity.minOrder ?? 0),
    commissionRate: Number(entity.commissionRate ?? 5),
    isOpen: Boolean(entity.isOpen),
    isActive: Boolean(entity.isActive),
    suspensionReason: entity.suspensionReason || null,
    isDeleted: entity.suspensionReason === "محذوف إدارياً من المنصة",
    categories: Array.isArray(entity.categories)
      ? entity.categories.map(toCategoryDTO).filter(Boolean)
      : [],
    activeOffers: Array.isArray(entity.activeOffers)
      ? entity.activeOffers.map(toOfferDTO).filter(Boolean)
      : [],
    activeOffer:
      Array.isArray(entity.activeOffers) && entity.activeOffers.length > 0
        ? toOfferDTO(entity.activeOffers[0])
        : null,
    hasOffer:
      Array.isArray(entity.activeOffers) && entity.activeOffers.length > 0,
    offerBadge:
      Array.isArray(entity.activeOffers) && entity.activeOffers.length > 0
        ? entity.activeOffers[0]?.discountType === "free_delivery"
          ? "توصيل مجاني"
          : "عرض خاص"
        : Number(entity.deliveryFee ?? 0) === 0
        ? "توصيل مجاني"
        : null,
    offerText:
      Array.isArray(entity.activeOffers) && entity.activeOffers.length > 0
        ? entity.activeOffers[0]?.title || null
        : null,
    offerEndsAt:
      Array.isArray(entity.activeOffers) && entity.activeOffers.length > 0
        ? entity.activeOffers[0]?.endsAt || null
        : null,
    isFreeDelivery:
      Number(entity.deliveryFee ?? 0) === 0 ||
      entity.activeOffers?.[0]?.discountType === "free_delivery",
    hasFreeDeliveryOffer:
      Number(entity.deliveryFee ?? 0) === 0 ||
      entity.activeOffers?.[0]?.discountType === "free_delivery",
  };

  if (includeFinancials) {
    base.ownerId = entity.ownerId || null;
    base.commissionRate = Number(entity.commissionRate ?? 0);
    base.suspensionReason = entity.suspensionReason || null;
    base.suspendedAt = entity.suspendedAt || null;
    base.reactivatedAt = entity.reactivatedAt || null;
  }

  return base;
}

export function toProductDTO(entity) {
  if (!entity) return null;
  const sizes = Array.isArray(entity.sizes) ? entity.sizes : [];
  const extras = Array.isArray(entity.extras)
    ? entity.extras
    : Array.isArray(entity.addOns)
    ? entity.addOns
    : [];
  return {
    id: entity.id,
    storeId: entity.storeId,
    storeName: entity.storeName || null,
    storeSlug: entity.storeSlug || null,
    categoryId: entity.categoryId || null,
    categoryName: entity.categoryName || null,
    category: entity.categoryName || null,
    categorySlug: entity.categorySlug || null,
    name: entity.name,
    description: entity.description || null,
    price: Number(entity.price ?? 0),
    originalPrice:
      entity.originalPrice !== undefined && entity.originalPrice !== null
        ? Number(entity.originalPrice)
        : null,
    discountValue:
      entity.discountValue !== undefined && entity.discountValue !== null
        ? Number(entity.discountValue)
        : null,
    discountType: entity.discountType || null,
    imageUrl: entity.imageUrl || null,
    isAvailable: Boolean(entity.isAvailable),
    sortOrder: Number(entity.sortOrder ?? 0),
    sizes,
    extras,
    addOns: extras,
  };
}

export function toOfferDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    storeId: entity.storeId || null,
    storeName: entity.storeName || null,
    storeSlug: entity.storeSlug || null,
    title: entity.title,
    description: entity.description || null,
    code: entity.code || null,
    discountType: entity.discountType,
    discountValue: Number(entity.discountValue ?? 0),
    appliesTo: entity.appliesTo,
    minOrder: Number(entity.minOrder ?? 0),
    maxDiscount:
      entity.maxDiscount !== null && entity.maxDiscount !== undefined
        ? Number(entity.maxDiscount)
        : null,
    priority: Number(entity.priority ?? 0),
    usageLimit: entity.usageLimit ?? null,
    usedCount: Number(entity.usedCount ?? 0),
    deliveryCostBearer: entity.deliveryCostBearer || null,
    status: entity.status,
    startsAt: entity.startsAt || null,
    endsAt: entity.endsAt || null,
    isPublic: Boolean(entity.isPublic),
    productIds: Array.isArray(entity.productIds) ? entity.productIds : [],
  };
}
