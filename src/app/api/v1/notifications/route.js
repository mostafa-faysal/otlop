import { withApiHandler } from "@/server/http/routeHandler";
import { reviewsModule } from "@/server/modules/reviews/reviews.module";

export const GET = withApiHandler(async (_request, { searchParams }) => {
  return reviewsModule.listNotifications(searchParams);
});

