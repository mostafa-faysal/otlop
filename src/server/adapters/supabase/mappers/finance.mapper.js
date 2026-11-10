export function mapDbFinancialSummaryToDomain(row) {
  if (!row) return null;
  return {
    storeId: row.store_id,
    storeName: row.store_name,
    commissionRate: Number(row.commission_rate ?? 0),
    storeIsActive: Boolean(row.store_is_active),
    storeIsOpen: Boolean(row.store_is_open),
    suspensionReason: row.suspension_reason || null,
    totalOrders: Number(row.total_orders ?? 0),
    deliveredOrders: Number(row.delivered_orders ?? 0),
    cancelledOrders: Number(row.cancelled_orders ?? 0),
    grossItemsSales: Number(row.gross_items_sales ?? 0),
    totalDiscounts: Number(row.total_discounts ?? 0),
    netItemsSales: Number(row.net_items_sales ?? 0),
    totalDeliveryFees: Number(row.total_delivery_fees ?? 0),
    totalPlatformCommission: Number(row.total_platform_commission ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    currentDebt: Number(row.current_debt ?? 0),
    netMerchantReceivables: Number(row.net_merchant_receivables ?? 0),
  };
}

export function mapDbSalesReportToDomain(row) {
  if (!row) return null;
  const reportDate = row.sale_date || row.report_date || null;
  const deliveredOrdersCount = Number(
    row.delivered_orders ?? row.delivered_orders_count ?? 0
  );
  const cancelledOrdersCount = Number(
    row.cancelled_orders ?? row.cancelled_orders_count ?? 0
  );
  const grossItemsSales = Number(row.gross_items_sales ?? 0);
  const totalDiscountsGiven = Number(
    row.total_discounts ?? row.total_discounts_given ?? 0
  );
  const netItemsSubtotal = Number(
    row.net_items_sales ?? row.net_items_subtotal ?? 0
  );
  const totalDeliveryFees = Number(
    row.delivery_fees ?? row.total_delivery_fees ?? 0
  );
  const totalPlatformCommission = Number(
    row.platform_commission ?? row.total_platform_commission ?? 0
  );
  const netMerchantEarnings = Number(row.net_merchant_earnings ?? 0);

  return {
    storeId: row.store_id,
    storeName: row.store_name,
    reportDate,
    saleDate: reportDate,
    totalOrdersCount: Number(row.total_orders ?? 0),
    deliveredOrdersCount,
    cancelledOrdersCount,
    grossItemsSales,
    itemsDiscounts: Number(row.items_discounts ?? 0),
    cartDiscounts: Number(row.cart_discounts ?? 0),
    totalDiscountsGiven,
    netItemsSubtotal,
    totalDeliveryFees,
    totalPlatformCommission,
    netMerchantEarnings,
  };
}

export function mapDbLedgerEntryToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    orderId: row.order_id || null,
    orderNumber: row.orders?.order_number || row.orderNumber || null,
    entryType: row.entry_type,
    amount: Number(row.amount ?? 0),
    notes: row.notes || null,
    createdAt: row.created_at || null,
  };
}

export function mapDbMonthlyStatementToDomain(row) {
  if (!row) return null;
  const commissionTotal = Number(row.commission_total ?? 0);
  const paidAmount = Number(row.paid_amount ?? 0);
  const remainingAmount =
    row.remaining_balance !== undefined && row.remaining_balance !== null
      ? Number(row.remaining_balance)
      : Math.max(0, Number((commissionTotal - paidAmount).toFixed(2)));

  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.stores?.name || null,
    store: row.stores
      ? {
          id: row.stores.id,
          name: row.stores.name,
          slug: row.stores.slug || null,
        }
      : null,
    statementNumber: row.statement_number,
    year: Number(row.year),
    month: Number(row.month),
    ordersCount: Number(row.orders_count ?? 0),
    grossSales: Number(row.gross_sales ?? 0),
    totalDiscounts: Number(row.total_discounts ?? 0),
    itemsSubtotal: Number(row.items_subtotal ?? 0),
    deliveryFees: Number(row.delivery_fees ?? 0),
    commissionTotal,
    paidAmount,
    remainingAmount,
    status: row.status,
    dueDate: row.due_date,
    isClosed: Boolean(row.is_closed),
    closedAt: row.closed_at || null,
    notes: row.notes || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDbMerchantPaymentToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    statementId: row.statement_id || null,
    statementNumber:
      row.merchant_monthly_statements?.statement_number ||
      row.statementNumber ||
      null,
    amount: Number(row.amount ?? 0),
    paymentDate: row.payment_date || null,
    paymentMethod: row.payment_method,
    referenceNumber: row.reference_number || null,
    notes: row.notes || null,
    recordedBy: row.recorded_by,
    createdAt: row.created_at || null,
  };
}

