import { parseJsonBody, withApiHandler } from "@/server/http/routeHandler";
import { reviewsModule } from "@/server/modules/reviews/reviews.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return reviewsModule.listReviewReports(searchParams);
});

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody(request);
  return reviewsModule.createReviewReport(body);
});

