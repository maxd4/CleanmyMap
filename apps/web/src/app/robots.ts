import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
          "/dashboard",
          "/profil",
          "/admin",
          "/api/",
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
          "/dashboard",
          "/profil",
          "/admin",
        ],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "BingBot",
        allow: "/",
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr"}/sitemap.xml`,
  };
}
