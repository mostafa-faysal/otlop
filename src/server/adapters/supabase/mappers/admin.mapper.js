export function mapDbPlatformSettingsToDomain(row) {
  if (!row) return null;
  return {
    id: row.id ?? 1,
    defaultCommissionRate: Number(row.default_commission_rate ?? 5.0),
    serviceFeeActive: Boolean(row.service_fee_active),
    serviceFeeAmount: Number(row.service_fee_amount ?? 0),
    suspensionGracePeriodDays: Number(
      row.suspension_grace_period_days ?? 7
    ),
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
  };
}

export function mapDomainPlatformSettingsToDb(domainInput = {}) {
  const row = {};
  if (domainInput.defaultCommissionRate !== undefined) {
    row.default_commission_rate = domainInput.defaultCommissionRate;
  }
  if (domainInput.serviceFeeActive !== undefined) {
    row.service_fee_active = Boolean(domainInput.serviceFeeActive);
  }
  if (domainInput.serviceFeeAmount !== undefined) {
    row.service_fee_amount = domainInput.serviceFeeAmount;
  }
  if (domainInput.suspensionGracePeriodDays !== undefined) {
    row.suspension_grace_period_days = domainInput.suspensionGracePeriodDays;
  }
  if (domainInput.updatedBy !== undefined) {
    row.updated_by = domainInput.updatedBy;
  }
  return row;
}

export function mapDbRecordedPaymentResultToDomain(rpcResult = {}) {
  if (!rpcResult) return null;
  return {
    paymentId: rpcResult.payment_id,
    storeId: rpcResult.store_id,
    statementId: rpcResult.statement_id || null,
    amount: Number(rpcResult.amount ?? 0),
    recordedBy: rpcResult.recorded_by || null,
  };
}

export function mapDbOverdueAlertToDomain(row) {
  if (!row) return null;
  const ownerName = row.merchant_name || row.owner_name || null;
  const ownerPhone = row.merchant_phone || row.owner_phone || null;
  return {
    alertId: row.alert_id || row.id,
    statementId: row.statement_id,
    statementNumber: row.statement_number,
    storeId: row.store_id,
    storeName: row.store_name || null,
    storeSlug: row.store_slug || null,
    storeIsActive: Boolean(row.store_is_active),
    storeIsOpen: Boolean(row.store_is_open),
    ownerId: row.owner_id || null,
    ownerName,
    merchantName: ownerName,
    ownerPhone,
    merchantPhone: ownerPhone,
    dueDate: row.due_date,
    remainingAmount: Number(row.remaining_amount ?? 0),
    daysOverdue: Number(row.days_overdue ?? 0),
    isResolved: Boolean(row.is_resolved),
    resolvedAt: row.resolved_at || null,
    adminAcknowledged: Boolean(row.admin_acknowledged),
    acknowledgedBy: row.acknowledged_by || null,
    acknowledgedAt: row.acknowledged_at || null,
    adminNotes: row.admin_notes || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function mapDbStoreStatusLogToDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.stores?.name || null,
    storeSlug: row.stores?.slug || null,
    changedBy: row.changed_by || null,
    changedByName: row.profiles?.full_name || "النظام / سوبر أدمن",
    oldIsActive:
      row.old_is_active !== null && row.old_is_active !== undefined
        ? Boolean(row.old_is_active)
        : null,
    newIsActive:
      row.new_is_active !== null && row.new_is_active !== undefined
        ? Boolean(row.new_is_active)
        : null,
    oldIsOpen:
      row.old_is_open !== null && row.old_is_open !== undefined
        ? Boolean(row.old_is_open)
        : null,
    newIsOpen:
      row.new_is_open !== null && row.new_is_open !== undefined
        ? Boolean(row.new_is_open)
        : null,
    reason: row.reason || null,
    createdAt: row.created_at || null,
  };
}

