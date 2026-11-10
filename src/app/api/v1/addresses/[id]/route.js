import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return authModule.updateAddress(params.id, body);
});

export const DELETE = withApiHandler(async (_request, { params }) => {
  return authModule.deleteAddress(params.id);
});

