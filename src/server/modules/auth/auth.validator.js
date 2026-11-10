import { AppError } from "../../http/AppError.js";

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export function normalizeEgyptianPhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  let digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0020") && digits.length === 14) {
    digits = digits.slice(3);
  } else if (digits.startsWith("20") && digits.length === 12) {
    digits = digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith("1")) {
    digits = `0${digits}`;
  }
  return EGYPTIAN_PHONE_REGEX.test(digits) ? digits : null;
}

export function validateLoginInput(body = {}) {
  let email = String(body.email || body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const storeId = body.storeId || null;
  const storeSlug = body.storeSlug || null;

  if (email && !email.includes("@")) {
    email = `${email}@otlob.com`;
  }

  if (!email || password.length < 6) {
    throw new AppError({
      code: "invalid_credentials",
      message: "يرجى إدخال بريد إلكتروني صحيح أو اسم مستخدم وكلمة مرور لا تقل عن 6 أحرف.",
      status: 422,
    });
  }

  return { email, password, storeId, storeSlug };
}

export function validateRegisterInput(body = {}) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const fullName = String(body.fullName || body.full_name || "").trim();
  const rawPhone = body.phone ? String(body.phone).trim() : null;
  const phone = rawPhone ? normalizeEgyptianPhone(rawPhone) : null;

  if (!email || !email.includes("@")) {
    throw new AppError({
      code: "validation_error",
      message: "يرجى إدخال بريد إلكتروني صحيح.",
      status: 422,
    });
  }
  if (password.length < 6) {
    throw new AppError({
      code: "validation_error",
      message: "كلمة المرور يجب ألا تقل عن 6 أحرف.",
      status: 422,
    });
  }
  if (fullName.length < 2 || fullName.length > 80) {
    throw new AppError({
      code: "invalid_name",
      message: "يرجى إدخال اسم ثلاثي أو ثنائي صحيح (من حرفين إلى 80 حرفًا).",
      status: 422,
    });
  }
  if (rawPhone && !phone) {
    throw new AppError({
      code: "invalid_phone",
      message: "يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678).",
      status: 422,
    });
  }

  return { email, password, fullName, phone };
}

export function validateProfileUpdateInput(body = {}) {
  const domainUpdate = {};

  if (body.fullName !== undefined || body.full_name !== undefined) {
    const fullName = String(body.fullName ?? body.full_name ?? "").trim();
    if (fullName.length < 2 || fullName.length > 80) {
      throw new AppError({
        code: "invalid_name",
        message: "الاسم يجب أن يكون بين حرفين و80 حرفًا.",
        status: 422,
      });
    }
    domainUpdate.fullName = fullName;
  }

  if (body.phone !== undefined) {
    if (body.phone === null || body.phone === "") {
      domainUpdate.phone = null;
    } else {
      const normalized = normalizeEgyptianPhone(String(body.phone));
      if (!normalized) {
        throw new AppError({
          code: "invalid_phone",
          message: "يرجى إدخال رقم موبايل مصري صحيح.",
          status: 422,
        });
      }
      domainUpdate.phone = normalized;
    }
  }

  if (body.avatarUrl !== undefined || body.avatar_url !== undefined) {
    const avatarUrl = body.avatarUrl ?? body.avatar_url;
    domainUpdate.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
  }

  return domainUpdate;
}

export function validateAddressInput(body = {}, isPartial = false) {
  const domainAddress = {};

  if (!isPartial || body.label !== undefined) {
    const label = String(body.label || "المنزل").trim();
    if (label.length < 1 || label.length > 40) {
      throw new AppError({
        code: "validation_error",
        message: "اسم العنوان يجب أن يكون بين حرف و40 حرفًا.",
        status: 422,
      });
    }
    domainAddress.label = label;
  }

  if (!isPartial || body.city !== undefined) {
    const city =
      body.city !== undefined && body.city !== null
        ? String(body.city).trim() || null
        : "القاهرة";
    domainAddress.city = city;
  }

  if (!isPartial || body.area !== undefined) {
    const area =
      body.area !== undefined && body.area !== null
        ? String(body.area).trim() || null
        : null;
    domainAddress.area = area;
  }

  if (!isPartial || body.street !== undefined) {
    const street = String(body.street || "").trim();
    if (street.length < 3 || street.length > 200) {
      throw new AppError({
        code: "invalid_address",
        message: "يرجى إدخال اسم الشارع والمنطقة (من 3 إلى 200 حرف).",
        status: 422,
      });
    }
    domainAddress.street = street;
  }

  if (body.building !== undefined)
    domainAddress.building = body.building
      ? String(body.building).trim()
      : null;
  if (body.floor !== undefined)
    domainAddress.floor = body.floor ? String(body.floor).trim() : null;
  if (body.apartment !== undefined)
    domainAddress.apartment = body.apartment
      ? String(body.apartment).trim()
      : null;
  if (body.notes !== undefined)
    domainAddress.notes = body.notes ? String(body.notes).trim() : null;
  if (body.lat !== undefined)
    domainAddress.lat = body.lat !== null ? Number(body.lat) : null;
  if (body.lng !== undefined)
    domainAddress.lng = body.lng !== null ? Number(body.lng) : null;
  if (body.isDefault !== undefined || body.is_default !== undefined) {
    domainAddress.isDefault = Boolean(body.isDefault ?? body.is_default);
  }

  return domainAddress;
}
