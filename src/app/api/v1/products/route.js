import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { catalogModule } from "@/server/modules/catalog/catalog.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return catalogModule.listProducts(searchParams);
});

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  const data = await catalogModule.createProduct(body);
  return {
    status: 201,
    data,
    message: "تمت إضافة الصنف بنجاح.",
  };
});

