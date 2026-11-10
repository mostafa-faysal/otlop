import { supabaseOrdersAdapter } from "../adapters/supabase/orders.adapter";

export const ordersRepository = {
  createOrderAtomic: (params) => supabaseOrdersAdapter.createOrderRpc(params),
  listOrders: (filters) => supabaseOrdersAdapter.listOrders(filters),
  getOrderById: (orderId) => supabaseOrdersAdapter.getOrderById(orderId),
  updateOrderStatus: (orderId, payload) =>
    supabaseOrdersAdapter.updateOrderStatus(orderId, payload),
  trackGuestOrder: (payload) =>
    supabaseOrdersAdapter.trackGuestOrderRpc(payload),
  claimGuestOrder: (payload) =>
    supabaseOrdersAdapter.claimGuestOrderRpc(payload),
};

