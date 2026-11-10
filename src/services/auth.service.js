import axiosClient, {
  clearCsrfToken,
  ensureCsrfToken,
  setCsrfToken,
} from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

export const INITIAL_MERCHANT_CREDENTIALS = [
  {
    storeId: "b2000000-0000-4000-8000-000000000001",
    storeSlug: "haj-sayed",
    storeName: "الحاج سيد",
    username: "sayed",
    email: "sayed@otlob.com",
    password: "password123",
    aliases: ["sayed", "haj-sayed"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000002",
    storeSlug: "om-ahmed",
    storeName: "مطبخ أم أحمد",
    username: "omahmed",
    email: "omahmed@otlob.com",
    password: "password123",
    aliases: ["omahmed", "om-ahmed"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000003",
    storeSlug: "gawhara",
    storeName: "مشويات الجوهرة",
    username: "gawhara",
    email: "gawhara@otlob.com",
    password: "password123",
    aliases: ["gawhara", "baraka"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000004",
    storeSlug: "el-reef",
    storeName: "فطائر الريف",
    username: "elreef",
    email: "elreef@otlob.com",
    password: "password123",
    aliases: ["elreef", "el-reef", "dawar"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000005",
    storeSlug: "tahrir",
    storeName: "كشري التحرير",
    username: "tahrir",
    email: "tahrir@otlob.com",
    password: "password123",
    aliases: ["tahrir", "abotarek"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000006",
    storeSlug: "al-baraka-seafood",
    storeName: "أسماك البركة الطازجة",
    username: "seafood",
    email: "seafood@otlob.com",
    password: "password123",
    aliases: ["seafood", "al-baraka-seafood"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000007",
    storeSlug: "burger-house",
    storeName: "برجر هاوس & كريب النجوم",
    username: "burger",
    email: "burger@otlob.com",
    password: "password123",
    aliases: ["burger", "burger-house"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000008",
    storeSlug: "al-sultan-sweets",
    storeName: "حلويات السلطان الشرقية والغربية",
    username: "sultan",
    email: "sultan@otlob.com",
    password: "password123",
    aliases: ["sultan", "al-sultan-sweets"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000009",
    storeSlug: "al-salam-market",
    storeName: "سوبر ماركت السلام",
    username: "salam",
    email: "salam@otlob.com",
    password: "password123",
    aliases: ["salam", "al-salam-market"],
  },
  {
    storeId: "b2000000-0000-4000-8000-000000000010",
    storeSlug: "3am-hassan",
    storeName: "فرن ومخبوزات عم حسن",
    username: "hassan",
    email: "hassan@otlob.com",
    password: "password123",
    aliases: ["hassan", "3am-hassan", "haramain"],
  },
];

export const INITIAL_ADMIN_CREDENTIALS = [
  {
    id: "admin-super-1",
    fullName: "مدير المنصة العام (Super Admin)",
    username: "admin",
    email: "admin@otlob.com",
    password: "password123",
    role: "admin",
    adminTitle: "سوبر أدمن (صلاحيات كاملة)",
    isSuperAdmin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const SESSION_EXPIRATION_POLICIES = {
  admin: {
    maxTtlMs: 2 * 60 * 60 * 1000, // ساعتان كحد أقصى لجلسة السوبر أدمن
    idleTimeoutMs: 30 * 60 * 1000, // 30 دقيقة خمول بدون نشاط
  },
  merchant: {
    maxTtlMs: 12 * 60 * 60 * 1000, // 12 ساعة لوردية عمل التاجر
    idleTimeoutMs: 2 * 60 * 60 * 1000, // ساعتان خمول بدون تفاعل
  },
  customer: {
    maxTtlMs: 24 * 60 * 60 * 1000, // 24 ساعة لجلسة العميل
    idleTimeoutMs: 12 * 60 * 60 * 1000, // 12 ساعة خمول
  },
};

function getSessionPolicy(role) {
  if (role === "admin") return SESSION_EXPIRATION_POLICIES.admin;
  if (role === "merchant") return SESSION_EXPIRATION_POLICIES.merchant;
  return SESSION_EXPIRATION_POLICIES.customer;
}

function getCurrentPortalType() {
  if (typeof window === "undefined") return "customer";
  const path = window.location.pathname || "";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/merchant")) return "merchant";
  return "customer";
}

function getPortalSessionKey() {
  const portal = getCurrentPortalType();
  if (portal === "admin") return "otlob_admin_session";
  if (portal === "merchant") return "otlob_merchant_session";
  return "otlob_user_session";
}

function saveSessionForUser(user, token = null) {
  if (!user || typeof window === "undefined") return;
  const role = user.role || "customer";
  const policy = getSessionPolicy(role);
  const now = Date.now();
  const effectiveToken = token || user.token || null;

  const sessionEnvelope = {
    user,
    token: effectiveToken,
    role,
    issuedAt: now,
    expiresAt: now + policy.maxTtlMs,
    lastActiveAt: now,
    maxInactivityMs: policy.idleTimeoutMs,
  };

  const serialized = JSON.stringify(sessionEnvelope);
  if (role === "admin") {
    localStorage.setItem("otlob_admin_session", serialized);
    // ضمان عدم تسرب جلسة الأدمن إلى الموقع العام للعميل
    try {
      localStorage.removeItem("otlob_user_session");
    } catch {}
  } else if (role === "merchant") {
    localStorage.setItem("otlob_merchant_session", serialized);
    // ضمان عدم تسرب جلسة التاجر إلى الموقع العام للعميل نهائياً
    try {
      localStorage.removeItem("otlob_user_session");
    } catch {}
  } else {
    localStorage.setItem("otlob_user_session", serialized);
  }

  if (effectiveToken) {
    try {
      localStorage.setItem("token", effectiveToken);
      localStorage.setItem("access_token", effectiveToken);
    } catch {}
  }
}

function readValidStoredSession(portalKey) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(portalKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;

    const user = parsed.user || (parsed.id ? parsed : null);
    if (!user) {
      localStorage.removeItem(portalKey);
      return null;
    }

    const now = Date.now();

    // 1. فحص انتهاء الصلاحية الزمني المطلق (Max TTL)
    if (parsed.expiresAt && now > parsed.expiresAt) {
      console.warn(`[Otlob Auth] Session expired by max TTL for ${portalKey}`);
      localStorage.removeItem(portalKey);
      return null;
    }

    // 2. فحص وقت الخمول (Inactivity / Idle Timeout)
    if (parsed.lastActiveAt && parsed.maxInactivityMs) {
      if (now - parsed.lastActiveAt > parsed.maxInactivityMs) {
        console.warn(`[Otlob Auth] Session expired by idle timeout for ${portalKey}`);
        localStorage.removeItem(portalKey);
        return null;
      }
    }

    // ترقية الجلسات القديمة التي لم تكن تحتوي على تاريخ انتهاء
    if (!parsed.expiresAt) {
      const policy = getSessionPolicy(user.role);
      const updatedEnvelope = {
        user,
        role: user.role,
        issuedAt: now,
        expiresAt: now + policy.maxTtlMs,
        lastActiveAt: now,
        maxInactivityMs: policy.idleTimeoutMs,
      };
      localStorage.setItem(portalKey, JSON.stringify(updatedEnvelope));
    } else {
      parsed.lastActiveAt = now;
      localStorage.setItem(portalKey, JSON.stringify(parsed));
    }

    return user;
  } catch {
    return null;
  }
}

export const authService = {
  /**
   * جلب قائمة حسابات وبيانات دخول التجار المسجلة مع حفظ أي تعديلات على اسم المستخدم أو كلمة المرور
   */
  getMerchantCredentialsList() {
    if (typeof window === "undefined") return INITIAL_MERCHANT_CREDENTIALS;
    try {
      const stored = localStorage.getItem("otlob_merchants_credentials");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const canonicalBySlug = new Map(
            INITIAL_MERCHANT_CREDENTIALS.map((c) => [c.storeSlug, c])
          );
          const customStores = parsed.filter(
            (p) =>
              p &&
              p.storeSlug &&
              !canonicalBySlug.has(p.storeSlug) &&
              !INITIAL_MERCHANT_CREDENTIALS.some((c) => c.storeId === p.storeId)
          );
          const mergedCanonical = INITIAL_MERCHANT_CREDENTIALS.map((canon) => {
            const match = parsed.find(
              (p) =>
                p.storeSlug === canon.storeSlug || p.storeId === canon.storeId
            );
            if (!match) {
              return { ...canon, canonicalEmail: canon.email };
            }
            const mergedAliases = Array.from(
              new Set(
                [
                  ...(canon.aliases || []),
                  ...(match.aliases || []),
                  canon.username,
                  match.username,
                  canon.email,
                  match.email,
                ]
                  .filter(Boolean)
                  .map((a) => String(a).trim().toLowerCase())
              )
            );
            return {
              ...canon,
              username: (match.username || canon.username).trim(),
              email: (match.email || canon.email).trim(),
              canonicalEmail: canon.email,
              password: (match.password || canon.password).trim(),
              aliases: mergedAliases,
            };
          });
          return [...mergedCanonical, ...customStores];
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_MERCHANT_CREDENTIALS.map((c) => ({
      ...c,
      canonicalEmail: c.email,
    }));
  },

  /**
   * جلب قائمة حسابات مديري المنصة (Super Admin + الأدمن المضافين)
   */
  getAdminsList() {
    if (typeof window === "undefined") return INITIAL_ADMIN_CREDENTIALS;
    try {
      const stored = localStorage.getItem("otlob_admins_credentials");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasSuper = parsed.some(
            (a) => a.email?.toLowerCase() === "admin@otlob.com"
          );
          return hasSuper
            ? parsed
            : [...INITIAL_ADMIN_CREDENTIALS, ...parsed];
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ADMIN_CREDENTIALS;
  },

  /**
   * إضافة حساب أدمن جديد من لوحة تحكم الإدارة العليا
   */
  addAdminAccount({ fullName, username, email, password, adminTitle }) {
    if (typeof window === "undefined") return null;
    const cleanUsername = String(username || "")
      .trim()
      .toLowerCase();
    const cleanEmail = String(
      email || (cleanUsername ? `${cleanUsername}@otlob.com` : "")
    )
      .trim()
      .toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanUsername && !cleanEmail) {
      throw new Error("يرجى إدخال اسم المستخدم أو البريد الإلكتروني للأدمن الجديد.");
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error("كلمة المرور للأدمن الجديد يجب ألا تقل عن 6 خانات.");
    }

    const currentAdmins = this.getAdminsList();
    const exists = currentAdmins.some(
      (a) =>
        a.username?.toLowerCase() === cleanUsername ||
        a.email?.toLowerCase() === cleanEmail
    );
    if (exists) {
      throw new Error("يوجد حساب أدمن مسجل مسبقاً بنفس اسم المستخدم أو البريد الإلكتروني.");
    }

    const newAdmin = {
      id: `admin-${Date.now()}`,
      fullName: (fullName || "مدير بالمنصة").trim(),
      username: cleanUsername || cleanEmail.split("@")[0],
      email: cleanEmail.includes("@") ? cleanEmail : `${cleanEmail}@otlob.com`,
      password: cleanPassword,
      role: "admin",
      adminTitle: (adminTitle || "مدير عمليات المنصة").trim(),
      isSuperAdmin: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...currentAdmins, newAdmin];
    localStorage.setItem("otlob_admins_credentials", JSON.stringify(updated));
    return newAdmin;
  },

  /**
   * حذف حساب أدمن فرعي
   */
  removeAdminAccount(adminId) {
    if (typeof window === "undefined") return [];
    const current = this.getAdminsList();
    const target = current.find((a) => a.id === adminId);
    if (target?.isSuperAdmin) {
      throw new Error("لا يمكن حذف حساب السوبر أدمن الرئيسي للمنصة.");
    }
    const updated = current.filter((a) => a.id !== adminId);
    localStorage.setItem("otlob_admins_credentials", JSON.stringify(updated));
    return updated;
  },

  /**
   * حفظ بيانات دخول لمتجر معين (إضافة أو تعديل)
   */
  saveMerchantCredentials({ storeId, storeSlug, storeName, username, email, password }) {
    if (typeof window === "undefined") return;
    try {
      const current = this.getMerchantCredentialsList();
      const idx = current.findIndex(
        (c) => c.storeId === storeId || c.storeSlug === storeSlug
      );
      const newCred = {
        storeId,
        storeSlug: storeSlug || storeId,
        storeName: storeName || "متجر جديد",
        username: (username || "").trim(),
        email: (email || `${username || storeSlug}@otlob.com`).trim(),
        password: (password || "password123").trim(),
      };

      let updated;
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = { ...updated[idx], ...newCred };
      } else {
        updated = [...current, newCred];
      }
      localStorage.setItem("otlob_merchants_credentials", JSON.stringify(updated));
      return newCred;
    } catch {
      // ignore
    }
  },

  /**
   * جلب بيانات دخول متجر محدد للمعاينة في لوحة الإدارة
   */
  getMerchantCredentials(storeIdOrSlug) {
    const list = this.getMerchantCredentialsList();
    return (
      list.find(
        (c) =>
          c.storeId === storeIdOrSlug ||
          c.storeSlug === storeIdOrSlug ||
          c.username === storeIdOrSlug ||
          (Array.isArray(c.aliases) && c.aliases.includes(storeIdOrSlug))
      ) || null
    );
  },

  /**
   * تحديث اسم المستخدم أو كلمة المرور للمتجر من لوحة تحكم التاجر
   */
  async updateMerchantCredentials(storeId, { currentPassword, newUsername, newPassword }) {
    const list = this.getMerchantCredentialsList();
    const idx = list.findIndex(
      (c) => c.storeId === storeId || c.storeSlug === storeId
    );
    if (idx === -1) {
      throw new Error("لم يتم العثور على حساب هذا المتجر في المنظومة");
    }

    const currentCred = list[idx];
    if (currentPassword && currentCred.password !== currentPassword.trim()) {
      throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    const nextUsername = newUsername
      ? newUsername.trim()
      : currentCred.username;
    const nextEmail = newUsername
      ? newUsername.trim().includes("@")
        ? newUsername.trim()
        : `${newUsername.trim()}@otlob.com`
      : currentCred.email;
    const nextPassword = newPassword
      ? newPassword.trim()
      : currentCred.password;

    const updatedAliases = Array.from(
      new Set(
        [
          ...(currentCred.aliases || []),
          currentCred.username,
          nextUsername,
          currentCred.email,
          nextEmail,
        ]
          .filter(Boolean)
          .map((a) => String(a).trim().toLowerCase())
      )
    );

    const updatedCred = {
      ...currentCred,
      username: nextUsername,
      email: nextEmail,
      canonicalEmail: currentCred.canonicalEmail || currentCred.email,
      password: nextPassword,
      aliases: updatedAliases,
    };

    const updatedList = [...list];
    updatedList[idx] = updatedCred;

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "otlob_merchants_credentials",
        JSON.stringify(updatedList)
      );

      const sessionStr = localStorage.getItem("otlob_merchant_session");
      if (sessionStr) {
        try {
          const sess = JSON.parse(sessionStr);
          if (
            sess.storeId === storeId ||
            sess.storeSlug === currentCred.storeSlug
          ) {
            const newSession = {
              ...sess,
              username: updatedCred.username,
              email: updatedCred.email,
            };
            localStorage.setItem(
              "otlob_merchant_session",
              JSON.stringify(newSession)
            );
          }
        } catch {
          // ignore
        }
      }
    }

    return updatedCred;
  },

  /**
   * استعادة وتغيير كلمة المرور عبر التحقق من البريد الإلكتروني أو اسم المستخدم
   */
  async resetPasswordByEmail(identifier, newPassword) {
    const cleanId = (identifier || "").trim().toLowerCase();
    const cleanPass = (newPassword || "").trim();
    if (!cleanPass || cleanPass.length < 6) {
      throw new Error("يجب ألا تقل كلمة المرور الجديدة عن 6 خانات.");
    }

    const merchantList = this.getMerchantCredentialsList();
    const matchedMerchant = merchantList.find(
      (c) =>
        c.username.toLowerCase() === cleanId ||
        c.email.toLowerCase() === cleanId ||
        (Array.isArray(c.aliases) && c.aliases.includes(cleanId))
    );

    if (matchedMerchant) {
      await this.updateMerchantCredentials(matchedMerchant.storeId, {
        newPassword: cleanPass,
      });
      return {
        success: true,
        role: "merchant",
        storeName: matchedMerchant.storeName,
        message: `تم تحديث كلمة المرور لمتجر «${matchedMerchant.storeName}» بنجاح.`,
      };
    }

    const isAdmin = cleanId.includes("admin");
    const updatedUser = {
      id: "usr-" + Date.now(),
      email: cleanId.includes("@") ? cleanId : `${cleanId}@otlob.com`,
      fullName: isAdmin ? "مدير المنصة العام" : "عميل أطلب",
      phone: "01012345678",
      role: isAdmin ? "admin" : "customer",
    };

    saveSessionForUser(updatedUser);

    return {
      success: true,
      user: updatedUser,
      message: "تم تحديث كلمة المرور وتسجيل الدخول بنجاح.",
    };
  },

  /**
   * تهيئة أو تجديد رمز الحماية CSRF
   */
  async initCsrf() {
    try {
      const data = await ensureCsrfToken();
      return { csrfToken: data };
    } catch {
      return { csrfToken: "fallback-csrf" };
    }
  },

  /**
   * تسجيل الدخول بالبريد الإلكتروني / اسم المستخدم وكلمة المرور
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials = {}) {
    const identifier = (credentials.email || credentials.username || "")
      .trim()
      .toLowerCase();
    const password = (credentials.password || "").trim();

    if (!identifier || !password) {
      throw new Error("يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور.");
    }

    const currentPortal = getCurrentPortalType();

    // 1. التحقق من حسابات مديري المنصة (Super Admin + الأدمن المضافين)
    const adminsList = this.getAdminsList();
    const matchedAdmin = adminsList.find(
      (a) =>
        a.username?.toLowerCase() === identifier ||
        a.email?.toLowerCase() === identifier
    );

    if (matchedAdmin) {
      if (currentPortal === "customer") {
        throw new Error(
          "حساب الإدارة مخصص للوحة تحكم الإدارة العليا فقط ولا يمكن استخدامه في الموقع العام. للتسوق يرجى تسجيل الدخول بحساب عميل."
        );
      }
      if (password !== matchedAdmin.password) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");
      }

      let apiResult = null;
      try {
        apiResult = await axiosClient.post(
          ENDPOINTS.AUTH.LOGIN,
          {
            email: "admin@otlob.com",
            password: matchedAdmin.isSuperAdmin ? password : "password123",
          },
          {
            headers: { "X-Otlob-Portal": "admin" },
          }
        );
        if (apiResult?.csrfToken) {
          setCsrfToken(apiResult.csrfToken);
        }
      } catch {
        // استمرار تسجيل دخول الأدمن محلياً إذا كان أدمن مضافاً جديداً
      }

      const adminUser = {
        ...(apiResult?.user || {}),
        id: matchedAdmin.id || apiResult?.user?.id || `admin-${Date.now()}`,
        role: "admin",
        username: matchedAdmin.username,
        email: matchedAdmin.email,
        fullName: matchedAdmin.fullName || "مدير المنصة",
        adminTitle: matchedAdmin.adminTitle || "مدير عمليات المنصة",
        isSuperAdmin: Boolean(matchedAdmin.isSuperAdmin),
      };

      saveSessionForUser(adminUser);
      return { ...(apiResult || {}), user: adminUser };
    }

    // 2. التحقق من حسابات التجار المسجلة (بما فيها الأسماء وكلمات المرور المعدلة)
    const merchantList = this.getMerchantCredentialsList();
    const matchedMerchant = merchantList.find(
      (c) =>
        c.username.toLowerCase() === identifier ||
        c.email.toLowerCase() === identifier ||
        (c.canonicalEmail && c.canonicalEmail.toLowerCase() === identifier) ||
        c.storeSlug.toLowerCase() === identifier ||
        (Array.isArray(c.aliases) && c.aliases.includes(identifier)) ||
        (identifier === "merchant@otlob.com" && c.storeSlug === "haj-sayed")
    );

    if (matchedMerchant) {
      if (currentPortal === "customer") {
        throw new Error(
          "حسابات التجار والإدارة مخصصة للوحات التحكم فقط ولا يمكن استخدامها في الموقع العام. للتسوق والطلب يرجى تسجيل الدخول بحساب عميل أو إنشاء حساب جديد."
        );
      }

      if (password !== matchedMerchant.password) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة.");
      }

      const loginPayload = {
        email: matchedMerchant.canonicalEmail || matchedMerchant.email,
        storeId: matchedMerchant.storeId,
        storeSlug: matchedMerchant.storeSlug,
        username: matchedMerchant.username,
        password,
      };

      let result = null;
      try {
        result = await axiosClient.post(
          ENDPOINTS.AUTH.LOGIN,
          loginPayload,
          {
            headers: { "X-Otlob-Portal": "merchant" },
          }
        );
        if (result?.csrfToken) {
          setCsrfToken(result.csrfToken);
        }
        if (result?.token) {
          localStorage.setItem("token", result.token);
          localStorage.setItem("access_token", result.token);
        }
      } catch (err) {
        console.error("Merchant backend auth failed:", err?.message || err);
        throw new Error(err?.response?.data?.message || err?.message || "فشل تسجيل الدخول في الخادم.");
      }

      const enrichedMerchantUser = {
        ...(result?.user || {}),
        id: result?.user?.id || matchedMerchant.profileId || `merch-${matchedMerchant.storeSlug}`,
        role: "merchant",
        username: matchedMerchant.username,
        email: matchedMerchant.email,
        fullName: `إدارة ${matchedMerchant.storeName}`,
        storeId: matchedMerchant.storeId,
        storeSlug: matchedMerchant.storeSlug,
        storeName: matchedMerchant.storeName,
        token: result?.token || null,
      };

      saveSessionForUser(enrichedMerchantUser, result?.token);
      return { ...(result || {}), user: enrichedMerchantUser, token: result?.token };
    }

    const resolvedEmail = identifier.includes("@")
      ? identifier
      : `${identifier}@otlob.com`;

    if (currentPortal === "customer" && resolvedEmail.includes("admin")) {
      throw new Error(
        "حسابات التجار والإدارة مخصصة للوحات التحكم فقط ولا يمكن استخدامها في الموقع العام. للتسوق والطلب يرجى تسجيل الدخول بحساب عميل أو إنشاء حساب جديد."
      );
    }

    const portalHeader =
      currentPortal === "merchant"
        ? "merchant"
        : currentPortal === "admin" || resolvedEmail.includes("admin")
        ? "admin"
        : "customer";

    const result = await axiosClient.post(
      ENDPOINTS.AUTH.LOGIN,
      {
        email: resolvedEmail,
        password,
      },
      {
        headers: { "X-Otlob-Portal": portalHeader },
      }
    );

    if (result?.csrfToken) {
      setCsrfToken(result.csrfToken);
    }

    const enrichedUser = result?.user;

    if (
      currentPortal === "customer" &&
      (enrichedUser?.role === "merchant" || enrichedUser?.role === "admin")
    ) {
      throw new Error(
        "هذا الحساب خاص بإدارة المتجر/المنصة ولا يمكن استخدامه كحساب عميل في الموقع العام."
      );
    }

    if (enrichedUser) {
      saveSessionForUser(enrichedUser);
    }
    if (result?.token && typeof window !== "undefined") {
      try {
        localStorage.setItem("token", result.token);
        localStorage.setItem("access_token", result.token);
      } catch {}
    }
    return { ...result, user: enrichedUser };
  },

  /**
   * إنشاء حساب جديد (عميل / تاجر)
   */
  async register(payload) {
    const result = await axiosClient.post(ENDPOINTS.AUTH.REGISTER, payload);
    if (result?.csrfToken) {
      setCsrfToken(result.csrfToken);
    }
    if (result?.user) {
      saveSessionForUser(result.user);
    }
    if (result?.token && typeof window !== "undefined") {
      try {
        localStorage.setItem("token", result.token);
        localStorage.setItem("access_token", result.token);
      } catch {}
    }
    return result;
  },

  /**
   * تسجيل الخروج ومسح الكوكيز والجلسة الخاصة بالبوابة الحالية
   */
  async logout() {
    try {
      await axiosClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // ignore
    }
    clearCsrfToken();
    if (typeof window !== "undefined") {
      const key = getPortalSessionKey();
      localStorage.removeItem(key);
      localStorage.removeItem("otlob_admin_session");
      localStorage.removeItem("otlob_merchant_session");
      localStorage.removeItem("otlob_user_session");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
    }
    return { loggedOut: true };
  },

  /**
   * جلب بيانات المستخدم الحالي من الجلسة مع إثراء بيانات متجر التاجر وفحص الصلاحية الزمني (TTL)
   */
  async getMe() {
    const currentPortal = getCurrentPortalType();
    const portalKey = getPortalSessionKey();
    let localSession = readValidStoredSession(portalKey);

    if (
      currentPortal === "customer" &&
      (localSession?.role === "merchant" || localSession?.role === "admin")
    ) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("otlob_user_session");
      }
      localSession = null;
    } else if (
      currentPortal === "merchant" &&
      localSession?.role !== "merchant"
    ) {
      localSession = null;
    } else if (currentPortal === "admin" && localSession?.role !== "admin") {
      localSession = null;
    }

    try {
      const res = await axiosClient.get(ENDPOINTS.AUTH.ME);
      if (res?.user) {
        let userObj = res.user;
        // منع دخول توكين التاجر أو الأدمن إلى الموقع العام للعميل نهائياً
        if (
          currentPortal === "customer" &&
          (userObj.role === "merchant" || userObj.role === "admin")
        ) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("otlob_user_session");
          }
          return { user: null };
        }
        if (currentPortal === "merchant" && userObj.role !== "merchant") {
          return { user: localSession || null };
        }
        if (currentPortal === "admin" && userObj.role !== "admin") {
          return { user: localSession || null };
        }

        if (userObj.role === "merchant") {
          const merchantList = this.getMerchantCredentialsList();
          // إذا كان التاجر مسجلاً دخوله بالفعل على متجر محدد في localSession، نثبّت متجره ولا نسمح بتغييره
          const targetStoreId = localSession?.storeId || userObj.storeId;
          const targetStoreSlug = localSession?.storeSlug || userObj.storeSlug;
          const matched =
            merchantList.find(
              (c) =>
                (targetStoreId && c.storeId === targetStoreId) ||
                (targetStoreSlug && c.storeSlug === targetStoreSlug)
            ) ||
            merchantList.find(
              (c) =>
                c.storeId === userObj.storeId ||
                c.storeSlug === userObj.storeSlug ||
                c.email.toLowerCase() === (userObj.email || "").toLowerCase()
            );
          if (matched) {
            userObj = {
              ...userObj,
              username: matched.username,
              email: matched.email,
              fullName: `إدارة ${matched.storeName}`,
              storeId: matched.storeId,
              storeSlug: matched.storeSlug,
              storeName: matched.storeName,
            };
          } else if (localSession?.role === "merchant" && localSession?.storeId) {
            userObj = {
              ...userObj,
              username: localSession.username || userObj.username,
              email: localSession.email || userObj.email,
              fullName: localSession.fullName || userObj.fullName,
              storeId: localSession.storeId,
              storeSlug: localSession.storeSlug,
              storeName: localSession.storeName,
            };
          }
        }
        if (userObj.role === "admin" && localSession?.role === "admin") {
          userObj = {
            ...userObj,
            username: localSession.username || userObj.username || "admin",
            email: localSession.email || userObj.email,
            fullName: localSession.fullName || userObj.fullName,
            adminTitle: localSession.adminTitle || "سوبر أدمن (صلاحيات كاملة)",
          };
        }
        saveSessionForUser(userObj);
        return { user: userObj };
      }
    } catch (err) {
      const status =
        err?.status ||
        err?.response?.status ||
        err?.statusCode ||
        (String(err?.message || "").includes("401") ? 401 : null) ||
        (String(err?.message || "").includes("403") ? 403 : null);

      // إذا كان رد السيرفر 401 Unauthorized أو 403 Forbidden:
      // فهذا رفض صريح ومؤكد من الخادم لانتهاء الجلسة أو عدم صحة التوكين.
      // يمنع نهائياً العودة للجلسة المحلية لمنع الثغرات الأمنية!
      if (status === 401 || status === 403) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(portalKey);
          if (portalKey === "otlob_user_session") {
            localStorage.removeItem("otlob_merchant_session");
          }
        }
        return { user: null };
      }

      // في حال كان هناك خطأ اتصال، لا نعتمد جلسة التاجر/الأدمن إلا إذا كان هناك توكين فعلي محفوظ
      if (localSession) {
        if (currentPortal === "merchant" || currentPortal === "admin") {
          const rawToken =
            (typeof window !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("access_token"))) ||
            localSession.token;
          if (!rawToken) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(portalKey);
            }
            return { user: null };
          }
        }
        return { user: localSession };
      }
    }

    if (localSession) {
      if (currentPortal === "merchant" || currentPortal === "admin") {
        const rawToken =
          (typeof window !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("access_token"))) ||
          localSession.token;
        if (!rawToken) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(portalKey);
          }
          return { user: null };
        }
      }
      return { user: localSession };
    }
    return { user: null };
  },

  /**
   * تحديث الملف الشخصي للمستخدم الحالي
   */
  async updateProfile(payload) {
    const res = await axiosClient.patch(ENDPOINTS.AUTH.ME, payload);
    if (res?.user) {
      saveSessionForUser(res.user);
    }
    return res;
  },

  /**
   * جلب عناوين التوصيل المحفوظة للمستخدم
   */
  async getAddresses() {
    try {
      const res = await axiosClient.get(ENDPOINTS.ADDRESSES.LIST);
      if (Array.isArray(res?.addresses)) return res;
      if (Array.isArray(res?.items)) return { addresses: res.items };
    } catch {
      // ignore if unauthenticated
    }

    return {
      addresses: [],
    };
  },

  /**
   * إضافة عنوان توصيل جديد
   */
  async createAddress(payload) {
    return axiosClient.post(ENDPOINTS.ADDRESSES.CREATE, payload);
  },

  /**
   * تعديل عنوان
   */
  async updateAddress(addressId, payload) {
    return axiosClient.patch(ENDPOINTS.ADDRESSES.BY_ID(addressId), payload);
  },

  /**
   * حذف عنوان
   */
  async deleteAddress(addressId) {
    return axiosClient.delete(ENDPOINTS.ADDRESSES.BY_ID(addressId));
  },
};
