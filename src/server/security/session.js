import crypto from "node:crypto";
import { cookies, headers } from "next/headers.js";

export const SESSION_COOKIE_NAME = "otlob_session_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSessionSecretKey() {
  return (
    process.env.CSRF_SECRET ||
    process.env.SUPABASE_ANON_KEY ||
    "otlob-secure-session-hmac-key-2026-production"
  );
}

// -------------------------------------------------------------
// Signed Session Token (HMAC-SHA256)
// -------------------------------------------------------------
export function createSessionToken(user) {
  if (!user || !user.id) return null;
  const payload = {
    uid: user.id,
    em: user.email,
    fn: user.fullName || user.full_name || "",
    ph: user.phone || "",
    rl: user.role || "customer",
    sid: user.storeId || null,
    sslug: user.storeSlug || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecretKey())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== "string") return null;
  const parts = tokenString.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getSessionSecretKey())
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || now > payload.exp) {
      return null;
    }
    return {
      id: payload.uid,
      email: payload.em,
      fullName: payload.fn,
      phone: payload.ph,
      role: payload.rl,
      storeId: payload.sid || null,
      storeSlug: payload.sslug || null,
    };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Cookies & Request Context Helpers
// -------------------------------------------------------------
export async function setAppSessionCookie(user) {
  const token = createSessionToken(user);
  if (!token) return null;

  try {
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    // Server component or read-only context
  }

  return token;
}

export async function clearAppSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
  } catch {
    // ignore
  }
}

export async function getAppSessionUserFromRequest() {
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (cookieToken) {
      const verified = verifySessionToken(cookieToken);
      if (verified) return verified;
    }

    const hdrs = await headers();
    const authHdr = hdrs.get("authorization") || "";
    if (authHdr.startsWith("Bearer ")) {
      const bearerToken = authHdr.slice(7).trim();
      const verified = verifySessionToken(bearerToken);
      if (verified) return verified;
    }
  } catch {
    // ignore
  }
  return null;
}

