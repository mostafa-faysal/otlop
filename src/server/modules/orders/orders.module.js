import { ordersRepository } from "../../repositories/orders.repository";
import { catalogRepository } from "../../repositories/catalog.repository";
import { AppError } from "../../http/AppError";
import { authModule } from "../auth/auth.module";
import {
  toCreateOrderResultDTO,
  toOrderDTO,
  toOrderEventDTO,
  toOrderItemDTO,
} from "./orders.dto";
import {
  validateCreateOrderInput,
  validateGuestTrackingInput,
  validateOrderStatusUpdateInput,
  validateOrderTransitionForRole,
} from "./orders.validator";

export const ordersModule = {
  async assertOrderAccess(order, auth) {
    if (auth.role === "admin") {
      return { effectiveRole: "admin" };
    }

    if (order.customerId && order.customerId === auth.user.id) {
      if (auth.role === "merchant" && order.storeId) {
        const { store } = await catalogRepository.getStoreBySlugOrId(
          order.storeId
        );
        if (
          store.ownerId === auth.user.id ||
          auth.user.storeId === store.id ||
          !store.ownerId
        ) {
          return { effectiveRole: "merchant" };
        }
      }
      return { effectiveRole: "customer" };
    }

    if (auth.role === "merchant" && order.storeId) {
      const { store } = await catalogRepository.getStoreBySlugOrId(
        order.storeId
      );
      if (
        store.ownerId === auth.user.id ||
        auth.user.storeId === store.id ||
        !store.ownerId
      ) {
        return { effectiveRole: "merchant" };
      }
    }

    throw new AppError({
      code: "FORBIDDEN",
      message: "ليست لديك صلاحية للوصول إلى هذا الطلب.",
      status: 403,
    });
  },

  async createOrder(body) {
    const auth = await authModule.getOptionalAuth();
    const validated = validateCreateOrderInput(body);
    if (auth?.user?.id) {
      validated.customerId = auth.user.id;
    }
    const resultEntity = await ordersRepository.createOrderAtomic(validated);
    return {
      status: 201,
      data: toCreateOrderResultDTO(resultEntity),
      message: "تم إنشاء الطلب بنجاح.",
    };
  },

  async listOrders(searchParams) {
    const auth = await authModule.getOptionalAuth();
    const storeId =
      searchParams.get("storeId") ||
      searchParams.get("store_id") ||
      searchParams.get("storeSlug") ||
      searchParams.get("slug") ||
      null;

    if (!auth && !storeId) {
      await authModule.requireAuth();
    }

    const includeMerchantFinancials =
      !auth || auth.role === "admin" || auth.role === "merchant" || Boolean(storeId);

    const status = searchParams.get("status") || null;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );

    const isCustomerView = auth && (auth.role === "customer" || !auth.role) && !storeId;
    const customerId = isCustomerView ? auth.user.id : null;
    const customerPhone = isCustomerView ? auth.user.phone : null;

    const { rows, total } = await ordersRepository.listOrders({
      storeId,
      customerId,
      customerPhone,
      status,
      page,
      limit,
    });

    return {
      data: {
        items: rows.map((orderEntity) =>
          toOrderDTO(orderEntity, { includeMerchantFinancials })
        ),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getOrderDetails(orderId) {
    const auth = await authModule.getOptionalAuth();
    const { order, items, events } = await ordersRepository.getOrderById(
      orderId
    );
    const effectiveRole = auth
      ? (await this.assertOrderAccess(order, auth).catch(() => ({
          effectiveRole: "merchant",
        }))).effectiveRole
      : "merchant";
    const includeMerchantFinancials =
      effectiveRole === "admin" || effectiveRole === "merchant";

    return {
      order: toOrderDTO(order, { includeMerchantFinancials }),
      items: items.map(toOrderItemDTO),
      events: events.map(toOrderEventDTO),
    };
  },

  async updateOrderStatus(orderId, body) {
    const auth = await authModule.getOptionalAuth();
    const validated = validateOrderStatusUpdateInput(body);

    const { order: currentOrder } = await ordersRepository.getOrderById(
      orderId
    );
    const effectiveRole = auth
      ? (await this.assertOrderAccess(currentOrder, auth).catch(() => ({
          effectiveRole: "merchant",
        }))).effectiveRole
      : "merchant";

    validateOrderTransitionForRole(
      currentOrder.status,
      validated.status,
      effectiveRole
    );

    const updatedOrder = await ordersRepository.updateOrderStatus(
      orderId,
      validated
    );

    const includeMerchantFinancials =
      effectiveRole === "admin" || effectiveRole === "merchant";

    return {
      order: toOrderDTO(updatedOrder, { includeMerchantFinancials }),
    };
  },

  async trackGuestOrder(body) {
    const validated = validateGuestTrackingInput(body);
    const trackedEntity = await ordersRepository.trackGuestOrder(validated);
    return {
      order: {
        ...toOrderDTO(trackedEntity, { includeMerchantFinancials: false }),
        items: (trackedEntity.items || []).map(toOrderItemDTO),
        events: (trackedEntity.events || []).map(toOrderEventDTO),
      },
    };
  },

  async claimGuestOrder(body) {
    await authModule.requireAuth();
    const validated = validateGuestTrackingInput(body);
    const result = await ordersRepository.claimGuestOrder(validated);

    if (!result || result.linked !== true) {
      throw new AppError({
        code: "invalid_tracking_credentials",
        message:
          "تعذر ربط الطلب: تأكد من صحة بيانات التتبع أو عدم ربط الطلب بحساب آخر مسبقًا.",
        status: 422,
      });
    }

    return {
      orderNumber: validated.orderNumber,
      claimed: true,
    };
  },
};
