import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import {
  PUBLIC_APP_SITEMAP_PATHS,
  getPublicSectionSitemapPaths,
} from "@/lib/seo/indexability";

const SITEMAP_PATH_PRIORITY: Record<string, number> = {
  "/": 1,
  "/en": 0.9,
  "/explorer": 0.9,
  "/observatoire": 0.8,
  "/reports": 0.7,
  "/methodologie": 0.7,
  "/learn": 0.65,
  "/learn/hub": 0.6,
  "/learn/comprendre": 0.55,
  "/learn/bonnes-pratiques": 0.55,
  "/learn/ressources": 0.55,
  "/learn/sentrainer": 0.55,
  "/actions/map": 0.7,
  "/declaration-simple": 0.6,
  "/mentions-legales": 0.3,
  "/conditions-generales-utilisation": 0.3,
  "/conditions-utilisation": 0.3,
  "/politique-confidentialite": 0.3,
  "/politique-cookies": 0.3,
};

function toSitemapEntry(url: string, now: Date): MetadataRoute.Sitemap[number] {
  return {
    url,
    lastModified: now,
    changeFrequency:
      url === "/" || url === "/en" || url === "/explorer" || url === "/actions/map"
        ? "daily"
        : url.startsWith("/learn/")
          ? "monthly"
          : url === "/observatoire"
            ? "hourly"
            : url === "/reports"
              ? "weekly"
              : "monthly",
    priority: SITEMAP_PATH_PRIORITY[new URL(url, "https://cleanmymap.fr").pathname] ?? 0.5,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL || "https://cleanmymap.fr";
  const now = new Date();

  const staticEntries = PUBLIC_APP_SITEMAP_PATHS.map((pathname) =>
    toSitemapEntry(`${base}${pathname}`, now),
  );
  const sectionEntries = getPublicSectionSitemapPaths().map((pathname) =>
    toSitemapEntry(`${base}${pathname}`, now),
  );

  return [...staticEntries, ...sectionEntries];
}
