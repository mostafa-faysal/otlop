import { AppError } from "../../http/AppError";

// مطابق لـ public.payment_method_type في supabase/schema.sql
const VALID_PAYMENT_METHODS = ["cash", "bank_transfer"];

export function validatePlatformSettingsInput(body = {}) {
  const domainSettings = {};
  if (
    body.defaultCommissionRate !== undefined ||
    body.default_commission_rate !== undefined
  ) {
    const rate = Number(
      body.defaultCommissionRate ?? body.default_commission_rate
    );
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new AppError({
        code: "validation_error",
        message: "نسبة العمولة الافتراضية يجب أن تكون بين 0 و100.",
        status: 422,
      });
    }
    domainSettings.defaultCommissionRate = rate;
  }

  if (
    body.suspensionGracePeriodDays !== undefined ||
    body.suspension_grace_period_days !== undefined
  ) {
    const days = Number(
      body.suspensionGracePeriodDays ?? body.suspension_grace_period_days
    );
    if (!Number.isInteger(days) || days < 0 || days > 90) {
      throw new AppError({
        code: "validation_error",
        message: "مهلة التنبيه للمتأخرات يجب أن تكون بين 0 و90 يومًا.",
        status: 422,
      });
    }
    domainSettings.suspensionGracePeriodDays = days;
  }

  if (
    body.serviceFeeActive !== undefined ||
    body.service_fee_active !== undefined
  ) {
    domainSettings.serviceFeeActive = Boolean(
      body.serviceFeeActive ?? body.service_fee_active
    );
  }

  if (body.homepageConfig !== undefined) {
    domainSettings.homepageConfig = body.homepageConfig;
  }

  if (
    body.serviceFeeAmount !== undefined ||
    body.service_fee_amount !== undefined
  ) {
    const fee = Number(body.serviceFeeAmount ?? body.service_fee_amount);
    if (!Number.isFinite(fee) || fee < 0) {
      throw new AppError({
        code: "validation_error",
        message: "رسوم الخدمة يجب أن تكون صفر أو أكثر.",
        status: 422,
      });
    }
    domainSettings.serviceFeeAmount = fee;
  }

  return domainSettings;
}

export function validateRecordPaymentInput(body = {}) {
  const storeId = String(body.storeId || body.store_id || "").trim();
  const amount = Number(body.amount);
  const paymentMethod = String(
    body.paymentMethod || body.payment_method || ""
  ).trim();

  if (!storeId) {
    throw new AppError({
      code: "store_not_found",
      message: "يرجى تحديد المتجر.",
      status: 422,
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError({
      code: "invalid_amount",
      message: "مبلغ الدفعة يجب أن يكون أكبر من الصفر.",
      status: 422,
    });
  }

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError({
      code: "validation_error",
      message: "وسيلة الدفع غير صالحة (المسموح: cash أو bank_transfer).",
      status: 422,
    });
  }

  return {
    storeId,
    amount,
    paymentMethod,
    referenceNumber:
      body.referenceNumber || body.reference_number
        ? String(body.referenceNumber || body.reference_number).trim()
        : null,
    statementId: body.statementId || body.statement_id || null,
    notes: body.notes ? String(body.notes).trim() : null,
  };
}

export function validateStatementPeriodInput(body = {}) {
  const year = Number(body.year);
  const month = Number(body.month);

  if (
    !Number.isInteger(year) ||
    year < 2024 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new AppError({
      code: "invalid_period",
      message: "الشهر أو السنة المحددة غير صالحة.",
      status: 422,
    });
  }

  return { year, month };
}
