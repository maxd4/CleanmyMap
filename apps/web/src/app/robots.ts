import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import {
  getPrivateSectionRoutes,
  PRIVATE_APP_ROUTE_PREFIXES,
} from "@/lib/seo/indexability";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

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
          EXPLORER_ROUTE,
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
          EXPLORER_ROUTE,
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
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
