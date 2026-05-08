import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import {
  getPrivateSectionRoutes,
  PRIVATE_APP_ROUTE_PREFIXES,
} from "@/lib/seo/indexability";

const PRIVATE_ROBOTS_PATHS = [
  ...PRIVATE_APP_ROUTE_PREFIXES,
  ...getPrivateSectionRoutes(),
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_ROBOTS_PATHS,
      },
      {
        userAgent: "GPTBot",
        allow: [
          "/observatoire",
          "/explorer",
          "/methodologie",
          "/learn",
        ],
        disallow: [
          ...PRIVATE_ROBOTS_PATHS,
        ],
      },
      {
        userAgent: "ChatGPT-User",
        allow: [
          "/observatoire",
          "/explorer",
          "/methodologie",
        ],
        disallow: [
          ...PRIVATE_ROBOTS_PATHS,
        ],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: PRIVATE_ROBOTS_PATHS,
      },
      {
        userAgent: "BingBot",
        allow: "/",
        disallow: PRIVATE_ROBOTS_PATHS,
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr"}/sitemap.xml`,
  };
}
