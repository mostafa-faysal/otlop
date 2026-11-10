/**
 * دوال العمليات المالية الموحدة والآمنة لتجنب أخطاء الفواصل العشرية (Floating Point Issues)
 * تعتمد على التحويل إلى أصغر وحدة نقدية (القروش / Cents) قبل الجمع والضرب والتقسيم.
 */

export function toCents(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents) {
  const num = Number(cents);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num) / 100;
}

export function roundMoney(amount) {
  return fromCents(toCents(amount));
}

export function addMoney(...amounts) {
  const totalCents = amounts.reduce((acc, curr) => acc + toCents(curr), 0);
  return fromCents(totalCents);
}

export function subtractMoney(minuend, ...subtrahends) {
  let cents = toCents(minuend);
  for (const s of subtrahends) {
    cents -= toCents(s);
  }
  return fromCents(Math.max(0, cents));
}

export function multiplyMoney(amount, factor) {
  const aCents = toCents(amount);
  const f = Number(factor) || 0;
  return fromCents(Math.round((aCents * f) / 100));
}

/**
 * حساب كامل الحسابات المالية للطلب من جهة السيرفر بناءً على أسعار قاعدة البيانات المعتمدة
 * وتطبيق القواعد المالية:
 * 1) إذا كان الخصم من المحل (merchant): يُطبق الخصم عنده في الإيراد، لكن عمولة المنصة تُحسب على كامل السعر قبل الخصم.
 * 2) إذا كان الخصم من المنصة (platform): المحل يستحق السعر كاملاً، وقيمة الخصم تُخصم من مستحقات المنصة على المحل.
 */
