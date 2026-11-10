import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers.js";
import { AppError } from "../../http/AppError.js";

export const SUPABASE_COOKIE_NAME = "otlob_sb_session";
export const SUPABASE_ADMIN_COOKIE_NAME = "otlob_sb_admin";
export const SUPABASE_MERCHANT_COOKIE_NAME = "otlob_sb_merchant";

export function getPortalCookieMaxAge(portalCookieName) {
  if (portalCookieName === SUPABASE_ADMIN_COOKIE_NAME) return 7200; // ساعتان لجلسة الأدمن
  if (portalCookieName === SUPABASE_MERCHANT_COOKIE_NAME) return 43200; // 12 ساعة لوردية التاجر
  return 86400; // 24 ساعة لجلسة العميل
}

export function getPortalCookieName(portalHeader, refererHeader = "") {
  const portal = String(portalHeader || "").toLowerCase();
  if (portal === "admin") return SUPABASE_ADMIN_COOKIE_NAME;
  if (portal === "merchant") return SUPABASE_MERCHANT_COOKIE_NAME;
  if (refererHeader.includes("/admin")) return SUPABASE_ADMIN_COOKIE_NAME;
  if (refererHeader.includes("/merchant")) return SUPABASE_MERCHANT_COOKIE_NAME;
  return SUPABASE_COOKIE_NAME;
}

function getSupabaseServerConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new AppError(
      "SUPABASE_CONFIG_MISSING",
      "إعدادات اتصال Supabase غير مكتملة في ملف البيئة (.env.local).",
      500
    );
  }

  return { url, anonKey };
}

/**
 * إنشاء عميل Supabase على السيرفر مرتبط بجلسة البوابة الحالية (عميل / تاجر / سوبر أدمن) عبر HttpOnly Cookies.
 * يعزل جلسة كل بوابة لمنع تداخل الصلاحيات (403) عند فتح أكثر من تبويب في المتصفح.
 */
export async function createSupabaseRequestClient(explicitPortal = null) {
  const { url, anonKey } = getSupabaseServerConfig();
  let cookieStore = null;
  let portalCookieName = SUPABASE_COOKIE_NAME;

  try {
    cookieStore = await cookies();
  } catch {
    // Outside of Next.js request scope
  }

  try {
    const hdrs = await headers();
    const portalHdr = explicitPortal || hdrs.get("x-otlob-portal") || "";
    const refererHdr = hdrs.get("referer") || "";
    portalCookieName = getPortalCookieName(portalHdr, refererHdr);
  } catch {
    if (explicitPortal) {
      portalCookieName = getPortalCookieName(explicitPortal, "");
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const portalMaxAge = getPortalCookieMaxAge(portalCookieName);

  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: portalCookieName,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: portalMaxAge,
    },
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return;
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              secure: isProd,
              sameSite: "lax",
              path: "/",
              maxAge: options?.maxAge ?? portalMaxAge,
            });
          }
        } catch {
          // في حال الاستدعاء من Server Component للقراءة فقط
        }
      },
    },
  });
}

/**
 * عزل كوكي الجلسة النشطة في كوكي البوابة المختصة فقط ومسح أي تداخل مع كوكي الموقع العام (otlob_sb_session)
 */
export async function syncRolePortalCookies(role) {
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const isProd = process.env.NODE_ENV === "production";
    const targetPrefix =
      role === "admin"
        ? SUPABASE_ADMIN_COOKIE_NAME
        : role === "merchant"
        ? SUPABASE_MERCHANT_COOKIE_NAME
        : SUPABASE_COOKIE_NAME;

    const sourcePrefixes = [
      SUPABASE_COOKIE_NAME,
      SUPABASE_ADMIN_COOKIE_NAME,
      SUPABASE_MERCHANT_COOKIE_NAME,
    ];

    const targetMaxAge = getPortalCookieMaxAge(targetPrefix);

    for (const srcPrefix of sourcePrefixes) {
      if (srcPrefix === targetPrefix) continue;
      for (const c of all) {
        if (c.name === srcPrefix || c.name.startsWith(`${srcPrefix}.`)) {
          const newName = c.name.replace(srcPrefix, targetPrefix);
          cookieStore.set(newName, c.value, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: targetMaxAge,
          });
          // إذا كان الحساب تاجر أو أدمن وتم تسجيل دخوله، نحذف الكوكي من الموقع العام (otlob_sb_session) فوراً لمنع دخوله للموقع كعميل
          if (
            (role === "merchant" || role === "admin") &&
            srcPrefix === SUPABASE_COOKIE_NAME
          ) {
            cookieStore.set(c.name, "", {
              httpOnly: true,
              path: "/",
              maxAge: 0,
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * مسح كوكيز جلسة البوابة الحالية عند تسجيل الخروج
 */
export async function clearSupabaseSessionCookies() {
  const cookieStore = await cookies();
  let portalCookieName = SUPABASE_COOKIE_NAME;
  try {
    const hdrs = await headers();
    portalCookieName = getPortalCookieName(
      hdrs.get("x-otlob-portal"),
      hdrs.get("referer") || ""
    );
  } catch {
    // ignore
  }

  const allCookies = cookieStore.getAll();

  for (const c of allCookies) {
    if (
      c.name === portalCookieName ||
      c.name.startsWith(`${portalCookieName}.`) ||
      (portalCookieName === SUPABASE_COOKIE_NAME && c.name.startsWith("sb-"))
    ) {
      cookieStore.set(c.name, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
    }
  }
}
