export function mapDbCategoryToDomain(row) {
  if (!row) return null;
  const imageUrl = row.image_url || row.icon_url || null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    iconUrl: imageUrl,
    imageUrl,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at || null,
  };
}

export function mapDomainCategoryToDb(domainInput = {}) {
  const row = {};
  if (domainInput.name !== undefined) row.name = domainInput.name;
  if (domainInput.slug !== undefined) row.slug = domainInput.slug;
  if (domainInput.iconUrl !== undefined || domainInput.imageUrl !== undefined) {
    row.image_url = domainInput.iconUrl ?? domainInput.imageUrl ?? null;
  }
  if (domainInput.sortOrder !== undefined) {
    row.sort_order = Number(domainInput.sortOrder ?? 0);
  }
  if (domainInput.isActive !== undefined) {
    row.is_active = Boolean(domainInput.isActive);
  }
  return row;
}

export function mapDbOfferToDomain(row, { store = null } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id || null,
    storeName: store?.name || row.store_name || null,
    storeSlug: store?.slug || row.store_slug || null,
    title: row.title,
    description: row.description || null,
    code: row.code || null,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value ?? 0),
    appliesTo: row.applies_to || "all",
    minOrder: Number(row.min_order ?? 0),
    maxDiscount:
      row.max_discount !== null && row.max_discount !== undefined
        ? Number(row.max_discount)
        : null,
    priority: Number(row.priority ?? 0),
    usageLimit: row.usage_limit ?? null,
    usedCount: Number(row.used_count ?? 0),
    deliveryCostBearer: row.delivery_cost_bearer || null,
    status: row.status || "active",
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    isPublic: row.is_public !== undefined ? Boolean(row.is_public) : true,
    productIds: Array.isArray(row.offer_products)
      ? row.offer_products.map((op) => op.product_id)
      : Array.isArray(row.productIds)
      ? row.productIds
      : [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDomainOfferToDb(domainInput = {}) {
  const row = {};
  if (domainInput.id !== undefined) row.id = domainInput.id;
  if (domainInput.storeId !== undefined) row.store_id = domainInput.storeId;
  if (domainInput.store_id !== undefined) row.store_id = domainInput.store_id;
  if (domainInput.title !== undefined) row.title = domainInput.title;
  if (domainInput.description !== undefined)
    row.description = domainInput.description;
  if (domainInput.code !== undefined) row.code = domainInput.code;

  let dt = domainInput.discountType ?? domainInput.discount_type;
  if (dt !== undefined) {
    if (dt === "delivery_discount") dt = "free_delivery";
    row.discount_type = dt;
  }

  let dv = domainInput.discountValue ?? domainInput.discount_value;
  if (dv !== undefined) {
    row.discount_value = Number(dv) || 0;
  }

  if (row.discount_type === "free_delivery") {
    row.discount_value = 0;
    row.delivery_cost_bearer = domainInput.deliveryCostBearer ?? domainInput.delivery_cost_bearer ?? "store";
  } else if (domainInput.deliveryCostBearer !== undefined || domainInput.delivery_cost_bearer !== undefined) {
    row.delivery_cost_bearer = domainInput.deliveryCostBearer ?? domainInput.delivery_cost_bearer ?? null;
  }

  let at = domainInput.appliesTo ?? domainInput.applies_to;
  if (at !== undefined) {
    const cleanAt = String(at).toLowerCase().trim();
    row.applies_to = (cleanAt === "specific" || cleanAt === "selected_items") ? "specific" : "all";
  }

  if (domainInput.minOrder !== undefined) row.min_order = domainInput.minOrder;
  if (domainInput.min_order !== undefined) row.min_order = domainInput.min_order;
  if (domainInput.maxDiscount !== undefined)
    row.max_discount =
      domainInput.maxDiscount !== null && domainInput.maxDiscount !== "" && Number(domainInput.maxDiscount) > 0
        ? Number(domainInput.maxDiscount)
        : null;
  if (domainInput.max_discount !== undefined)
    row.max_discount =
      domainInput.max_discount !== null && domainInput.max_discount !== "" && Number(domainInput.max_discount) > 0
        ? Number(domainInput.max_discount)
        : null;
  if (domainInput.priority !== undefined) row.priority = domainInput.priority;
  if (domainInput.usageLimit !== undefined)
    row.usage_limit = domainInput.usageLimit;

  let st = domainInput.status;
  if (st !== undefined) {
    const cleanSt = String(st).toLowerCase().trim();
    if (cleanSt === "inactive" || cleanSt === "disabled") {
      row.status = "paused";
    } else {
      row.status = cleanSt;
    }
  }

  if (domainInput.startsAt !== undefined) row.starts_at = domainInput.startsAt;
  if (domainInput.starts_at !== undefined) row.starts_at = domainInput.starts_at;
  if (domainInput.endsAt !== undefined) row.ends_at = domainInput.endsAt;
  if (domainInput.ends_at !== undefined) row.ends_at = domainInput.ends_at;
  if (domainInput.isPublic !== undefined)
    row.is_public = Boolean(domainInput.isPublic);
  return row;
}

export function mapDbStoreToDomain(row, { categories = null, activeOffers = null } = {}) {
  if (!row) return null;
  const entity = {
    id: row.id,
    ownerId: row.owner_id || null,
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    address: row.address || null,
    phone: row.phone || null,
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    logoUrl: row.logo_url || null,
    coverUrl: row.cover_url || null,
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    commissionRate: Number(row.commission_rate ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    deliveryMinutes: Number(row.delivery_minutes ?? 30),
    minOrder: Number(row.min_order ?? 0),
    isOpen: Boolean(row.is_open),
    isActive: Boolean(row.is_active),
    suspensionReason: row.suspension_reason || null,
    suspendedAt: row.suspended_at || null,
    suspendedBy: row.suspended_by || null,
    reactivatedAt: row.reactivated_at || null,
    reactivatedBy: row.reactivated_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };

  if (Array.isArray(categories)) {
    entity.categories = categories.map(mapDbCategoryToDomain).filter(Boolean);
  }
  if (Array.isArray(activeOffers)) {
    entity.activeOffers = activeOffers.map(mapDbOfferToDomain).filter(Boolean);
  }

  return entity;
}

/**
 * يحول مدخلات المتجر من طبقة المجال إلى أعمدة جدول public.stores الفعلية فقط.
 * لا يرسل phone أو lat أو lng لأن جدول public.stores لا يحتوي على هذه الأعمدة.
 */
export function mapDomainStoreToDb(domainInput = {}) {
  const row = {};
  if (domainInput.ownerId !== undefined) row.owner_id = domainInput.ownerId;
  if (domainInput.name !== undefined) row.name = domainInput.name;
  if (domainInput.slug !== undefined) row.slug = domainInput.slug;
  if (domainInput.description !== undefined)
    row.description = domainInput.description;
  if (domainInput.address !== undefined) row.address = domainInput.address;
  if (domainInput.logoUrl !== undefined) row.logo_url = domainInput.logoUrl;
  if (domainInput.coverUrl !== undefined) row.cover_url = domainInput.coverUrl;
  if (domainInput.deliveryFee !== undefined)
    row.delivery_fee = domainInput.deliveryFee;
  if (domainInput.deliveryMinutes !== undefined)
    row.delivery_minutes = domainInput.deliveryMinutes;
  if (domainInput.minOrder !== undefined) row.min_order = domainInput.minOrder;
  if (domainInput.commissionRate !== undefined)
    row.commission_rate = domainInput.commissionRate;
  if (domainInput.isActive !== undefined)
    row.is_active = Boolean(domainInput.isActive);
  if (domainInput.isOpen !== undefined)
    row.is_open = Boolean(domainInput.isOpen);
  if (domainInput.suspensionReason !== undefined)
    row.suspension_reason = domainInput.suspensionReason;
  if (domainInput.suspendedAt !== undefined)
    row.suspended_at = domainInput.suspendedAt;
  if (domainInput.reactivatedAt !== undefined)
    row.reactivated_at = domainInput.reactivatedAt;
  return row;
}

const PRODUCT_META_REGEX = /\s*<!--OTLOB_META:([\s\S]*?)-->\s*$/;

export function unpackProductDescriptionAndMeta(rawDescription) {
  if (!rawDescription || typeof rawDescription !== "string") {
    return { description: null, meta: {} };
  }
  const match = rawDescription.match(PRODUCT_META_REGEX);
  if (!match) {
    return { description: rawDescription.trim() || null, meta: {} };
  }
  const cleanDesc = rawDescription.replace(PRODUCT_META_REGEX, "").trim() || null;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      description: cleanDesc,
      meta: parsed && typeof parsed === "object" ? parsed : {},
    };
  } catch {
    return { description: cleanDesc, meta: {} };
  }
}

