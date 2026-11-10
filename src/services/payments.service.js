import axiosClient from "@/lib/api/axiosClient";
import { ENDPOINTS } from "@/lib/api/endpoints";

export const paymentsService = {
  /**
   * جلب الملخص المالي ولوحة المتابعة للمتجر (merchant_financial_summary)
   * @param {{ storeId?: string }} [params]
   */
  async getFinancialSummary(params = {}) {
    return axiosClient.get(ENDPOINTS.MERCHANT.FINANCIAL_SUMMARY, { params });
  },

  /**
   * جلب تقارير المبيعات اليومية (merchant_sales_reports)
   * @param {{ storeId?: string, from?: string, to?: string }} [params]
   */
  async getSalesReports(params = {}) {
    return axiosClient.get(ENDPOINTS.MERCHANT.SALES_REPORTS, { params });
  },

  /**
   * جلب حركات دفتر أستاذ العمولات (merchant_commission_ledger)
   * @param {{ storeId?: string, page?: number, limit?: number }} [params]
   */
  async getCommissionLedger(params = {}) {
    return axiosClient.get(ENDPOINTS.MERCHANT.LEDGER, { params });
  },

  /**
   * جلب كشوف الحسابات الشهرية (merchant_monthly_statements)
   * @param {{ storeId?: string, year?: number, status?: string }} [params]
   */
  async getMonthlyStatements(params = {}) {
    return axiosClient.get(ENDPOINTS.MERCHANT.STATEMENTS, { params });
  },

  /**
   * جلب سجل الدفعات المسددة للمنصة (merchant_payments)
   * @param {{ storeId?: string, page?: number, limit?: number }} [params]
   */
  async getMerchantPayments(params = {}) {
    return axiosClient.get(ENDPOINTS.MERCHANT.PAYMENTS, { params });
  },
};

