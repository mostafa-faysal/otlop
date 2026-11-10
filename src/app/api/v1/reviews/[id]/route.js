import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { reviewsModule } from "@/server/modules/reviews/reviews.module";

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return reviewsModule.updateReview(params.id, body);
});

export const DELETE = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request).catch(() => ({}));
  return reviewsModule.deleteReview(params.id, { asAdmin: true, ...body });
});

