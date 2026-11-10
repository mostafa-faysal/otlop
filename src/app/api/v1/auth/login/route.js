import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const result = await authModule.login(body);
  return {
    data: result,
    message: "تم تسجيل الدخول بنجاح.",
    headers: {
      "X-CSRF-Token": result.csrfToken,
    },
  };
});

