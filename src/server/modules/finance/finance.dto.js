export function toFinancialSummaryDTO(entity) {
  if (!entity) return null;
  return {
    storeId: entity.storeId,
    storeName: entity.storeName,
    commissionRate: Number(entity.commissionRate ?? 0),
    storeIsActive: Boolean(entity.storeIsActive),
    storeIsOpen: Boolean(entity.storeIsOpen),
    suspensionReason: entity.suspensionReason || null,
    totalOrders: Number(entity.totalOrders ?? 0),
    deliveredOrders: Number(entity.deliveredOrders ?? 0),
    cancelledOrders: Number(entity.cancelledOrders ?? 0),
    grossItemsSales: Number(entity.grossItemsSales ?? 0),
    totalDiscounts: Number(entity.totalDiscounts ?? 0),
    netItemsSales: Number(entity.netItemsSales ?? 0),
    totalDeliveryFees: Number(entity.totalDeliveryFees ?? 0),
    totalPlatformCommission: Number(entity.totalPlatformCommission ?? 0),
    totalPaid: Number(entity.totalPaid ?? 0),
    currentDebt: Number(entity.currentDebt ?? 0),
    netMerchantReceivables: Number(entity.netMerchantReceivables ?? 0),
  };
}

export function toSalesReportDTO(entity) {
  if (!entity) return null;
  return {
    storeId: entity.storeId,
    storeName: entity.storeName,
    reportDate: entity.reportDate || entity.saleDate || null,
    saleDate: entity.saleDate || entity.reportDate || null,
    totalOrdersCount: Number(entity.totalOrdersCount ?? 0),
    deliveredOrdersCount: Number(entity.deliveredOrdersCount ?? 0),
    cancelledOrdersCount: Number(entity.cancelledOrdersCount ?? 0),
    grossItemsSales: Number(entity.grossItemsSales ?? 0),
    itemsDiscounts: Number(entity.itemsDiscounts ?? 0),
    cartDiscounts: Number(entity.cartDiscounts ?? 0),
    totalDiscountsGiven: Number(entity.totalDiscountsGiven ?? 0),
    netItemsSubtotal: Number(entity.netItemsSubtotal ?? 0),
    totalDeliveryFees: Number(entity.totalDeliveryFees ?? 0),
    totalPlatformCommission: Number(entity.totalPlatformCommission ?? 0),
    netMerchantEarnings: Number(entity.netMerchantEarnings ?? 0),
  };
}

export function toLedgerEntryDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    storeId: entity.storeId,
    orderId: entity.orderId || null,
    orderNumber: entity.orderNumber || null,
    entryType: entity.entryType,
    amount: Number(entity.amount ?? 0),
    notes: entity.notes || null,
    createdAt: entity.createdAt || null,
  };
}

export function toMonthlyStatementDTO(entity) {
  if (!entity) return null;
  const commissionTotal = Number(entity.commissionTotal ?? 0);
  const paidAmount = Number(entity.paidAmount ?? 0);
  const remainingAmount =
    entity.remainingAmount !== undefined && entity.remainingAmount !== null
      ? Number(entity.remainingAmount)
      : Math.max(0, Number((commissionTotal - paidAmount).toFixed(2)));

  return {
    id: entity.id,
    storeId: entity.storeId,
    storeName: entity.storeName || entity.store?.name || null,
    statementNumber: entity.statementNumber,
    year: Number(entity.year),
    month: Number(entity.month),
    ordersCount: Number(entity.ordersCount ?? 0),
    grossSales: Number(entity.grossSales ?? 0),
    totalDiscounts: Number(entity.totalDiscounts ?? 0),
    itemsSubtotal: Number(entity.itemsSubtotal ?? 0),
    deliveryFees: Number(entity.deliveryFees ?? 0),
    commissionTotal,
    paidAmount,
    remainingAmount,
    status: entity.status,
    dueDate: entity.dueDate,
    isClosed: Boolean(entity.isClosed),
    closedAt: entity.closedAt || null,
    notes: entity.notes || null,
    createdAt: entity.createdAt || null,
    updatedAt: entity.updatedAt || null,
  };
}

export function toMerchantPaymentDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    storeId: entity.storeId,
    statementId: entity.statementId || null,
    statementNumber: entity.statementNumber || null,
    amount: Number(entity.amount ?? 0),
    paymentDate: entity.paymentDate || null,
    paymentMethod: entity.paymentMethod,
    referenceNumber: entity.referenceNumber || null,
    notes: entity.notes || null,
    recordedBy: entity.recordedBy,
    createdAt: entity.createdAt || null,
  };
}
