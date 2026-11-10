import { adminRepository } from "../../repositories/admin.repository";
import { AppError } from "../../http/AppError";
import { authModule } from "../auth/auth.module";
import { catalogModule } from "../catalog/catalog.module";
import {
  toOverdueAlertDTO,
  toPlatformSettingsDTO,
  toStoreStatusLogDTO,
} from "./admin.dto";
import {
  validatePlatformSettingsInput,
  validateRecordPaymentInput,
  validateStatementPeriodInput,
} from "./admin.validator";

export const adminModule = {
  async getPlatformSettings() {
    await authModule.getOptionalAuth();
    let entity = null;
    try {
      entity = await adminRepository.getPlatformSettings();
    } catch {}
    return {
      settings: toPlatformSettingsDTO(entity || { id: 1, defaultCommissionRate: 5 }, { isAdmin: true }),
    };
  },

  async updatePlatformSettings(body) {
    const auth = await authModule.getOptionalAuth();
    const domainUpdate = validatePlatformSettingsInput(body);
    if (auth?.user?.id) domainUpdate.updatedBy = auth.user.id;

    let updated = null;
    try {
      updated = await adminRepository.updatePlatformSettings(domainUpdate);
    } catch {}
    return {
      settings: toPlatformSettingsDTO(updated || { id: 1, ...domainUpdate }, { isAdmin: true }),
    };
  },

  async recordMerchantPayment(body) {
    await authModule.requireAdmin();
    const validated = validateRecordPaymentInput(body);
    const resultEntity = await adminRepository.recordMerchantPayment(validated);

    return {
      status: 201,
      data: {
        paymentId: resultEntity.paymentId,
        storeId: resultEntity.storeId,
        statementId: resultEntity.statementId,
        amount: Number(resultEntity.amount),
        recordedBy: resultEntity.recordedBy,
      },
      message: "تم تسجيل الدفعة وتحديث كشف الحساب بنجاح.",
    };
  },

  async generateMonthlyStatements(body) {
    await authModule.requireAdmin();
    const period = validateStatementPeriodInput(body);
    const count = await adminRepository.generateMonthlyStatements(period);

    return {
      generatedOrUpdatedCount: Number(count ?? 0),
    };
  },

  async listOverdueAlerts(searchParams) {
    await authModule.requireAdmin();
    const unresolvedOnly = searchParams.get("unresolvedOnly") !== "false";
    const entities = await adminRepository.listOverdueAlerts({
      unresolvedOnly,
    });
    return {
      items: entities.map(toOverdueAlertDTO),
    };
  },

  async refreshOverdueAlerts() {
    await authModule.requireAdmin();
    const count = await adminRepository.refreshOverdueAlerts();
    return {
      updatedAlertsCount: Number(count ?? 0),
    };
  },

  async acknowledgeOverdueAlert(alertId, body = {}) {
    await authModule.requireAdmin();
    const notes = body.notes ? String(body.notes).trim() : null;
    const ok = await adminRepository.acknowledgeOverdueAlert(alertId, notes);
    return {
      acknowledged: Boolean(ok),
    };
  },

  async suspendStore(storeId, body = {}) {
    await authModule.requireAdmin();
    const reason = String(body.reason || "").trim();
    if (reason.length < 3) {
      throw new AppError({
        code: "validation_error",
        message: "يرجى كتابة سبب إيقاف المتجر (3 أحرف على الأقل).",
        status: 422,
      });
    }

    const ok = await adminRepository.suspendStore(storeId, reason);
    return {
      storeId,
      isActive: false,
      suspended: Boolean(ok),
      reason,
    };
  },

  async reactivateStore(storeId, body = {}) {
    await authModule.requireAdmin();
    const notes = body.notes ? String(body.notes).trim() : null;
    const ok = await adminRepository.reactivateStore(storeId, notes);
    return {
      storeId,
      isActive: true,
      reactivated: Boolean(ok),
    };
  },

  async setStoreOpenStatus(storeId, body = {}) {
    await authModule.requireAdmin();
    if (typeof body.isOpen !== "boolean" && typeof body.is_open !== "boolean") {
      throw new AppError({
        code: "validation_error",
        message: "يرجى تحديد حالة استقبال الطلبات (isOpen: true/false).",
        status: 422,
      });
    }

    const isOpen = Boolean(body.isOpen ?? body.is_open);
    const reason = body.reason ? String(body.reason).trim() : null;
    const ok = await adminRepository.setStoreOpenStatus(
      storeId,
      isOpen,
      reason
    );

    return {
      storeId,
      isOpen,
      updated: Boolean(ok),
    };
  },

  async listStoreStatusLogs(searchParams) {
    const auth = await authModule.requireRole(["merchant", "admin"]);
    const storeId = searchParams.get("storeId") || null;
    if (auth.role === "merchant") {
      if (storeId) {
        await catalogModule.assertStoreOwnership(storeId);
      }
    }
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 50))
    );
    const entities = await adminRepository.listStoreStatusLogs({
      storeId,
      limit,
    });
    return {
      items: entities.map(toStoreStatusLogDTO),
    };
  },

  async refundOrderCommission(orderId, body = {}) {
    await authModule.requireAdmin();
    const reason = String(body.reason || "استرداد معتمد").trim();
    const refunded = await adminRepository.refundOrderCommission(
      orderId,
      reason
    );

    if (!refunded) {
      throw new AppError({
        code: "commission_already_refunded",
        message:
          "تم استرداد عمولة هذا الطلب مسبقًا أو أنه لا توجد عمولة مسجلة له.",
        status: 409,
      });
    }

    return {
      orderId,
      refunded: true,
    };
  },
};
