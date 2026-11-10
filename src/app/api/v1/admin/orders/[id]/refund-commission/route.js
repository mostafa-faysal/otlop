import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const POST = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  const data = await adminModule.refundOrderCommission(params.id, body);
  return {
    data,
    message: "تم تسجيل القيد العكسي واسترداد عمولة الطلب بنجاح.",
  };
});

