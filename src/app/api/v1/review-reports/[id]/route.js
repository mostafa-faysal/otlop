import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { reviewsModule } from "@/server/modules/reviews/reviews.module";

export const PATCH = withApiHandler(async (request, { params }) => {
  const body = await parseJsonBody(request);
  return reviewsModule.resolveReviewReport(params.id, body);
});