export function calculateOrderFinancials({
  items = [],
  storeDeliveryFee = 15,
  storeCommissionRate = 5,
  verifiedOffer = null,
} = {}) {
  const now = Date.now();

  // 0) التحقق الصارم من مدة صلاحية العرض (starts_at & ends_at)
  let activeOffer = verifiedOffer;
  if (activeOffer) {
    const starts = activeOffer.starts_at || activeOffer.startsAt;
    const ends = activeOffer.ends_at || activeOffer.endsAt;
    if (starts && new Date(starts).getTime() > now) {
      activeOffer = null;
    } else if (ends && new Date(ends).getTime() < now) {
      activeOffer = null;
    }
  }

  // 1) حساب الأصناف وإجمالي السلة الأصلي
  let subtotalCents = 0;
  const computedItems = items.map((it) => {
    const qty = Math.max(1, Math.min(50, Math.floor(Number(it.quantity) || 1)));
    const unitPriceCents = toCents(it.unitPrice ?? it.price ?? 0);
    const lineTotalCents = unitPriceCents * qty;
    subtotalCents += lineTotalCents;

    return {
      productId: String(it.productId || it.product_id),
      productName: String(it.name || it.productName || "صنف"),
      unitPrice: fromCents(unitPriceCents),
      quantity: qty,
      lineTotal: fromCents(lineTotalCents),
    };
  });

  const subtotal = fromCents(subtotalCents);
  let deliveryFee = roundMoney(storeDeliveryFee);
  let discountCents = 0;
  let discountBearer = "platform";
  let appliedOfferId = null;

  if (activeOffer) {
    appliedOfferId = activeOffer.id || null;
    discountBearer =
      activeOffer.store_id ||
      activeOffer.storeId ||
      activeOffer.delivery_cost_bearer === "merchant" ||
      activeOffer.bearer === "merchant"
        ? "merchant"
        : "platform";

    const offerMin = Number(
      activeOffer.min_order ?? activeOffer.minOrder ?? activeOffer.minOrderAmount ?? 0
    );
    const rawMax = activeOffer.max_discount ?? activeOffer.maxDiscount;
    const maxCap = rawMax !== null && rawMax !== undefined && Number(rawMax) > 0 ? Number(rawMax) : 0;
    const maxCapCents = maxCap > 0 ? toCents(maxCap) : Infinity;

    const discountType =
      activeOffer.discount_type || activeOffer.discountType || "percentage";
    const discountValue = Number(
      activeOffer.discount_value ?? activeOffer.discountValue ?? 0
    );

    // تحديد نطاق تطبيق الخصم (Scope)
    const rawScope = activeOffer.applies_to || activeOffer.appliesTo;
    const scope =
      (discountType === "free_delivery" || discountType === "delivery_discount" || rawScope === "delivery" || rawScope === "delivery_discount")
        ? "delivery"
        : (rawScope === "specific" || rawScope === "specific_items" || rawScope === "selected_items" || activeOffer.product_ids?.length || activeOffer.productIds?.length || activeOffer.targetItemIds?.length)
        ? "specific_items"
        : (rawScope === "all" || rawScope === "all_menu" || rawScope === "menu" || rawScope === "order_total")
        ? "all_menu"
        : activeOffer.code
        ? "coupon"
        : "all_menu";

    // ─── أولاً: خصم التوصيل (delivery_discount أو free_delivery) ───
    if (scope === "delivery" || discountType === "free_delivery" || discountType === "delivery_discount") {
      // مشروط بالحد الأدنى للطلب (min_order)
      if (offerMin === 0 || subtotal >= offerMin) {
        let deliveryDiscCents = 0;
        if (discountType === "free_delivery") {
          deliveryDiscCents = toCents(deliveryFee);
        } else if (discountType === "percentage") {
          const pct = Math.max(0, Math.min(100, discountValue));
          deliveryDiscCents = Math.round((toCents(deliveryFee) * pct) / 100);
        } else {
          deliveryDiscCents = Math.min(toCents(deliveryFee), toCents(discountValue));
        }

        if (maxCapCents < Infinity) {
          deliveryDiscCents = Math.min(deliveryDiscCents, maxCapCents);
        }

        deliveryFee = fromCents(Math.max(0, toCents(deliveryFee) - deliveryDiscCents));
      }
    }
    // ─── ثانياً: الخصم على صنف محدد أو أصناف مختارة (specific_items) ───
    else if (scope === "specific_items" || scope === "specific") {
      // يطبّق الخصم فوراً ومباشرة بمجرد إضافة الصنف دون اشتراط حد أدنى للسلة
      const targetIds = new Set(
        (activeOffer.product_ids || activeOffer.productIds || activeOffer.targetItemIds || []).map(String)
      );

      let itemsDiscountCents = 0;
      computedItems.forEach((it) => {
        if (targetIds.has(String(it.productId))) {
          const itPriceCents = toCents(it.unitPrice);
          let singleDisc = 0;
          if (discountType === "percentage") {
            const pct = Math.max(0, Math.min(100, discountValue));
            singleDisc = Math.round((itPriceCents * pct) / 100);
          } else {
            singleDisc = Math.min(itPriceCents, toCents(discountValue));
          }
          itemsDiscountCents += singleDisc * it.quantity;
        }
      });

      if (maxCapCents < Infinity) {
        itemsDiscountCents = Math.min(itemsDiscountCents, maxCapCents);
      }
      discountCents = Math.min(subtotalCents, itemsDiscountCents);
    }
    // ─── ثالثاً: الخصم على كامل المنيو أو توتال الطلب (all_menu) أو الكوبونات (coupon) ───
    else {
      // يُشترط وصول قيمة السلة إلى الحد الأدنى المحدد للعرض أو الكوبون (min_order)
      if (offerMin === 0 || subtotal >= offerMin) {
        let orderDiscCents = 0;
        if (discountType === "percentage") {
          const pct = Math.max(0, Math.min(100, discountValue));
          orderDiscCents = Math.round((subtotalCents * pct) / 100);
        } else {
          orderDiscCents = Math.min(subtotalCents, toCents(discountValue));
        }

        if (maxCapCents < Infinity) {
          orderDiscCents = Math.min(orderDiscCents, maxCapCents);
        }
        discountCents = Math.min(subtotalCents, orderDiscCents);
      }
    }
  }

  const discount = fromCents(discountCents);

  // 3) الإجمالي النهائي المستحق على العميل (المجموع + التوصيل - الخصم)
  const totalCents = Math.max(0, subtotalCents + toCents(deliveryFee) - discountCents);
  const total = fromCents(totalCents);

  // 4) حساب استحقاق التاجر وعمولة المنصة
  const commissionRate = Math.max(0, Math.min(100, Number(storeCommissionRate) || 0));

  // وعاء العمولة دائماً على السعر الأصلي دون الخصم ("نسبة المحل تبقا من غير الخصم")
  const commissionBaseCents = subtotalCents;
  const platformCommissionCents = Math.round((commissionBaseCents * commissionRate) / 100);

  let merchantGrossCents = subtotalCents;
  let platformDiscountCreditCents = 0;
  let netPlatformCommissionDuesCents = platformCommissionCents;
  let netMerchantEarningsCents = 0;

  if (discountBearer === "merchant" || discountBearer === "store") {
    // الخصم من المحل: يُخصم من إيراد المحل، وتُحسب عمولة المنصة على السعر الأصلي كاملاً
    merchantGrossCents = Math.max(0, subtotalCents - discountCents);
    netMerchantEarningsCents = Math.max(0, merchantGrossCents - platformCommissionCents);
    platformDiscountCreditCents = 0;
    netPlatformCommissionDuesCents = platformCommissionCents;
  } else {
    // الخصم من المنصة: المحل يستحق السعر كاملاً، وقيمة الخصم تُخصم من مستحقات المنصة على المحل
    merchantGrossCents = subtotalCents;
    platformDiscountCreditCents = discountCents;
    netPlatformCommissionDuesCents = platformCommissionCents - platformDiscountCreditCents;
    netMerchantEarningsCents = Math.max(0, subtotalCents - platformCommissionCents);
  }

  return {
    items: computedItems,
    subtotal,
    deliveryFee,
    discount,
    discountBearer,
    appliedOfferId,
    total,
    commissionRate,
    commissionBaseAmount: fromCents(commissionBaseCents),
    merchantGross: fromCents(merchantGrossCents),
    commissionAmount: fromCents(platformCommissionCents),
    platformDiscountCredit: fromCents(platformDiscountCreditCents),
    netPlatformCommissionDues: fromCents(netPlatformCommissionDuesCents),
    netMerchantEarnings: fromCents(netMerchantEarningsCents),
  };
}
