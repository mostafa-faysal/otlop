import { createSupabaseRequestClient } from "./client.js";
import { getSupabaseAdminClient } from "./adminClient.js";
import { normalizeSupabaseError } from "./errorNormalizer.js";
import { AppError } from "../../http/AppError.js";
import {
  mapDbOverdueAlertToDomain,
  mapDbPlatformSettingsToDomain,
  mapDbRecordedPaymentResultToDomain,
  mapDbStoreStatusLogToDomain,
  mapDomainPlatformSettingsToDb,
} from "./mappers/admin.mapper.js";

export const supabaseAdminAdapter = {
  async getPlatformSettings() {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("platform_settings")
      .select(
        "id, default_commission_rate, service_fee_active, service_fee_amount, suspension_grace_period_days, updated_at, updated_by"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw normalizeSupabaseError(error, "platform_settings_fetch_failed");
    }

    if (data) {
      return mapDbPlatformSettingsToDomain(data);
    }

    return {
      id: 1,
      defaultCommissionRate: 5,
      serviceFeeActive: false,
      serviceFeeAmount: 0,
      suspensionGracePeriodDays: 7,
      updatedAt: new Date().toISOString(),
    };
  },

  async updatePlatformSettings(domainUpdate) {
    const adminClient = getSupabaseAdminClient();
    const updateCols = mapDomainPlatformSettingsToDb(domainUpdate);
    const { data, error } = await adminClient
      .from("platform_settings")
      .update({ ...updateCols, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select(
        "id, default_commission_rate, service_fee_active, service_fee_amount, suspension_grace_period_days, updated_at, updated_by"
      )
      .maybeSingle();

    if (error) {
      throw normalizeSupabaseError(error, "platform_settings_update_failed");
    }

    if (!data) {
      throw new AppError({
        code: "platform_settings_not_found",
        message: "إعدادات المنصة غير موجودة في قاعدة البيانات.",
        status: 404,
      });
    }

    return mapDbPlatformSettingsToDomain(data);
  },

  async recordMerchantPaymentRpc({
    storeId,
    amount,
    paymentMethod,
    referenceNumber,
    statementId,
    notes,
  }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("record_merchant_payment", {
      p_store_id: storeId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_reference_number: referenceNumber ?? null,
      p_statement_id: statementId ?? null,
      p_notes: notes ?? null,
    });

    if (error) throw normalizeSupabaseError(error, "payment_failed");
    return mapDbRecordedPaymentResultToDomain(data);
  },

  async generateMonthlyStatementsRpc({ year, month }) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("generate_monthly_statements", {
      p_year: year,
      p_month: month,
    });

    if (error) throw normalizeSupabaseError(error, "invalid_period");
    return Number(data ?? 0);
  },

  async listOverdueAlerts({ unresolvedOnly = false } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("admin_overdue_alerts_view")
      .select("*")
      .order("days_overdue", { ascending: false });

    if (unresolvedOnly) {
      query = query.eq("is_resolved", false);
    }

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbOverdueAlertToDomain);
  },

  async refreshOverdueAlertsRpc() {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc(
      "refresh_overdue_statements_and_alerts"
    );
    if (error) throw normalizeSupabaseError(error);
    return Number(data ?? 0);
  },

  async acknowledgeOverdueAlertRpc(alertId, notes) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("acknowledge_overdue_alert", {
      p_alert_id: alertId,
      p_notes: notes ?? null,
    });
    if (error) throw normalizeSupabaseError(error);
    return Boolean(data);
  },

  async suspendStoreRpc(storeId, reason) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("suspend_store", {
      p_store_id: storeId,
      p_reason: reason,
    });
    if (error) throw normalizeSupabaseError(error);
    return Boolean(data);
  },

  async reactivateStoreRpc(storeId, notes) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("reactivate_store", {
      p_store_id: storeId,
      p_notes: notes ?? null,
    });
    if (error) throw normalizeSupabaseError(error);
    return Boolean(data);
  },

  async setStoreOpenStatusRpc(storeId, isOpen, reason) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc("set_store_open_status", {
      p_store_id: storeId,
      p_is_open: isOpen,
      p_reason: reason ?? null,
    });
    if (error) throw normalizeSupabaseError(error);
    return Boolean(data);
  },

  async listStoreStatusLogs({ storeId, limit = 50 } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("store_status_logs")
      .select(
        "*, stores(id, name, slug), profiles:changed_by(id, full_name, role)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbStoreStatusLogToDomain);
  },

  async refundOrderCommissionRpc(orderId, reason) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase.rpc(
      "process_order_commission_refund",
      {
        p_order_id: orderId,
        p_reason: reason,
      }
    );
    if (error) throw normalizeSupabaseError(error);
    return Boolean(data);
  },
};
