/**
 * طبقة معالجة أخطاء بروتوكول HTTP والشبكة العامة فقط.
 * مفصولة تمامًا عن أخطاء منطق الأعمال (BusinessError).
 */
export class HttpError extends Error {
  constructor({ status, code, message, originalError = null }) {
    super(message);
    this.name = "HttpError";
    this.isHttpError = true;
    this.status = status;
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * تصنيف أخطاء الشبكة وبروتوكول HTTP القياسية
 * @param {import('axios').AxiosError} axiosError
 * @returns {HttpError}
 */
export function normalizeHttpError(axiosError) {
  if (axiosError?.code === "ECONNABORTED") {
    return new HttpError({
      status: 408,
      code: "REQUEST_TIMEOUT",
      message: "انتهت مهلة الاتصال بالخادم، يرجى التحقق من الإنترنت والمحاولة مجددًا.",
      originalError: axiosError,
    });
  }

  if (!axiosError?.response) {
    return new HttpError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "تعذر الاتصال بالخادم، يرجى التأكد من اتصالك بالإنترنت.",
      originalError: axiosError,
    });
  }

  const { status, data } = axiosError.response;
  const serverCode = data?.error?.code;
  const serverMessage = data?.error?.message;

  switch (status) {
    case 401:
      return new HttpError({
        status: 401,
        code: serverCode || "UNAUTHORIZED",
        message: serverMessage || "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.",
        originalError: axiosError,
      });
    case 419:
      return new HttpError({
        status: 419,
        code: serverCode || "CSRF_TOKEN_MISMATCH",
        message:
          serverMessage || "انتهت صلاحية رمز الحماية (CSRF)، يرجى تحديث الصفحة والمحاولة مجددًا.",
        originalError: axiosError,
      });
    case 429:
      return new HttpError({
        status: 429,
        code: serverCode || "TOO_MANY_REQUESTS",
        message:
          serverMessage || "تم إرسال طلبات كثيرة في وقت قصير، يرجى الانتظار قليلاً.",
        originalError: axiosError,
      });
    default:
      if (status >= 500) {
        return new HttpError({
          status,
          code: serverCode || "SERVER_ERROR",
          message:
            serverMessage || "حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقًا.",
          originalError: axiosError,
        });
      }
      return new HttpError({
        status,
        code: serverCode || `HTTP_${status}`,
        message: serverMessage || "تعذر إتمام الطلب.",
        originalError: axiosError,
      });
  }
}

