import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const GET = withApiHandler(async () => {
  return authModule.getMe();
});

export const PATCH = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  return authModule.updateMe(body);
});

