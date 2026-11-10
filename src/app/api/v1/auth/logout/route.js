import { withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const POST = withApiHandler(async () => {
  const result = await authModule.logout();
  return {
    data: result,
    message: "تم تسجيل الخروج بنجاح.",
  };
});

