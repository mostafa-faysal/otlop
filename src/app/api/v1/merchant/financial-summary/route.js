import { withApiHandler } from "@/server/http/routeHandler";
import { financeModule } from "@/server/modules/finance/finance.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return financeModule.getFinancialSummary(searchParams);
});

