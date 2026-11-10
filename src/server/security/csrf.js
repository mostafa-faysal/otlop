
import crypto from "node:crypto";
import { cookies } from "next/headers.js";
import { AppError } from "../http/AppError.js";

export const CSRF_SECRET_COOKIE = "otlob_csrf_secret";
export const XSRF_PUBLIC_COOKIE = "XSRF-TOKEN";
export const CSRF_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getServerCsrfKey() {
  return (
    process.env.CSRF_SECRET ||
    process.env.SUPABASE_ANON_KEY ||
    "otlob-dev-csrf-hmac-key-2026-secure-fallback"
  );
}

export function signCsrfPayload(secretCookieValue, nonce, timestamp) {
  return crypto
    .createHmac("sha256", getServerCsrfKey())
    .update(`${secretCookieValue}:${nonce}:${timestamp}`)
    .digest("hex");
}

export function createSignedCsrfPair({ existingSecret = null, forceRotate = false } = {}) {
  const secretValue =
    !forceRotate && existingSecret && existingSecret.length >= 32
      ? existingSecret
      : crypto.randomBytes(32).toString("hex");

  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const signature = signCsrfPayload(secretValue, nonce, timestamp);
  const publicToken = `${nonce}.${timestamp}.${signature}`;

  return {
    secretValue,
    publicToken,
  };
}

export function verifySignedCsrfPair(secretValue, headerToken) {
  if (!secretValue || !headerToken || typeof headerToken !== "string") {
    return { valid: false, reason: "missing" };
  }

  const parts = headerToken.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed" };
  }

  const [nonce, timestampStr, providedSig] = parts;
  const timestamp = Number(timestampStr);
  if (
    !nonce ||
    !Number.isFinite(timestamp) ||
    Date.now() - timestamp > CSRF_MAX_AGE_SECONDS * 1000
  ) {
    return { valid: false, reason: "expired" };
  }

  const expectedSig = signCsrfPayload(secretValue, nonce, timestampStr);
  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return { valid: true, reason: null };
}

/**
 * إصدار رمز CSRF مع الحفاظ على السر الحالي إن وجد
 */
export async function issueCsrfToken({ forceRotate = false } = {}) {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  const existingSecret = cookieStore.get(CSRF_SECRET_COOKIE)?.value || null;
  const { secretValue, publicToken } = createSignedCsrfPair({
    existingSecret,
    forceRotate,
  });

  cookieStore.set(CSRF_SECRET_COOKIE, secretValue, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_MAX_AGE_SECONDS,
  });

  cookieStore.set(XSRF_PUBLIC_COOKIE, publicToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_MAX_AGE_SECONDS,
  });

  return publicToken;
}

/**
 * تدوير السر السري ورمز CSRF إجباريًا عند تغير هوية الجلسة (login / register)
 * مما يبطل صلاحية أي رمز CSRF قديم صُدر قبل المصادقة.
 */
export async function rotateCsrfToken() {
  return issueCsrfToken({ forceRotate: true });
}

/**
 * مسح كوكيز الـ CSRF عند تسجيل الخروج لإبطال أي توكن سابق فورًا
 */
export async function clearCsrfCookies() {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set(CSRF_SECRET_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(XSRF_PUBLIC_COOKIE, "", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * التحقق من Origin / Referer ومن توقيع HMAC لرمز CSRF في الطلبات المغيرة للبيانات
 * @param {Request} request
 */
export async function verifyCsrfRequest(request) {
  const method = (request.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return;
  }

  // 1) التحقق من Origin / Host
  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("host");
  const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (originHeader) {
    let originHost = "";
    try {
      originHost = new URL(originHeader).host;
    } catch {
      throw new AppError({
        code: "CSRF_INVALID_ORIGIN",
        message: "مصدر الطلب (Origin) غير صالح.",
        status: 419,
      });
    }

    const isSameHost = hostHeader && originHost === hostHeader;
    const isWhitelisted = allowedOriginsEnv.includes(originHeader);

    if (!isSameHost && !isWhitelisted) {
      throw new AppError({
        code: "CSRF_ORIGIN_MISMATCH",
        message: "مصدر الطلب غير مصرح به.",
        status: 419,
      });
    }
  }

  // 2) التحقق من الكوكي السرية HttpOnly والترويسة العامة
  const cookieStore = await cookies();
  const secretValue = cookieStore.get(CSRF_SECRET_COOKIE)?.value;
  const headerToken =
    request.headers.get("x-xsrf-token") ||
    request.headers.get("x-csrf-token");

  const verification = verifySignedCsrfPair(secretValue, headerToken);
  if (!verification.valid) {
    throw new AppError({
      code: "CSRF_TOKEN_MISMATCH",
      message: "رمز الحماية (CSRF) مفقود أو منتهي الصلاحية أو غير مطابق.",
      status: 419,
    });
  }
}
