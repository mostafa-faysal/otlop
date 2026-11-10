import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  getPortalCookieName,
  SUPABASE_ADMIN_COOKIE_NAME,
  SUPABASE_COOKIE_NAME,
  SUPABASE_MERCHANT_COOKIE_NAME,
} from "./client";

/**
 * تجديد جلسة المستخدم تلقائيًا عبر HttpOnly Cookies في كل طلب وارد
 * يحافظ على تحديث access_token و refresh_token لكل بوابة دون كشفها للمتصفح.
 * @param {import('next/server').NextRequest} request
 */
export async function refreshSupabaseSession(request) {
  let response = NextResponse.next({
    request,
  });

  const url =
    process.env.SUPABASE_URL || "https://zrbvvbitzmmymgcutguy.supabase.co";
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const existingCookies = request.cookies.getAll();
  const hasSessionCookie = existingCookies.some(
    (c) =>
      c.name &&
      (c.name.startsWith(SUPABASE_COOKIE_NAME) ||
        c.name.startsWith(SUPABASE_ADMIN_COOKIE_NAME) ||
        c.name.startsWith(SUPABASE_MERCHANT_COOKIE_NAME) ||
        c.name.startsWith("sb-"))
  );
  if (!hasSessionCookie) {
    return response;
  }

  const portalCookieName = getPortalCookieName(
    request.headers.get("x-otlob-portal"),
    request.headers.get("referer") || request.nextUrl?.pathname || ""
  );

  const isProd = process.env.NODE_ENV === "production";

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: {
      name: portalCookieName,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
          });
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
