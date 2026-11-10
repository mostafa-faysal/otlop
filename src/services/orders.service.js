import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

const SHARED_ORDERS_KEY = "otlob_shared_orders_v1";

function readClientSharedOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHARED_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClientSharedOrders(orders) {
  if (typeof window === "undefined") return;
  try {
    const safe = Array.isArray(orders) ? orders.slice(0, 300) : [];
    localStorage.setItem(SHARED_ORDERS_KEY, JSON.stringify(safe));
  } catch {
    // ignore
  }
}

function extractOrdersArray(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.orders)) return res.orders;
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export const ordersService = {
  /**
   * إنشاء طلب جديد في قاعدة البيانات عبر الـ API مع حفظ نسخة فورية لضمان الظهور اللحظي في لوحة التاجر.
   */
  async createOrder(payload) {
    const res = await axiosClient.post(ENDPOINTS.ORDERS.CREATE, payload);
    const createdOrder = res?.order || res?.data?.order || res?.data || res;

    if (typeof window !== "undefined" && createdOrder) {
      try {
        const orderNumber =
          createdOrder.orderNumber ||
          `OT-${Date.now().toString(16).slice(-8).toUpperCase()}`;
        const orderId = createdOrder.id || createdOrder.orderId || `ord_${Date.now()}`;
        const nowIso = new Date().toISOString();

        // استخدام بيانات السيرفر الموثوقة حصراً
        const itemsList = Array.isArray(createdOrder.items) && createdOrder.items.length > 0
          ? createdOrder.items.map((it, idx) => ({
              id: it.id || `${orderId}_item_${idx + 1}`,
              orderId,
              productId: String(it.productId || it.product_id || ""),
              productName: it.productName || it.name || "وجبة من القائمة",
              name: it.productName || it.name || "وجبة من القائمة",
              unitPrice: Number(it.unitPrice ?? it.price ?? 0),
              price: Number(it.unitPrice ?? it.price ?? 0),
              quantity: Math.max(1, Number(it.quantity) || 1),
              lineTotal: Number(it.lineTotal ?? ((it.unitPrice || 0) * (it.quantity || 1))),
            }))
          : (payload.items || []).map((it, idx) => ({
              id: `${orderId}_item_${idx + 1}`,
              orderId,
              productId: String(it.productId || it.id || ""),
              productName: it.name || "وجبة من القائمة",
              name: it.name || "وجبة من القائمة",
              unitPrice: 0,
              price: 0,
              quantity: Math.max(1, Number(it.quantity) || 1),
              lineTotal: 0,
            }));

        const subtotal = Number(createdOrder.subtotal ?? 0);
        const deliveryFee = Number(createdOrder.deliveryFee ?? 0);
        const discount = Number(createdOrder.discount ?? 0);
        const total = Number(createdOrder.total ?? 0);

        const localEntry = {
          id: orderId,
          orderNumber,
          storeId: payload.storeId,
          storeSlug: payload.storeSlug || null,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          deliveryAddress: payload.deliveryAddress,
          notes: payload.notes || null,
          status: createdOrder.status || "pending",
          subtotal,
          deliveryFee,
          discount,
          total,
          trackingToken: createdOrder.trackingToken || null,
          createdAt: nowIso,
          updatedAt: nowIso,
          items: itemsList,
        };

        const existing = readClientSharedOrders().filter(
          (o) => o.orderNumber !== orderNumber && o.id !== orderId
        );
        writeClientSharedOrders([localEntry, ...existing]);
      } catch {
        // ignore
      }
    }

    return res;
  },

  /**
   * جلب قائمة الطلبات (للعميل، التاجر، أو السوبر أدمن) مع فك تغليف data.items ودمج أي طلبات حديثة.
   */
  async getOrders(params = {}) {
    const queryParams = { ...params };
    if (params.storeId && !queryParams.store_id) {
      queryParams.store_id = params.storeId;
    }

    let apiItems = [];
    let rawRes = null;
    try {
      rawRes = await axiosClient.get(ENDPOINTS.ORDERS.LIST, {
        params: queryParams,
      });
      apiItems = extractOrdersArray(rawRes);
    } catch {
      apiItems = [];
    }

    const targetStoreId = params.storeId || params.store_id || null;
    const targetStoreSlug = params.storeSlug || params.slug || null;
    const targetStatus = params.status || null;

    const localOrders = readClientSharedOrders().filter((ord) => {
      if (targetStoreId || targetStoreSlug) {
        const matchesId =
          targetStoreId &&
          (ord.storeId === targetStoreId ||
            ord.store?.id === targetStoreId ||
            ord.storeSlug === targetStoreId ||
            ord.store?.slug === targetStoreId);
        const matchesSlug =
          targetStoreSlug &&
          (ord.storeSlug === targetStoreSlug ||
            ord.store?.slug === targetStoreSlug ||
            ord.storeId === targetStoreSlug);
        if (!matchesId && !matchesSlug) return false;
      }
      if (targetStatus && ord.status !== targetStatus) return false;
      return true;
    });

    const mergedMap = new Map();
    for (const localOrd of localOrders) {
      mergedMap.set(localOrd.orderNumber || localOrd.id, localOrd);
    }
    for (const srvOrd of apiItems) {
      const key = srvOrd.orderNumber || srvOrd.id;
      const existingLocal = mergedMap.get(key);
      mergedMap.set(key, {
        ...(existingLocal || {}),
        ...srvOrd,
        items:
          Array.isArray(srvOrd.items) && srvOrd.items.length > 0
            ? srvOrd.items
            : existingLocal?.items || [],
      });
    }

    const items = Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    return {
      ...(rawRes || {}),
      items,
      orders: items,
      data: {
        ...(rawRes?.data || {}),
        items,
        orders: items,
      },
    };
  },

  /**
   * جلب تفاصيل طلب محدد مع الأصناف وسجل الحالات.
   */
  async getOrderById(orderId) {
    return axiosClient.get(ENDPOINTS.ORDERS.BY_ID(orderId));
  },

  /**
   * تحديث حالة الطلب (accepted -> preparing -> on_the_way -> delivered أو cancelled).
   */
  async updateOrderStatus(orderId, payload) {
    if (typeof window !== "undefined" && payload?.status) {
      const current = readClientSharedOrders();
      const updated = current.map((o) =>
        o.id === orderId || o.orderNumber === orderId
          ? { ...o, status: payload.status, updatedAt: new Date().toISOString() }
          : o
      );
      writeClientSharedOrders(updated);
    }
    return axiosClient.patch(ENDPOINTS.ORDERS.BY_ID(orderId), payload);
  },

  /**
   * تتبع طلب الضيف باستخدام رقم الطلب ورقم الموبايل ورمز التتبع.
   */
  async trackGuestOrder(payload) {
    return axiosClient.post(ENDPOINTS.ORDERS.TRACK, payload);
  },

  /**
   * ربط طلب الضيف بحساب المستخدم بعد تسجيل الدخول.
   */
  async claimGuestOrder(payload) {
    return axiosClient.post(ENDPOINTS.ORDERS.CLAIM, payload);
  },
};
