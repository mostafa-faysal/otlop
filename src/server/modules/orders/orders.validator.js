import { AppError } from "../../http/AppError";
import { normalizeEgyptianPhone } from "../auth/auth.validator";

const VALID_ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "on_the_way",
  "delivered",
  "cancelled",
];

const STAFF_ALLOWED_TRANSITIONS = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["on_the_way", "cancelled"],
  on_the_way: ["delivered"],
  delivered: [],
  cancelled: [],
};

const CUSTOMER_ALLOWED_TRANSITIONS = {
  pending: ["cancelled"],
  accepted: [],
  preparing: [],
  on_the_way: [],
  delivered: [],
  cancelled: [],
};

export function validateCreateOrderInput(body = {}) {
  const storeId = String(body.storeId || body.store_id || "").trim();
  const customerName = String(
    body.customerName || body.customer_name || ""
  ).trim();
  const rawPhone = String(
    body.customerPhone || body.customer_phone || ""
  ).trim();
  const customerPhone = normalizeEgyptianPhone(rawPhone);
  const deliveryAddress = String(
    body.deliveryAddress || body.delivery_address || ""
  ).trim();
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!storeId) {
    throw new AppError({
      code: "store_not_found",
      message: "يرجى تحديد المتجر المطلوب.",
      status: 422,
    });
  }

  if (customerName.length < 2 || customerName.length > 80) {
    throw new AppError({
      code: "invalid_name",
      message: "يرجى إدخال اسم صحيح (من حرفين إلى 80 حرفًا).",
      status: 422,
    });
  }

  if (!customerPhone) {
    throw new AppError({
      code: "invalid_phone",
      message: "يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678).",
      status: 422,
    });
  }

  if (deliveryAddress.length < 5 || deliveryAddress.length > 300) {
    throw new AppError({
      code: "invalid_address",
      message: "يرجى إدخال عنوان توصيل واضح بالتفصيل (من 5 إلى 300 حرف).",
      status: 422,
    });
  }

  if (rawItems.length === 0) {
    throw new AppError({
      code: "empty_cart",
      message: "سلة المشتريات فارغة، يرجى إضافة صنف واحد على الأقل.",
      status: 422,
    });
  }

  const normalizedItems = rawItems.map((item) => {
    const productId = item.productId || item.product_id;
    const quantity = Number(item.quantity);
    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 50
    ) {
      throw new AppError({
        code: "invalid_item",
        message:
          "أحد الأصناف المختارة غير صالح أو بكمية غير مسموحة (الحد الأقصى 50).",
        status: 422,
      });
    }
    return {
      productId: String(productId),
      quantity,
      name: item.name ? String(item.name).trim() : null,
      // الأسعار والخصومات يتم تجاهلها تماماً من العميل وتُجلب حصراً من قاعدة البيانات
    };
  });

  const notes =
    body.notes !== undefined && body.notes !== null
      ? String(body.notes).trim() || null
      : null;

  if (notes && notes.length > 500) {
    throw new AppError({
      code: "invalid_notes",
      message: "ملاحظات الطلب لا يمكن أن تتجاوز 500 حرف.",
      status: 422,
    });
  }

  const couponCode =
    body.couponCode || body.coupon_code
      ? String(body.couponCode || body.coupon_code)
          .trim()
          .toUpperCase()
      : null;

  return {
    storeId,
    items: normalizedItems,
    customerName,
    customerPhone,
    deliveryAddress,
    addressId: body.addressId || body.address_id || null,
    notes,
    couponCode,
    deliveryLat:
      body.deliveryLat !== undefined && body.deliveryLat !== null
        ? Number(body.deliveryLat)
        : null,
    deliveryLng:
      body.deliveryLng !== undefined && body.deliveryLng !== null
        ? Number(body.deliveryLng)
        : null,
  };
}

export function validateOrderStatusUpdateInput(body = {}) {
  const status = String(body.status || "").trim();
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new AppError({
      code: "invalid_status_transition",
      message: "حالة الطلب المحددة غير صالحة.",
      status: 422,
    });
  }

  const cancellationReason =
    body.cancellationReason !== undefined ||
    body.cancellation_reason !== undefined
      ? String(
          body.cancellationReason ?? body.cancellation_reason ?? ""
        ).trim() || null
      : null;

  return { status, cancellationReason };
}

export function validateOrderTransitionForRole(
  currentStatus,
  nextStatus,
  actorRole
) {
  const isStaff = actorRole === "admin" || actorRole === "merchant";
  const allowedNext = isStaff
    ? STAFF_ALLOWED_TRANSITIONS[currentStatus] || []
    : CUSTOMER_ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowedNext.includes(nextStatus)) {
    throw new AppError({
      code: "invalid_status_transition",
      message:
        "لا يمكن تغيير حالة الطلب إلى الحالة المطلوبة وفق قواعد العمل الحالية.",
      status: 422,
    });
  }
}

export function validateGuestTrackingInput(body = {}) {
  const orderNumber = String(body.orderNumber || body.order_number || "")
    .trim()
    .toUpperCase();
  const phone = normalizeEgyptianPhone(
    String(body.phone || body.customerPhone || "")
  );
  const token = String(body.token || body.trackingToken || "")
    .trim()
    .toLowerCase();

  if (
    !/^OT-[0-9A-F]{8}$/.test(orderNumber) ||
    !phone ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    throw new AppError({
      code: "invalid_tracking_credentials",
      message: "رقم الطلب أو رقم الموبايل أو رمز التتبع غير صحيح.",
      status: 422,
    });
  }

  return { orderNumber, phone, token };
}
