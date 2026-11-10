import { financeRepository } from "../../repositories/finance.repository";
import { authModule } from "../auth/auth.module";
import { catalogModule } from "../catalog/catalog.module";
import {
  toFinancialSummaryDTO,
  toLedgerEntryDTO,
  toMerchantPaymentDTO,
  toMonthlyStatementDTO,
  toSalesReportDTO,
} from "./finance.dto";

export const financeModule = {
  async verifyFinanceAccess(storeId) {
    const auth = await authModule.requireRole(["merchant", "admin"]);
    if (storeId && auth.role !== "admin") {
      await catalogModule.assertStoreOwnership(storeId);
    }
    return auth;
  },

  async getFinancialSummary(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    await this.verifyFinanceAccess(storeId);
    const entities = await financeRepository.getFinancialSummary({ storeId });
    return {
      items: entities.map(toFinancialSummaryDTO),
      summary: entities[0] ? toFinancialSummaryDTO(entities[0]) : null,
    };
  },

  async getSalesReports(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    await this.verifyFinanceAccess(storeId);
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const entities = await financeRepository.getSalesReports({
      storeId,
      from,
      to,
    });
    return {
      items: entities.map(toSalesReportDTO),
    };
  },

  async getCommissionLedger(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    await this.verifyFinanceAccess(storeId);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 25))
    );

    const { rows, total } = await financeRepository.getCommissionLedger({
      storeId,
      page,
      limit,
    });

    return {
      data: {
        items: rows.map(toLedgerEntryDTO),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getMonthlyStatements(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    await this.verifyFinanceAccess(storeId);
    const year = searchParams.get("year")
      ? Number(searchParams.get("year"))
      : null;
    const status = searchParams.get("status") || null;

    const entities = await financeRepository.getMonthlyStatements({
      storeId,
      year,
      status,
    });

    return {
      items: entities.map(toMonthlyStatementDTO),
    };
  },

  async getMerchantPayments(searchParams) {
    const storeId = searchParams.get("storeId") || null;
    await this.verifyFinanceAccess(storeId);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 25))
    );

    const { rows, total } = await financeRepository.getMerchantPayments({
      storeId,
      page,
      limit,
    });

    return {
      data: {
        items: rows.map(toMerchantPaymentDTO),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
