import { createSupabaseRequestClient } from "./client";
import { normalizeSupabaseError } from "./errorNormalizer";
import { AppError } from "../../http/AppError";
import {
  mapDbFinancialSummaryToDomain,
  mapDbLedgerEntryToDomain,
  mapDbMerchantPaymentToDomain,
  mapDbMonthlyStatementToDomain,
  mapDbSalesReportToDomain,
} from "./mappers/finance.mapper";

export const supabaseFinanceAdapter = {
  async getFinancialSummary({ storeId } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase.from("merchant_financial_summary").select("*");
    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbFinancialSummaryToDomain);
  },

  async getSalesReports({ storeId, from, to } = {}) {
    const supabase = await createSupabaseRequestClient();
    // ملاحظة: اسم عمود التاريخ في merchant_sales_reports داخل schema.sql هو sale_date
    let query = supabase
      .from("merchant_sales_reports")
      .select("*")
      .order("sale_date", { ascending: false });

    if (storeId) query = query.eq("store_id", storeId);
    if (from) query = query.gte("sale_date", from);
    if (to) query = query.lte("sale_date", to);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbSalesReportToDomain);
  },

  async getCommissionLedger({ storeId, page = 1, limit = 25 } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("merchant_commission_ledger")
      .select("*, orders(order_number)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (storeId) query = query.eq("store_id", storeId);

    const offset = (page - 1) * limit;
    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) throw normalizeSupabaseError(error);
    return {
      rows: (data || []).map(mapDbLedgerEntryToDomain),
      total: count || 0,
    };
  },

  async getMonthlyStatements({ storeId, year, status } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("merchant_monthly_statements")
      .select("*, stores(id, name, slug)")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (storeId) query = query.eq("store_id", storeId);
    if (year) query = query.eq("year", year);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw normalizeSupabaseError(error);
    return (data || []).map(mapDbMonthlyStatementToDomain);
  },

  async getStatementById(statementId) {
    const supabase = await createSupabaseRequestClient();
    const { data, error } = await supabase
      .from("merchant_monthly_statements")
      .select("*, stores(id, name, slug)")
      .eq("id", statementId)
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) {
      throw new AppError({
        code: "statement_not_found",
        message: "كشف الحساب المطلوب غير موجود.",
        status: 404,
      });
    }
    return mapDbMonthlyStatementToDomain(data);
  },

  async getMerchantPayments({ storeId, page = 1, limit = 25 } = {}) {
    const supabase = await createSupabaseRequestClient();
    let query = supabase
      .from("merchant_payments")
      .select("*, merchant_monthly_statements(statement_number)", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (storeId) query = query.eq("store_id", storeId);

    const offset = (page - 1) * limit;
    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) throw normalizeSupabaseError(error);
    return {
      rows: (data || []).map(mapDbMerchantPaymentToDomain),
      total: count || 0,
    };
  },
};
