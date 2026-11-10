import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { authModule } from "@/server/modules/auth/auth.module";

export const GET = withApiHandler(async () => {
  return authModule.listAddresses();
});

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const data = await authModule.createAddress(body);
  return {
    status: 201,
    data,
    message: "تمت إضافة العنوان بنجاح.",
  };
});

