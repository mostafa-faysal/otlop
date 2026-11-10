import { NextResponse } from "next/server";
import {
  buildErrorPayload,
  buildSuccessPayload,
} from "@/lib/api/apiContract";
import { BUSINESS_ERROR_CATALOG } from "@/lib/errors/businessErrorMapper";
import { verifyCsrfRequest } from "../security/csrf";
import { AppError } from "./AppError";

/**
 * قراءة جسم الطلب JSON بأمان
 * @param {Request} request
 */
export async function parseJsonBody(request) {
  try {
    const text = await request.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
    throw new AppError({
      code: "validation_error",
      message: "صيغة بيانات الطلب (JSON) غير صالحة.",
      status: 400,
    });
  }
}

/**
 * غلاف موحد لجميع Route Handlers في /api/v1
 * - يطبق حماية CSRF على الطلبات المغيرة للبيانات
 * - يوحد شكل الاستجابة القياسية { success, data, message, meta }
 * - يحول الأخطاء إلى الشكل الموحد { success: false, error: { code, message, details } }
 */
export function withApiHandler(handler, options = {}) {
  const { skipCsrf = false } = options;

  return async function routeHandler(request, routeContext) {
    try {
      if (!skipCsrf) {
        await verifyCsrfRequest(request);
      }

      const resolvedParams = routeContext?.params
        ? await routeContext.params
        : {};

      const result = await handler(request, {
        params: resolvedParams,
        searchParams: new URL(request.url).searchParams,
      });

      if (result instanceof NextResponse) {
        return result;
      }

      const status = result?.status || 200;
      const data = result?.data !== undefined ? result.data : result;
      const message = result?.message || "Operation completed successfully";
      const meta = result?.meta ?? null;
      const headers = result?.headers || {};

      return NextResponse.json(buildSuccessPayload(data, message, meta), {
        status,
        headers,
      });
    } catch (err) {
      console.error(
        `[RouteHandler Error] [${request.method} ${request.url}]:`,
        err?.message || err,
        err?.code || "",
        err?.stack || ""
      );
      const code = err?.code || "internal_error";
      const status =
        err instanceof AppError
          ? err.status
          : err?.status || (code in BUSINESS_ERROR_CATALOG ? 422 : 500);

      const catalogMessage = BUSINESS_ERROR_CATALOG[code]?.message;
      const message =
        err instanceof AppError && err.message
          ? err.message
          : catalogMessage ||
            err?.message ||
            "حدث خطأ غير متوقع أثناء معالجة الطلب.";

      return NextResponse.json(
        buildErrorPayload(code, message, err?.details || null),
        { status }
      );
    }
  };
}
