import { supabaseAdminAdapter } from "../adapters/supabase/admin.adapter";

export const adminRepository = {
  getPlatformSettings: () => supabaseAdminAdapter.getPlatformSettings(),
  updatePlatformSettings: (updateCols) =>
    supabaseAdminAdapter.updatePlatformSettings(updateCols),
  recordMerchantPayment: (payload) =>
    supabaseAdminAdapter.recordMerchantPaymentRpc(payload),
  generateMonthlyStatements: (payload) =>
    supabaseAdminAdapter.generateMonthlyStatementsRpc(payload),
  listOverdueAlerts: (filters) =>
    supabaseAdminAdapter.listOverdueAlerts(filters),
  refreshOverdueAlerts: () => supabaseAdminAdapter.refreshOverdueAlertsRpc(),
  acknowledgeOverdueAlert: (alertId, notes) =>
    supabaseAdminAdapter.acknowledgeOverdueAlertRpc(alertId, notes),
  suspendStore: (storeId, reason) =>
    supabaseAdminAdapter.suspendStoreRpc(storeId, reason),
  reactivateStore: (storeId, notes) =>
    supabaseAdminAdapter.reactivateStoreRpc(storeId, notes),
  setStoreOpenStatus: (storeId, isOpen, reason) =>
    supabaseAdminAdapter.setStoreOpenStatusRpc(storeId, isOpen, reason),
  listStoreStatusLogs: (filters) =>
    supabaseAdminAdapter.listStoreStatusLogs(filters),
  refundOrderCommission: (orderId, reason) =>
    supabaseAdminAdapter.refundOrderCommissionRpc(orderId, reason),
};

