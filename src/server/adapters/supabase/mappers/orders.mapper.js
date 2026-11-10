export function mapDbCreateOrderResultToDomain(rpcResult = {}) {
  if (!rpcResult) return null;
  return {
    orderId: rpcResult.order_id,
    orderNumber: rpcResult.order_number,
    originalSubtotal: Number(rpcResult.original_subtotal ?? 0),
    subtotal: Number(rpcResult.subtotal ?? 0),
    deliveryFee: Number(rpcResult.delivery_fee ?? 0),
    discount: Number(rpcResult.discount ?? 0),
    serviceFee: Number(rpcResult.service_fee ?? 0),
    total: Number(rpcResult.total ?? 0),
    currency: rpcResult.currency || "EGP",
    trackingToken: rpcResult.tracking_token || null,
  };
}

export function mapDbOrderItemToDomain(item) {
  if (!item) return null;
  return {
    id: item.id || null,
    orderId: item.order_id || null,
    productId: item.product_id || null,
    productName: item.product_name || item.name,
    originalPrice: Number(item.original_price ?? item.unit_price ?? 0),
    unitPrice: Number(item.unit_price ?? item.price ?? 0),
    discountAmount: Number(item.discount_amount ?? 0),
    offerId: item.offer_id || null,
    quantity: Number(item.quantity ?? 1),
    lineTotal: Number(item.line_total ?? 0),
  };
}

export function mapDbOrderEventToDomain(event) {
  if (!event) return null;
  return {
    id: event.id || null,
    orderId: event.order_id || null,
    status: event.status || event.to_status,
    actorId: event.actor_id || null,
    note: event.note || null,
    createdAt: event.created_at || event.at || null,
  };
}

export function mapDbOrderToDomain(row, { items = null, events = null } = {}) {
  if (!row) return null;

  const mappedEvents = Array.isArray(events)
    ? events.map(mapDbOrderEventToDomain).filter(Boolean)
    : Array.isArray(row.events)
    ? row.events.map(mapDbOrderEventToDomain).filter(Boolean)
    : [];

  const deliveredEvent = mappedEvents.find((ev) => ev.status === "delivered");

  const subtotal = Number(row.subtotal ?? 0);
  const discount = Number(row.discount ?? row.discount_amount ?? row.discountAmount ?? 0);
  const discountBearer = row.discount_bearer || row.discountBearer || (row.coupon_code || row.couponCode ? "platform" : "merchant");
  const commissionRateSnapshot = Number(row.commission_rate_snapshot ?? row.commission_rate ?? row.commissionRate ?? 5);

  const merchantGross = discountBearer === "platform"
    ? subtotal
    : Math.max(0, subtotal - discount);

  const platformCommission = Number(
    row.platform_commission ??
    row.commission_amount ??
    row.commissionAmount ??
    ((merchantGross * commissionRateSnapshot) / 100)
  );

  return {
    id: row.id || null,
    orderNumber: row.order_number,
    customerId: row.customer_id || null,
    storeId: row.store_id || null,
    addressId: row.address_id || null,
    store: row.stores
      ? {
          id: row.stores.id || null,
          name: row.stores.name,
          slug: row.stores.slug,
          address: row.stores.address || null,
          phone: null,
          logoUrl: row.stores.logo_url || null,
        }
      : row.store
      ? {
          id: row.store.id || null,
          name: row.store.name,
          slug: row.store.slug,
          address: row.store.address || null,
          phone: null,
          logoUrl: row.store.logo_url || null,
        }
      : null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || null,
    deliveryAddress: row.delivery_address,
    deliveryLat:
      row.delivery_lat !== null && row.delivery_lat !== undefined
        ? Number(row.delivery_lat)
        : null,
    deliveryLng:
      row.delivery_lng !== null && row.delivery_lng !== undefined
        ? Number(row.delivery_lng)
        : null,
    notes: row.notes || null,
    status: row.status,
    paymentMethod: row.payment_method || "cod",
    currency: row.currency || "EGP",
    couponCode: row.coupon_code || null,
    offerId: row.offer_id || null,
    originalSubtotal: Number(row.original_subtotal ?? subtotal),
    subtotal,
    originalDeliveryFee: Number(
      row.original_delivery_fee ?? row.delivery_fee ?? 0
    ),
    deliveryFee: Number(row.delivery_fee ?? 0),
    freeDeliveryBearer: row.free_delivery_bearer || null,
    discount,
    discountAmount: discount,
    discountBearer,
    serviceFee: Number(row.service_fee ?? 0),
    total: Number(row.total ?? 0),
    commissionRateSnapshot,
    commissionRate: commissionRateSnapshot,
    commissionBaseAmount: Number(row.commission_base_amount ?? merchantGross),
    platformCommission,
    commissionAmount: platformCommission,
    netMerchantEarnings: Number(
      row.net_merchant_earnings ??
      row.netMerchantEarnings ??
      Math.max(0, merchantGross - platformCommission)
    ),
    cancellationReason: null,
    deliveredAt: deliveredEvent?.createdAt || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    items: Array.isArray(items)
      ? items.map(mapDbOrderItemToDomain).filter(Boolean)
      : Array.isArray(row.order_items)
      ? row.order_items.map(mapDbOrderItemToDomain).filter(Boolean)
      : Array.isArray(row.items)
      ? row.items.map(mapDbOrderItemToDomain).filter(Boolean)
      : [],
    events: mappedEvents,
  };
}

