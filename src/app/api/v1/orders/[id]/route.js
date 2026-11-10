import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { ordersModule } from "@/server/modules/orders/orders.module";

export const GET = withApiHandler(async (_request, { params }) => {
  return ordersModule.getOrderDetails(params.id);
});

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return ordersModule.updateOrderStatus(params.id, body);
});

