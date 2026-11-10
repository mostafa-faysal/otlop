import axios from "axios";
import { ENDPOINTS } from "./endpoints";
import { unwrapApiResponse } from "./apiContract";
import { normalizeHttpError } from "./httpErrorHandler";
import {
  BUSINESS_ERROR_CATALOG,
  mapToBusinessError,
} from "../errors/businessErrorMapper";

const STATE_CHANGING_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * تخزين رمز CSRF في الذاكرة الحية فقط (In-Memory) — لا يُحفظ أبدًا في localStorage
 * يدعم كلاً من Same-Origin و Cross-Origin (عند الانتقال إلى Laravel أو Express على نطاق فرعي).
 */
let inMemoryCsrfToken = null;
let csrfPromise = null;

export function setCsrfToken(token) {
  if (token && typeof token === "string") {
    inMemoryCsrfToken = token;
  }
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null;
}

/**
 * قراءة كوكي XSRF-TOKEN في حالة Same-Origin كخيار احتياطي
 */
function readCookieToken(name = "XSRF-TOKEN") {
  if (typeof document === "undefined" || !document.cookie) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * عميل Axios المركزي الموحد لمشروع «أطلب»
 * يقرأ الـ baseURL من NEXT_PUBLIC_API_URL لسهولة الربط بسيرفر .NET أو أي backend خارجي
 */
const axiosClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "/api/v1",
  timeout: 10000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/**
 * جلب رمز CSRF من الخادم عند الحاجة
 * @param {boolean} [forceRefresh=false] - عند true (مثل حالة 419) يتجاوز قراءة document.cookie القديم ويطلب توكن جديد من الخادم
 */
export async function ensureCsrfToken(forceRefresh = false) {
  if (!forceRefresh) {
    if (inMemoryCsrfToken) return inMemoryCsrfToken;

    const cookieToken = readCookieToken("XSRF-TOKEN");
    if (cookieToken) {
      inMemoryCsrfToken = cookieToken;
      return inMemoryCsrfToken;
    }
  } else {
    inMemoryCsrfToken = null;
  }

  if (!csrfPromise) {
    csrfPromise = axiosClient
      .get(ENDPOINTS.AUTH.CSRF, {
        _skipCsrfBootstrap: true,
        headers: { "Cache-Control": "no-store" },
      })
      .then((res) => {
        const token =
          res?.csrfToken ||
          res?.data?.csrfToken ||
          readCookieToken("XSRF-TOKEN");
        if (token) inMemoryCsrfToken = token;
        return inMemoryCsrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }

  return csrfPromise;
}

// Request Interceptor: فحص وإرفاق التوكن Authorization: Bearer ورمز CSRF وترويسة البوابة تلقائيًا
axiosClient.interceptors.request.use(
  async (config) => {
    const method = (config.method || "get").toLowerCase();

    // 1) فحص توكن المصادقة (Bearer Token) بحسب سياق البوابة النشطة لمنع تداخل الجلسات
    if (typeof window !== "undefined") {
      const path = window.location.pathname || "";
      const portalHeader = String(config.headers?.["X-Otlob-Portal"] || "").toLowerCase();
      const isMerchantContext = path.startsWith("/merchant") || portalHeader === "merchant";
      const isAdminContext = path.startsWith("/admin") || portalHeader === "admin";

      let token = null;

      if (isMerchantContext) {
        try {
          const rawMerchant = localStorage.getItem("otlob_merchant_session");
          if (rawMerchant) {
            const parsed = JSON.parse(rawMerchant);
            token = parsed.token || parsed.access_token || parsed.session?.access_token || null;
          }
        } catch {}
      } else if (isAdminContext) {
        try {
          const rawAdmin = localStorage.getItem("otlob_admin_session");
          if (rawAdmin) {
            const parsed = JSON.parse(rawAdmin);
            token = parsed.token || parsed.access_token || parsed.session?.access_token || null;
          }
        } catch {}
      }

      if (!token) {
        token =
          localStorage.getItem("token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("auth_token") ||
          readCookieToken("token") ||
          readCookieToken("access_token") ||
          readCookieToken("sb-access-token");
      }

      if (!token && !isMerchantContext && !isAdminContext) {
        try {
          const rawUser = localStorage.getItem("otlob_user_session");
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            token = parsed.token || parsed.access_token || parsed.session?.access_token || null;
          }
        } catch {}
      }

      if (!token) {
        try {
          const rawMerchant = localStorage.getItem("otlob_merchant_session");
          if (rawMerchant) {
            const parsed = JSON.parse(rawMerchant);
            token = parsed.token || parsed.access_token || parsed.session?.access_token || null;
          }
        } catch {}
      }

      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 2) إرفاق ترويسة البوابة لمنع تداخل الجلسات
    if (typeof window !== "undefined" && !config.headers["X-Otlob-Portal"]) {
      const path = window.location.pathname || "";
      if (path.startsWith("/admin")) {
        config.headers["X-Otlob-Portal"] = "admin";
      } else if (path.startsWith("/merchant")) {
        config.headers["X-Otlob-Portal"] = "merchant";
      } else {
        config.headers["X-Otlob-Portal"] = "customer";
      }
    }

    // 3) إرفاق رمز CSRF للعمليات المعدلة للبيانات
    if (STATE_CHANGING_METHODS.has(method) && !config._skipCsrfBootstrap) {
      const token = await ensureCsrfToken(false);
      if (token) {
        config.headers["X-XSRF-TOKEN"] = token;
      }
    }

    return config;
  },
  (error) => Promise.reject(normalizeHttpError(error))
);

// Response Interceptor: التقاط ترويسة X-CSRF-Token وفك الاستجابة الموحدة وفصل أخطاء HTTP عن أخطاء الأعمال
axiosClient.interceptors.response.use(
  (response) => {
    const headerToken = response?.headers?.["x-csrf-token"];
    if (headerToken) {
      setCsrfToken(headerToken);
    }
    return unwrapApiResponse(response);
  },
  async (error) => {
    const status = error?.response?.status;
    const errorPayload = error?.response?.data?.error;
    const errorCode = errorPayload?.code;
    const originalConfig = error?.config;

    // إعادة المحاولة مرة واحدة تلقائيًا إذا انتهت صلاحية رمز CSRF (419) مع فرض تحديث التوكن من الخادم
    if (
      status === 419 &&
      originalConfig &&
      !originalConfig._csrfRetried &&
      !originalConfig._skipCsrfBootstrap
    ) {
      originalConfig._csrfRetried = true;
      clearCsrfToken();
      const freshToken = await ensureCsrfToken(true);
      if (freshToken) {
        originalConfig.headers["X-XSRF-TOKEN"] = freshToken;
      }
      return axiosClient(originalConfig);
    }

    // معالجة الأخطاء الشائعة الموحدة (401 انتهاء الجلسة، 500 أخطاء السيرفر)
    if (status === 401) {
      const requestUrl = String(originalConfig?.url || "");
      const isAuthMe = requestUrl.includes("/auth/me") || requestUrl.includes("auth/me");
      // عدم إطلاق حدث انتهاء الجلسة المزعج إذا كان مجرد فحص عادي لجلسة زائر غير مسجل (Guest)
      if (typeof window !== "undefined" && !isAuthMe) {
        window.dispatchEvent(
          new CustomEvent("otlob_auth_unauthorized", {
            detail: { status: 401, message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً." },
          })
        );
      }
    } else if (status === 500) {
      console.error(
        `[API 500 Internal Server Error]: فشل الطلب على المسار: ${originalConfig?.url}`
      );
    }

    // إذا كان الكود ضمن قاموس قواعد العمل أو كانت الحالة 400/403/409/422 مع كود خطأ تجاري، يُحول لـ BusinessError
    if (
      errorCode &&
      (errorCode in BUSINESS_ERROR_CATALOG ||
        status === 400 ||
        status === 409 ||
        status === 422)
    ) {
      return Promise.reject(mapToBusinessError(errorPayload, status));
    }

    // عدا ذلك يعالج كخطأ بروتوكول HTTP / شبكة عام
    return Promise.reject(normalizeHttpError(error));
  }
);

export default axiosClient;
