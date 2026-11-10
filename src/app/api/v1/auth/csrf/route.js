import { withApiHandler } from "@/server/http/routeHandler";
import { issueCsrfToken } from "@/server/security/csrf";

export const GET = withApiHandler(
  async () => {
    const csrfToken = await issueCsrfToken();
    return {
      data: { csrfToken },
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    };
  },
  { skipCsrf: true }
);

