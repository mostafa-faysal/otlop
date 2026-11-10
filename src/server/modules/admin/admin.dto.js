export function toPlatformSettingsDTO(entity, { isAdmin = false } = {}) {
  if (!entity) return null;
  const base = {
    serviceFeeActive: Boolean(entity.serviceFeeActive),
    serviceFeeAmount: Number(entity.serviceFeeAmount ?? 0),
  };

  if (isAdmin) {
    base.defaultCommissionRate = Number(entity.defaultCommissionRate ?? 5.0);
    base.suspensionGracePeriodDays = Number(
      entity.suspensionGracePeriodDays ?? 7
    );
    base.homepageConfig = entity.homepageConfig || null;
    base.updatedAt = entity.updatedAt || null;
    base.updatedBy = entity.updatedBy || null;
  }

  return base;
}

export function toOverdueAlertDTO(entity) {
  if (!entity) return null;
  return {
    alertId: entity.alertId,
    statementId: entity.statementId,
    statementNumber: entity.statementNumber,
    storeId: entity.storeId,
    storeName: entity.storeName,
    storeSlug: entity.storeSlug || null,
    storeIsActive: Boolean(entity.storeIsActive),
    storeIsOpen: Boolean(entity.storeIsOpen),
    ownerId: entity.ownerId || null,
    ownerName: entity.ownerName || entity.merchantName || null,
    merchantName: entity.merchantName || entity.ownerName || null,
    ownerPhone: entity.ownerPhone || entity.merchantPhone || null,
    merchantPhone: entity.merchantPhone || entity.ownerPhone || null,
    dueDate: entity.dueDate,
    remainingAmount: Number(entity.remainingAmount ?? 0),
    daysOverdue: Number(entity.daysOverdue ?? 0),
    isResolved: Boolean(entity.isResolved),
    resolvedAt: entity.resolvedAt || null,
    adminAcknowledged: Boolean(entity.adminAcknowledged),
    acknowledgedBy: entity.acknowledgedBy || null,
    acknowledgedAt: entity.acknowledgedAt || null,
    adminNotes: entity.adminNotes || null,
    createdAt: entity.createdAt || null,
    updatedAt: entity.updatedAt || null,
  };
}

export function toStoreStatusLogDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    storeId: entity.storeId,
    storeName: entity.storeName || null,
    storeSlug: entity.storeSlug || null,
    changedBy: entity.changedBy || null,
    changedByName: entity.changedByName || "النظام / سوبر أدمن",
    oldIsActive:
      entity.oldIsActive !== null && entity.oldIsActive !== undefined
        ? Boolean(entity.oldIsActive)
        : null,
    newIsActive:
      entity.newIsActive !== null && entity.newIsActive !== undefined
        ? Boolean(entity.newIsActive)
        : null,
    oldIsOpen:
      entity.oldIsOpen !== null && entity.oldIsOpen !== undefined
        ? Boolean(entity.oldIsOpen)
        : null,
    newIsOpen:
      entity.newIsOpen !== null && entity.newIsOpen !== undefined
        ? Boolean(entity.newIsOpen)
        : null,
    reason: entity.reason || null,
    createdAt: entity.createdAt || null,
  };
}
