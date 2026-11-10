import { supabaseFinanceAdapter } from "../adapters/supabase/finance.adapter";

export const financeRepository = {
  getFinancialSummary: (filters) =>
    supabaseFinanceAdapter.getFinancialSummary(filters),
  getSalesReports: (filters) =>
    supabaseFinanceAdapter.getSalesReports(filters),
  getCommissionLedger: (filters) =>
    supabaseFinanceAdapter.getCommissionLedger(filters),
  getMonthlyStatements: (filters) =>
    supabaseFinanceAdapter.getMonthlyStatements(filters),
  getStatementById: (statementId) =>
    supabaseFinanceAdapter.getStatementById(statementId),
  getMerchantPayments: (filters) =>
    supabaseFinanceAdapter.getMerchantPayments(filters),
};
