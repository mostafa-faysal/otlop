export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://otlob-delivery.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/stores",
          "/stores/*",
          "/offers",
          "/search",
          "/privacy",
          "/terms",
          "/merchant/register",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/merchant",
          "/merchant/*",
          "/cart",
          "/checkout",
          "/profile",
          "/profile/*",
          "/orders/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

