const FLOOR_APT_PREFIX_REGEX =
  /^\[(?:الدور:\s*([^|\]]*?))?(?:\s*\|\s*)?(?:الشقة:\s*([^\]]*?))?\]\s*/;

function packFloorAndApartmentIntoNotes(floor, apartment, rawNotes) {
  const cleanFloor = floor ? String(floor).trim() : "";
  const cleanApt = apartment ? String(apartment).trim() : "";
  const cleanNotes = rawNotes ? String(rawNotes).trim() : "";

  if (!cleanFloor && !cleanApt) {
    return cleanNotes || null;
  }

  const parts = [];
  if (cleanFloor) parts.push(`الدور: ${cleanFloor}`);
  if (cleanApt) parts.push(`الشقة: ${cleanApt}`);
  const prefix = `[${parts.join(" | ")}]`;
  const combined = cleanNotes ? `${prefix} ${cleanNotes}` : prefix;
  return combined.slice(0, 300);
}

function unpackFloorAndApartmentFromNotes(dbNotes) {
  if (!dbNotes || typeof dbNotes !== "string") {
    return { floor: null, apartment: null, notes: null };
  }

  const match = dbNotes.match(FLOOR_APT_PREFIX_REGEX);
  if (!match) {
    return { floor: null, apartment: null, notes: dbNotes };
  }

  const floor = match[1] ? match[1].trim() || null : null;
  const apartment = match[2] ? match[2].trim() || null : null;
  const remainingNotes = dbNotes.slice(match[0].length).trim() || null;

  return {
    floor,
    apartment,
    notes: remainingNotes,
  };
}

export function mapDbProfileToDomain(profileRow, authUser = null) {
  if (!profileRow && !authUser) return null;
  const id = profileRow?.id || authUser?.id || null;
  return {
    id,
    email: authUser?.email || profileRow?.email || null,
    fullName:
      profileRow?.full_name ||
      authUser?.user_metadata?.full_name ||
      "مستخدم أطلب",
    phone: profileRow?.phone || authUser?.user_metadata?.phone || null,
    avatarUrl: profileRow?.avatar_url || null,
    role: profileRow?.role || "customer",
    createdAt: profileRow?.created_at || authUser?.created_at || null,
    updatedAt: profileRow?.updated_at || null,
  };
}

export function mapDomainProfileUpdateToDb(domainUpdate = {}) {
  const cols = {};
  if (domainUpdate.fullName !== undefined) {
    cols.full_name = domainUpdate.fullName;
  }
  if (domainUpdate.phone !== undefined) {
    cols.phone = domainUpdate.phone;
  }
  if (domainUpdate.avatarUrl !== undefined) {
    cols.avatar_url = domainUpdate.avatarUrl;
  }
  return cols;
}

export function mapDbAddressToDomain(row) {
  if (!row) return null;
  const unpacked = unpackFloorAndApartmentFromNotes(row.notes);
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    city: row.city || null,
    area: row.area || null,
    street: row.street,
    building: row.building || null,
    floor: row.floor !== undefined ? row.floor : unpacked.floor,
    apartment: row.apartment !== undefined ? row.apartment : unpacked.apartment,
    notes: unpacked.notes,
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

export function mapDomainAddressToDb(domainInput = {}, { isPartial = false } = {}) {
  const row = {};
  if (!isPartial || domainInput.label !== undefined) {
    row.label = domainInput.label ?? "المنزل";
  }
  if (!isPartial || domainInput.city !== undefined) {
    row.city = domainInput.city ?? null;
  }
  if (!isPartial || domainInput.area !== undefined) {
    row.area = domainInput.area ?? null;
  }
  if (!isPartial || domainInput.street !== undefined) {
    row.street = domainInput.street;
  }
  if (domainInput.building !== undefined) {
    row.building = domainInput.building;
  }
  if (
    domainInput.notes !== undefined ||
    domainInput.floor !== undefined ||
    domainInput.apartment !== undefined
  ) {
    row.notes = packFloorAndApartmentIntoNotes(
      domainInput.floor,
      domainInput.apartment,
      domainInput.notes
    );
  }
  if (domainInput.lat !== undefined) {
    row.lat = domainInput.lat;
  }
  if (domainInput.lng !== undefined) {
    row.lng = domainInput.lng;
  }
  if (domainInput.isDefault !== undefined) {
    row.is_default = Boolean(domainInput.isDefault);
  }
  return row;
}

