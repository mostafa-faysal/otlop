import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { catalogModule } from "@/server/modules/catalog/catalog.module";

export const GET = withApiHandler(async (_request, { params }) => {
  return catalogModule.getProductDetails(params.id);
});

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return catalogModule.updateProduct(params.id, body);
});

export const DELETE = withApiHandler(async (_request, { params }) => {
  return catalogModule.deleteProduct(params.id);
});
