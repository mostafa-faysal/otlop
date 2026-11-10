import { withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return adminModule.listStoreStatusLogs(searchParams);
});

