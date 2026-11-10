import { BUSINESS_ERROR_CATALOG } from "../../../lib/errors/businessErrorMapper.js";
import { AppError } from "../../http/AppError.js";

/**
 * تطبيع أخطاء PostgreSQL و Supabase وتحويلها إلى AppError قياسي
 * يفهم جميع أكواد RAISE EXCEPTION المعرفة في supabase/schema.sql.
 * @param {any} error
 * @param {string} [fallbackCode="internal_error"]
 */
export function normalizeSupabaseError(error, fallbackCode = "internal_error") {
  if (!error) return null;
  if (error instanceof AppError) return error;

  const rawMessage = (error.message || "").trim();
  const pgCode = error.code || "";

  // 1) إذا كانت الرسالة مطابقة مباشرة لكود عمل في schema.sql (مثل min_order_not_met أو payment_exceeds_debt)
  if (rawMessage in BUSINESS_ERROR_CATALOG) {
    const statusMap = {
      forbidden: 403,
      forbidden_admin_only: 403,
      store_not_found: 404,
      order_not_found: 404,
      statement_not_found: 404,
      order_number_collision: 409,
      commission_already_refunded: 409,
    };
    return new AppError({
      code: rawMessage,
      message: BUSINESS_ERROR_CATALOG[rawMessage].message,
      status: statusMap[rawMessage] || 422,
    });
  }

  // 2) فحص ما إذا كان كود العمل مضمنًا داخل رسالة خطأ PostgreSQL P0001
  for (const knownCode of Object.keys(BUSINESS_ERROR_CATALOG)) {
    if (rawMessage.includes(knownCode)) {
      const isForbidden = knownCode.startsWith("forbidden");
      const isNotFound = knownCode.endsWith("_not_found");
      return new AppError({
        code: knownCode,
        message: BUSINESS_ERROR_CATALOG[knownCode].message,
        status: isForbidden ? 403 : isNotFound ? 404 : 422,
      });
    }
  }

  // 3) أخطاء PostgreSQL القياسية (Unique, Check, Foreign Key, RLS)
  if (pgCode === "PGRST116") {
    return new AppError({
      code: fallbackCode.endsWith("_not_found") ? fallbackCode : "not_found",
      message: "العنصر المطلوب غير موجود.",
      status: 404,
    });
  }

  if (pgCode === "42501") {
    return new AppError({
      code: "forbidden",
      message: BUSINESS_ERROR_CATALOG.forbidden.message,
      status: 403,
    });
  }

  if (pgCode === "23505") {
    if (rawMessage.includes("reviews_order_id_key")) {
      return new AppError({
        code: "duplicate_review",
        message: BUSINESS_ERROR_CATALOG.duplicate_review.message,
        status: 409,
      });
    }
    return new AppError({
      code: "duplicate_entry",
      message: "البيانات المدخلة مسجلة بالفعل (تعارض قيم فريدة).",
      status: 409,
    });
  }

  if (pgCode === "23503") {
    return new AppError({
      code: "foreign_key_violation",
      message: "لا يمكن إتمام العملية لوجود سجلات أو طلبات مرتبطة بهذا العنصر في النظام.",
      status: 409,
    });
  }

  if (pgCode === "23514") {
    if (rawMessage.includes("offers_delivery_cost_bearer_chk")) {
      return new AppError({
        code: "delivery_cost_bearer_constraint",
        message:
          BUSINESS_ERROR_CATALOG.delivery_cost_bearer_constraint.message,
        status: 422,
      });
    }
    return new AppError({
      code: "validation_error",
      message: "القيم المدخلة تخالف قيود التحقق في النظام.",
      status: 422,
    });
  }

  // 4) أخطاء Supabase Auth
  if (
    rawMessage.toLowerCase().includes("invalid login credentials") ||
    rawMessage.toLowerCase().includes("invalid_credentials")
  ) {
    return new AppError({
      code: "invalid_credentials",
      message: BUSINESS_ERROR_CATALOG.invalid_credentials.message,
      status: 401,
    });
  }

  if (rawMessage.toLowerCase().includes("user already registered")) {
    return new AppError({
      code: "email_already_registered",
      message: BUSINESS_ERROR_CATALOG.email_already_registered.message,
      status: 409,
    });
  }

  return new AppError({
    code: fallbackCode,
    message: rawMessage || "تعذر إتمام العملية.",
    status: error.status || 500,
  });
}

