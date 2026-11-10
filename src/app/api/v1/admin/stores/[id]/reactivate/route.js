import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const POST = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  const data = await adminModule.reactivateStore(params.id, body);
  return {
    data,
    message: "تمت إعادة تفعيل المتجر بنجاح.",
  };
});

