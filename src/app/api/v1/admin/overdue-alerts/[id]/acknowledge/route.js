import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const POST = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return adminModule.acknowledgeOverdueAlert(params.id, body);
});

