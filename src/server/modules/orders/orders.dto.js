export function toCreateOrderResultDTO(entity = {}) {
  if (!entity) return null;
  return {
    id: entity.id || entity.orderId,
    orderId: entity.orderId || entity.id,
    orderNumber: entity.orderNumber,
    status: entity.status || "pending",
    originalSubtotal: Number(entity.originalSubtotal ?? entity.subtotal ?? 0),
    subtotal: Number(entity.subtotal ?? 0),
    deliveryFee: Number(entity.deliveryFee ?? 0),
    discount: Number(entity.discount ?? 0),
    discountAmount: Number(entity.discountAmount ?? entity.discount ?? 0),
    discountBearer: entity.discountBearer || "platform",
    serviceFee: Number(entity.serviceFee ?? 0),
    total: Number(entity.total ?? 0),
    currency: entity.currency || "EGP",
    trackingToken: entity.trackingToken || null,
    items: Array.isArray(entity.items) ? entity.items.map(toOrderItemDTO) : [],
  };
}

/**
 * تحويل كيان الطلب (OrderEntity) إلى DTO مع إخفاء تفاصيل عمولة المنصة عن العميل العادي
 */
export function toOrderDTO(entity, { includeMerchantFinancials = false } = {}) {
  if (!entity) return null;
  const dto = {
    id: entity.id,
    orderNumber: entity.orderNumber,
    customerId: entity.customerId || null,
    storeId: entity.storeId,
    store: entity.store
      ? {
          id: entity.store.id || null,
          name: entity.store.name,
          slug: entity.store.slug,
          address: entity.store.address || null,
          phone: entity.store.phone ?? null,
          logoUrl: entity.store.logoUrl || null,
        }
      : null,
    customerName: entity.customerName,
    customerPhone: entity.customerPhone || null,
    deliveryAddress: entity.deliveryAddress,
    deliveryLat:
      entity.deliveryLat !== null && entity.deliveryLat !== undefined
        ? Number(entity.deliveryLat)
        : null,
    deliveryLng:
      entity.deliveryLng !== null && entity.deliveryLng !== undefined
        ? Number(entity.deliveryLng)
        : null,
    notes: entity.notes || null,
    status: entity.status,
    paymentMethod: entity.paymentMethod,
    currency: entity.currency || "EGP",
    couponCode: entity.couponCode || null,
    discountBearer: entity.discountBearer || "platform",
    originalSubtotal: Number(entity.originalSubtotal ?? 0),
    subtotal: Number(entity.subtotal ?? 0),
    originalDeliveryFee: Number(entity.originalDeliveryFee ?? 0),
    deliveryFee: Number(entity.deliveryFee ?? 0),
    discount: Number(entity.discount ?? 0),
    discountAmount: Number(entity.discountAmount ?? entity.discount ?? 0),
    serviceFee: Number(entity.serviceFee ?? 0),
    total: Number(entity.total ?? 0),
    cancellationReason: entity.cancellationReason ?? null,
    deliveredAt: entity.deliveredAt || null,
    createdAt: entity.createdAt || null,
    updatedAt: entity.updatedAt || null,
    items: Array.isArray(entity.items)
      ? entity.items.map((it) => ({
          ...toOrderItemDTO(it),
          name: it.productName || it.name,
          price: Number(it.unitPrice ?? it.price ?? 0),
        }))
      : [],
  };

  if (includeMerchantFinancials) {
    dto.commissionRateSnapshot = Number(entity.commissionRateSnapshot ?? 0);
    dto.commissionBaseAmount = Number(entity.commissionBaseAmount ?? entity.subtotal ?? 0);
    dto.platformCommission = Number(entity.platformCommission ?? entity.commissionAmount ?? 0);
    dto.merchantGross = Number(entity.merchantGross ?? entity.subtotal ?? 0);
    dto.platformDiscountCredit = Number(entity.platformDiscountCredit ?? 0);
    dto.netPlatformCommissionDues = Number(entity.netPlatformCommissionDues ?? entity.platformCommission ?? 0);
    dto.netMerchantEarnings = Number(entity.netMerchantEarnings ?? 0);
  }

  return dto;
}

export function toOrderItemDTO(itemEntity) {
  if (!itemEntity) return null;
  return {
    id: itemEntity.id,
    productId: itemEntity.productId || null,
    productName: itemEntity.productName,
    originalPrice: Number(itemEntity.originalPrice ?? 0),
    unitPrice: Number(itemEntity.unitPrice ?? 0),
    discountAmount: Number(itemEntity.discountAmount ?? 0),
    quantity: Number(itemEntity.quantity ?? 1),
    lineTotal: Number(itemEntity.lineTotal ?? 0),
  };
}

export function toOrderEventDTO(eventEntity) {
  if (!eventEntity) return null;
  return {
    id: eventEntity.id,
    status: eventEntity.status,
    actorId: eventEntity.actorId || null,
    note: eventEntity.note || null,
    createdAt: eventEntity.createdAt,
  };
}
