import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The card images are drawn on request, so crawlers stay off them.
    rules: { userAgent: "*", allow: "/", disallow: ["/mlb/api/", "/*/ratings/card/", "/*/players/card/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
