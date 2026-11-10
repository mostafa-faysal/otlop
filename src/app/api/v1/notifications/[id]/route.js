import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { reviewsModule } from "@/server/modules/reviews/reviews.module";

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return reviewsModule.markNotificationRead(params.id, body);
});

export const DELETE = withApiHandler(async (_request, { params }) => {
  return reviewsModule.deleteNotification(params.id);
});

