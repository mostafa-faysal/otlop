import { withApiHandler } from "@/server/http/routeHandler";
import { adminModule } from "@/server/modules/admin/admin.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return adminModule.listOverdueAlerts(searchParams);
});

export const POST = withApiHandler(async () => {
  const data = await adminModule.refreshOverdueAlerts();
  return {
    data,
    message: "تم تحديث فحص المتأخرات والتنبيهات الإدارية بنجاح.",
  };
});

