/**
 * عقد الاستجابة الموحد (Unified API Contract)
 * يلتزم به كل Backend (Supabase Adapter حاليًا، أو Laravel / Express مستقبلاً).
 */

/**
 * بناء استجابة نجاح قياسية
 * @param {any} data
 * @param {string} [message="Operation completed successfully"]
 * @param {object|null} [meta=null]
 */
export function buildSuccessPayload(
  data = {},
  message = "Operation completed successfully",
  meta = null
) {
  const payload = {
    success: true,
    data: data ?? {},
    message,
  };
  if (meta !== null && meta !== undefined) {
    payload.meta = meta;
  }
  return payload;
}

/**
 * بناء استجابة خطأ قياسية
 * @param {string} code
 * @param {string} message
 * @param {object|null} [details=null]
 */
export function buildErrorPayload(code, message, details = null) {
  return {
    success: false,
    error: {
      code: code || "internal_error",
      message: message || "حدث خطأ غير متوقع.",
      ...(details ? { details } : {}),
    },
  };
}

/**
 * فك غلاف الاستجابة الموحدة في الواجهة الأمامية
 * @param {import('axios').AxiosResponse} response
 */
export function unwrapApiResponse(response) {
  const body = response?.data;
  if (body && typeof body === "object" && "success" in body) {
    if (body.success) {
      if (body.meta !== undefined) {
        return { data: body.data, meta: body.meta, message: body.message };
      }
      return body.data;
    }
  }
  return body;
}

