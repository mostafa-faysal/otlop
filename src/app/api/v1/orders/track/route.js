import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { ordersModule } from "@/server/modules/orders/orders.module";

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  return ordersModule.trackGuestOrder(body);
});

