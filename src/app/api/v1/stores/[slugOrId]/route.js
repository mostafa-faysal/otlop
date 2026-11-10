import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { catalogModule } from "@/server/modules/catalog/catalog.module";

export const GET = withApiHandler(async (_request, { params }) => {
  return catalogModule.getStoreDetails(params.slugOrId);
});

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return catalogModule.updateStore(params.slugOrId, body);
});

export const DELETE = withApiHandler(async (_request, { params }) => {
  return catalogModule.deleteStore(params.slugOrId);
});
