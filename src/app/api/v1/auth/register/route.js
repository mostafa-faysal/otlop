import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const result = await authModule.register(body);
  return {
    status: 201,
    data: result,
    message: "تم إنشاء الحساب بنجاح.",
    headers: {
      "X-CSRF-Token": result.csrfToken,
    },
  };
});

