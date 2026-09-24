import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import {
  PUBLIC_APP_SITEMAP_PATHS,
  getPublicSectionSitemapPaths,
} from "@/lib/seo/indexability";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

const SITEMAP_PATH_PRIORITY: Record<string, number> = {
  "/": 1,
  "/actions/map": 0.7,
  "/actions/new": 0.6,
  "/contact": 0.4,
  "/reports": 0.7,
  "/methodologie": 0.7,
  "/learn/comprendre": 0.55,
  "/learn/bonnes-pratiques": 0.55,
  "/learn/ecole": 0.55,
  "/learn/sentrainer": 0.55,
  "/mentions-legales": 0.3,
  "/conditions-generales-utilisation": 0.3,
  "/politique-confidentialite": 0.3,
  "/politique-cookies": 0.3,
  "/signalement": 0.5,
  "/signaler-contenu-illicite": 0.3,
};

function toSitemapEntry(url: string): MetadataRoute.Sitemap[number] {
  const pathname = new URL(url, appUrl).pathname;

  return {
    url,
    changeFrequency:
      pathname === "/" ||
      pathname === "/actions/map"
        ? "daily"
        : pathname.startsWith("/learn/")
          ? "monthly"
          : pathname === "/reports"
            ? "weekly"
            : "monthly",
    priority: SITEMAP_PATH_PRIORITY[pathname] ?? 0.5,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = PUBLIC_APP_SITEMAP_PATHS.map((pathname) =>
    toSitemapEntry(`${appUrl}${pathname}`),
  );

  const sectionEntries = getPublicSectionSitemapPaths().map((pathname) =>
    toSitemapEntry(`${appUrl}${pathname}`),
  );

  return [...staticEntries, ...sectionEntries];
}
