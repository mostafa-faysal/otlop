import { AppError } from "../../http/AppError.js";
import { normalizeEgyptianPhone } from "../auth/auth.validator.js";

export function validateCategoryInput(body = {}, isPartial = false) {
  const domainCategory = {};
  if (!isPartial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 50) {
      throw new AppError({
        code: "validation_error",
        message: "اسم القسم يجب أن يكون بين حرفين و50 حرفًا.",
        status: 422,
      });
    }
    domainCategory.name = name;
  }

  if (!isPartial || body.slug !== undefined) {
    let slug = String(body.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) {
      slug = `cat-${Date.now()}`;
    }
    // دعم الحروف العربية والإنجليزية والأرقام والشرطات لمنع الخطأ عند كتابة اسم عربي
    if (!/^[\u0600-\u06FFa-z0-9]+(-[\u0600-\u06FFa-z0-9]+)*$/i.test(slug)) {
      slug = `cat-${Date.now()}`;
    }
    domainCategory.slug = slug;
  }

  if (
    body.iconUrl !== undefined ||
    body.icon_url !== undefined ||
    body.imageUrl !== undefined ||
    body.image_url !== undefined
  ) {
    domainCategory.iconUrl =
      body.iconUrl ?? body.icon_url ?? body.imageUrl ?? body.image_url ?? null;
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    domainCategory.sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0);
  }
  if (body.isActive !== undefined || body.is_active !== undefined) {
    domainCategory.isActive = Boolean(body.isActive ?? body.is_active);
  }

  return domainCategory;
}

export function validateStoreInput(
  body = {},
  { isAdmin = false, isPartial = false } = {}
) {
  // حماية صارمة: منع التاجر من محاولة تمرير isActive أو commissionRate أو ownerId
  if (!isAdmin) {
    if (
      body.isActive !== undefined ||
      body.is_active !== undefined ||
      body.commissionRate !== undefined ||
      body.commission_rate !== undefined ||
      body.ownerId !== undefined ||
      body.owner_id !== undefined
    ) {
      throw new AppError({
        code: "forbidden_admin_only",
        message:
          "تفعيل المتجر أو التحكم في نسبة العمولة متاح للسوبر أدمن حصريًا.",
        status: 403,
      });
    }
  }

  const domainStore = {};
  if (body.isOpen !== undefined || body.is_open !== undefined) {
    domainStore.isOpen = Boolean(body.isOpen ?? body.is_open);
  }

  if (!isPartial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 80) {
      throw new AppError({
        code: "validation_error",
        message: "اسم المتجر يجب أن يكون بين حرفين و80 حرفًا.",
        status: 422,
      });
    }
    domainStore.name = name;
  }

  if (!isPartial || body.slug !== undefined) {
    let rawSlug = String(body.slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!rawSlug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rawSlug)) {
      const catPrefix = String(body.categorySlug || "store")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
      rawSlug = `${catPrefix || "store"}-${Date.now().toString(36)}`;
    }
    domainStore.slug = rawSlug;
  }

  if (body.categorySlug !== undefined) {
    domainStore.categorySlug = String(body.categorySlug || "").trim();
  }
  if (body.categoryName !== undefined) {
    domainStore.categoryName = String(body.categoryName || "").trim();
  }

  if (body.description !== undefined) {
    domainStore.description = body.description
      ? String(body.description).trim()
      : null;
  }
  if (body.logoUrl !== undefined || body.logo_url !== undefined) {
    domainStore.logoUrl = body.logoUrl ?? body.logo_url ?? null;
  }
  if (body.coverUrl !== undefined || body.cover_url !== undefined) {
    domainStore.coverUrl = body.coverUrl ?? body.cover_url ?? null;
  }
  if (body.phone !== undefined) {
    if (!body.phone) {
      domainStore.phone = null;
    } else {
      const normalized = normalizeEgyptianPhone(String(body.phone));
      if (!normalized) {
        throw new AppError({
          code: "invalid_phone",
          message: "رقم هاتف المتجر غير صالح.",
          status: 422,
        });
      }
      domainStore.phone = normalized;
    }
  }
  if (body.address !== undefined) {
    domainStore.address = body.address ? String(body.address).trim() : null;
  }
  if (body.deliveryFee !== undefined || body.delivery_fee !== undefined) {
    const fee = Number(body.deliveryFee ?? body.delivery_fee);
    if (!Number.isFinite(fee) || fee < 0) {
      throw new AppError({
        code: "validation_error",
        message: "رسوم التوصيل يجب أن تكون صفر أو أكثر.",
        status: 422,
      });
    }
    domainStore.deliveryFee = fee;
  }
  if (
    body.deliveryMinutes !== undefined ||
    body.delivery_minutes !== undefined
  ) {
    const mins = Number(body.deliveryMinutes ?? body.delivery_minutes);
    if (!Number.isInteger(mins) || mins < 5 || mins > 180) {
      throw new AppError({
        code: "validation_error",
        message: "مدة التوصيل يجب أن تكون بين 5 و180 دقيقة.",
        status: 422,
      });
    }
    domainStore.deliveryMinutes = mins;
  }
  if (body.minOrder !== undefined || body.min_order !== undefined) {
    const minOrd = Number(body.minOrder ?? body.min_order);
    if (!Number.isFinite(minOrd) || minOrd < 0) {
      throw new AppError({
        code: "validation_error",
        message: "الحد الأدنى للطلب يجب أن يكون صفر أو أكثر.",
        status: 422,
      });
    }
    domainStore.minOrder = minOrd;
  }

  // يمكن لكل من التاجر والأدمن فتح أو إغلاق المتجر مؤقتاً
  if (body.isOpen !== undefined || body.is_open !== undefined) {
    domainStore.isOpen = Boolean(body.isOpen ?? body.is_open);
  } else if (!isPartial) {
    domainStore.isOpen = true;
  }

  // إدارة التفعيل والإيقاف لعدم الدفع
  if (body.isActive !== undefined || body.is_active !== undefined) {
    domainStore.isActive = Boolean(body.isActive ?? body.is_active);
  } else if (!isPartial) {
    domainStore.isActive = true;
  }

  if (body.suspensionReason !== undefined || body.suspension_reason !== undefined || body.reason !== undefined) {
    domainStore.suspensionReason =
      body.suspensionReason ?? body.suspension_reason ?? body.reason ?? null;
  }
  if (body.suspendedAt !== undefined || body.suspended_at !== undefined) {
    domainStore.suspendedAt = body.suspendedAt ?? body.suspended_at ?? null;
  }
  if (body.reactivatedAt !== undefined || body.reactivated_at !== undefined) {
    domainStore.reactivatedAt = body.reactivatedAt ?? body.reactivated_at ?? null;
  }

  if (isAdmin) {
    if (body.ownerId !== undefined || body.owner_id !== undefined) {
      domainStore.ownerId = body.ownerId ?? body.owner_id ?? null;
    }
    if (
      body.commissionRate !== undefined ||
      body.commission_rate !== undefined
    ) {
      const rate = Number(body.commissionRate ?? body.commission_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        throw new AppError({
          code: "validation_error",
          message: "نسبة العمولة يجب أن تكون بين 0 و100.",
          status: 422,
        });
      }
      domainStore.commissionRate = rate;
    }
  }

  return domainStore;
}

