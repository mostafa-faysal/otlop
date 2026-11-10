/**
 * تحويل كيان المستخدم (Domain Entity) إلى عقد الواجهة العام (Public API DTO)
 */
export function toUserDTO(userEntity, profileEntity = null) {
  const source = profileEntity || userEntity;
  if (!source) return null;
  const dto = {
    id: source.id,
    email: source.email || userEntity?.email || null,
    username: source.username || userEntity?.username || null,
    fullName: source.fullName || "مستخدم أطلب",
    phone: source.phone || null,
    avatarUrl: source.avatarUrl || null,
    role: source.role || "customer",
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };

  if (source.storeId || userEntity?.storeId) {
    dto.storeId = source.storeId || userEntity?.storeId || null;
    dto.storeSlug = source.storeSlug || userEntity?.storeSlug || null;
    dto.storeName = source.storeName || userEntity?.storeName || null;
  }

  return dto;
}

/**
 * تحويل كيان العنوان (AddressEntity) إلى عقد الواجهة العام (AddressDTO)
 */
export function toAddressDTO(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    userId: entity.userId,
    label: entity.label,
    city: entity.city || null,
    area: entity.area || null,
    street: entity.street,
    building: entity.building || null,
    floor: entity.floor || null,
    apartment: entity.apartment || null,
    notes: entity.notes || null,
    lat:
      entity.lat !== null && entity.lat !== undefined
        ? Number(entity.lat)
        : null,
    lng:
      entity.lng !== null && entity.lng !== undefined
        ? Number(entity.lng)
        : null,
    isDefault: Boolean(entity.isDefault),
    createdAt: entity.createdAt || null,
  };
}
