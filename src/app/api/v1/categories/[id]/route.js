import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { catalogModule } from "@/server/modules/catalog/catalog.module";

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return catalogModule.updateCategory(params.id, body);
});

export const DELETE = withApiHandler(async (_request, { params }) => {
  return catalogModule.deleteCategory(params.id);
});

