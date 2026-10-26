import type { MetadataRoute } from "next";

import { SITE as S } from "@/lib/site";

const SITE = S.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/checkout", "/login", "/signup", "/reset-password", "/forgot-password", "/admin", "/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