export function validateProductInput(body = {}, isPartial = false) {
  const domainProduct = {};
  if (!isPartial) {
    const storeId = body.storeId || body.store_id;
    if (!storeId) {
      throw new AppError({
        code: "validation_error",
        message: "معرف المتجر مطلوب لإضافة الصنف.",
        status: 422,
      });
    }
    domainProduct.storeId = storeId;
  }

  if (body.categoryId !== undefined || body.category_id !== undefined) {
    domainProduct.categoryId = body.categoryId ?? body.category_id ?? null;
  }
  if (body.category !== undefined || body.categoryName !== undefined) {
    const catName = String(body.categoryName ?? body.category ?? "").trim();
    domainProduct.categoryName = catName || null;
  }
  if (body.sizes !== undefined) {
    if (Array.isArray(body.sizes)) {
      domainProduct.sizes = body.sizes
        .map((s, idx) => ({
          id: s?.id || `sz_${idx + 1}`,
          name: String(s?.name || "").trim(),
          extraPrice:
            idx === 0 ? 0 : Math.max(0, Number(s?.extraPrice ?? s?.price ?? 0) || 0),
        }))
        .filter((s) => s.name.length > 0);
    } else {
      domainProduct.sizes = [];
    }
  }
  if (body.extras !== undefined || body.addOns !== undefined) {
    const rawExtras = body.extras ?? body.addOns;
    if (Array.isArray(rawExtras)) {
      domainProduct.extras = rawExtras
        .map((ex, idx) => ({
          id: ex?.id || `ex_${idx + 1}`,
          name: String(ex?.name || "").trim(),
          price: Math.max(0, Number(ex?.price ?? 0) || 0),
        }))
        .filter((ex) => ex.name.length > 0);
    } else {
      domainProduct.extras = [];
    }
  }
  if (!isPartial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 100) {
      throw new AppError({
        code: "validation_error",
        message: "اسم الصنف يجب أن يكون بين حرفين و100 حرف.",
        status: 422,
      });
    }
    domainProduct.name = name;
  }
  if (body.description !== undefined) {
    domainProduct.description = body.description
      ? String(body.description).trim()
      : null;
  }
  if (!isPartial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError({
        code: "validation_error",
        message: "سعر الصنف يجب أن يكون رقمًا موجبًا.",
        status: 422,
      });
    }
    domainProduct.price = price;
  }
  if (body.imageUrl !== undefined || body.image_url !== undefined) {
    domainProduct.imageUrl = body.imageUrl ?? body.image_url ?? null;
  }
  if (body.isAvailable !== undefined || body.is_available !== undefined) {
    domainProduct.isAvailable = Boolean(body.isAvailable ?? body.is_available);
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    domainProduct.sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0);
  }
  if (body.discountType !== undefined || body.discount_type !== undefined) {
    const dt = body.discountType ?? body.discount_type;
    domainProduct.discountType = dt === "percentage" || dt === "fixed" ? dt : null;
  }
  if (body.discountValue !== undefined || body.discount_value !== undefined) {
    const dv = Number(body.discountValue ?? body.discount_value);
    domainProduct.discountValue = Number.isFinite(dv) && dv > 0 ? dv : 0;
  }

  return domainProduct;
}

