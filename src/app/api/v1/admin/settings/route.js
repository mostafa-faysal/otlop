import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const GET = withApiHandler(async () => {
  return adminModule.getPlatformSettings();
});

export const PATCH = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  return adminModule.updatePlatformSettings(body);
});