export function packProductDescriptionAndMeta(description, meta = {}) {
  const cleanDesc = description
    ? String(description).split("<!--OTLOB_META:")[0].trim()
    : "";
  const cleanMeta = {};
  if (meta.categoryName) cleanMeta.categoryName = String(meta.categoryName).trim();
  if (Array.isArray(meta.sizes) && meta.sizes.length > 0) {
    cleanMeta.sizes = meta.sizes;
  }
  if (Array.isArray(meta.extras) && meta.extras.length > 0) {
    cleanMeta.extras = meta.extras;
  }

  const hasMeta = Object.keys(cleanMeta).length > 0;
  if (!hasMeta) {
    return cleanDesc || null;
  }
  const metaTag = `<!--OTLOB_META:${JSON.stringify(cleanMeta)}-->`;
  return cleanDesc ? `${cleanDesc} ${metaTag}` : metaTag;
}

export function mapDbProductToDomain(
  row,
  { store = null, category = null } = {}
) {
  if (!row) return null;
  const { description: cleanDescription, meta } = unpackProductDescriptionAndMeta(
    row.description
  );
  const resolvedCategoryName = meta.categoryName || category?.name || null;
  const sizes = Array.isArray(meta.sizes) ? meta.sizes : [];
  const extras = Array.isArray(meta.extras) ? meta.extras : [];
  const discountType = row.discount_type || meta.discountType || null;
  const discountValue = Number(row.discount_value ?? meta.discountValue ?? 0);

  return {
    id: row.id,
    storeId: row.store_id,
    storeName: store?.name || null,
    storeSlug: store?.slug || null,
    categoryId: row.category_id || null,
    categoryName: resolvedCategoryName,
    category: resolvedCategoryName,
    categorySlug: category?.slug || null,
    name: row.name,
    description: cleanDescription,
    price: Number(row.price ?? 0),
    discountType: discountValue > 0 ? discountType : null,
    discountValue: discountValue > 0 ? discountValue : 0,
    imageUrl: row.image_url || null,
    isAvailable: Boolean(row.is_available),
    sortOrder: Number(row.sort_order ?? 0),
    sizes,
    extras,
    addOns: extras,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDomainProductToDb(domainInput = {}, existingMeta = null) {
  const row = {};
  if (domainInput.storeId !== undefined) row.store_id = domainInput.storeId;
  if (domainInput.categoryId !== undefined)
    row.category_id = domainInput.categoryId;
  if (domainInput.name !== undefined) row.name = domainInput.name;

  const incomingExtras =
    domainInput.extras !== undefined ? domainInput.extras : domainInput.addOns;

  const touchesDescriptionOrMeta =
    domainInput.description !== undefined ||
    domainInput.categoryName !== undefined ||
    domainInput.sizes !== undefined ||
    domainInput.discountType !== undefined ||
    domainInput.discountValue !== undefined ||
    incomingExtras !== undefined;

  if (touchesDescriptionOrMeta) {
    const baseDesc =
      domainInput.description !== undefined
        ? domainInput.description
        : existingMeta?.description ?? null;
    const mergedMeta = {
      categoryName:
        domainInput.categoryName !== undefined
          ? domainInput.categoryName
          : existingMeta?.categoryName || null,
      sizes:
        domainInput.sizes !== undefined
          ? domainInput.sizes
          : existingMeta?.sizes || [],
      extras:
        incomingExtras !== undefined
          ? incomingExtras
          : existingMeta?.extras || [],
      discountType:
        domainInput.discountType !== undefined
          ? domainInput.discountType
          : existingMeta?.discountType || null,
      discountValue:
        domainInput.discountValue !== undefined
          ? Number(domainInput.discountValue) || 0
          : existingMeta?.discountValue || 0,
    };
    row.description = packProductDescriptionAndMeta(baseDesc, mergedMeta);
  }

  if (domainInput.price !== undefined) row.price = domainInput.price;
  if (domainInput.imageUrl !== undefined) row.image_url = domainInput.imageUrl;
  if (domainInput.isAvailable !== undefined)
    row.is_available = Boolean(domainInput.isAvailable);
  if (domainInput.sortOrder !== undefined)
    row.sort_order = Number(domainInput.sortOrder ?? 0);
  return row;
}

