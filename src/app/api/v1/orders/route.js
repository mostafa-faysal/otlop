import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { ordersModule } from "@/server/modules/orders/orders.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return ordersModule.listOrders(searchParams);
});

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  return ordersModule.createOrder(body);
});

