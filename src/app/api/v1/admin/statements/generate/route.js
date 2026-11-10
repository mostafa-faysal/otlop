import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const data = await adminModule.generateMonthlyStatements(body);
  return {
    data,
    message: "تم إصدار وتحديث كشوف الحسابات الشهرية بنجاح.",
  };
});

