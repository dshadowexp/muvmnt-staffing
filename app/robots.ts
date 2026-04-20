import { env } from "@/data/env/client";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  return {
    rules: [
        {
            userAgent: "*",
            allow: "/",
            disallow: ["/dashboard/", "/api/", "/onboarding/", "/upgrade/"],
        },
        {
            userAgent: "Googlebot",
            allow: "/",
            disallow: ["/dashboard/", "/api/", "/onboarding/", "/upgrade/"],
        }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}