export function validateOfferInput(body = {}, isPartial = false) {
  const domainOffer = {};
  if (
    !isPartial ||
    body.storeId !== undefined ||
    body.store_id !== undefined
  ) {
    domainOffer.storeId = body.storeId ?? body.store_id ?? null;
  }
  if (!isPartial || body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (title.length < 3 || title.length > 100) {
      throw new AppError({
        code: "validation_error",
        message: "عنوان العرض يجب أن يكون بين 3 أحرف و100 حرف.",
        status: 422,
      });
    }
    domainOffer.title = title;
  }
  if (body.description !== undefined) {
    domainOffer.description = body.description
      ? String(body.description).trim()
      : null;
  }
  if (body.code !== undefined) {
    domainOffer.code = body.code
      ? String(body.code).trim().toUpperCase()
      : null;
  }
  if (
    !isPartial ||
    body.discountType !== undefined ||
    body.discount_type !== undefined
  ) {
    const dt = body.discountType ?? body.discount_type;
    if (
      !["percentage", "fixed_amount", "fixed_price", "free_delivery", "delivery_discount"].includes(
        dt
      )
    ) {
      throw new AppError({
        code: "validation_error",
        message: "نوع الخصم غير صالح.",
        status: 422,
      });
    }
    domainOffer.discountType = dt;
  }
  if (
    !isPartial ||
    body.discountValue !== undefined ||
    body.discount_value !== undefined
  ) {
    domainOffer.discountValue = Number(
      body.discountValue ?? body.discount_value ?? 0
    );
  }
  if (
    !isPartial ||
    body.appliesTo !== undefined ||
    body.applies_to !== undefined
  ) {
    domainOffer.appliesTo = body.appliesTo ?? body.applies_to ?? "all";
  }
  if (body.minOrder !== undefined || body.min_order !== undefined) {
    domainOffer.minOrder = Number(body.minOrder ?? body.min_order ?? 0);
  }
  if (body.maxDiscount !== undefined || body.max_discount !== undefined) {
    const md = body.maxDiscount ?? body.max_discount;
    domainOffer.maxDiscount =
      md !== null && md !== undefined && md !== "" && Number(md) > 0
        ? Number(md)
        : null;
  }
  if (body.priority !== undefined) {
    domainOffer.priority = Number(body.priority);
  }
  if (body.usageLimit !== undefined || body.usage_limit !== undefined) {
    const ul = body.usageLimit ?? body.usage_limit;
    domainOffer.usageLimit =
      ul !== null && ul !== undefined ? Number(ul) : null;
  }
  if (
    body.deliveryCostBearer !== undefined ||
    body.delivery_cost_bearer !== undefined
  ) {
    domainOffer.deliveryCostBearer =
      body.deliveryCostBearer ?? body.delivery_cost_bearer ?? null;
  }
  if (
    domainOffer.discountType &&
    domainOffer.discountType !== "free_delivery"
  ) {
    domainOffer.deliveryCostBearer = null;
  } else if (
    domainOffer.discountType === "free_delivery" &&
    !domainOffer.deliveryCostBearer
  ) {
    domainOffer.deliveryCostBearer = "store";
  }

  if (body.status !== undefined) {
    domainOffer.status = body.status;
  }
  if (
    body.startsAt !== undefined ||
    body.starts_at !== undefined ||
    body.startDate !== undefined
  ) {
    domainOffer.startsAt =
      body.startsAt ?? body.starts_at ?? body.startDate ?? null;
  }
  if (
    body.endsAt !== undefined ||
    body.ends_at !== undefined ||
    body.endDate !== undefined
  ) {
    domainOffer.endsAt = body.endsAt ?? body.ends_at ?? body.endDate ?? null;
  }
  if (body.isPublic !== undefined || body.is_public !== undefined) {
    domainOffer.isPublic = Boolean(body.isPublic ?? body.is_public);
  }

  return domainOffer;
}
