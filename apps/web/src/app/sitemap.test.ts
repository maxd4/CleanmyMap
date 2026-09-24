import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import {
  PRIVATE_APP_ROUTE_PREFIXES,
  PUBLIC_APP_SITEMAP_PATHS,
  getPrivateSectionRoutes,
  getPublicSectionSitemapPaths,
} from "@/lib/seo/indexability";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";

describe("public sitemap metadata", () => {
  it("uses the intended change frequency for each public route", () => {
    const entries = sitemap();
    const byPath = new Map(
      entries.map((entry) => [new URL(entry.url).pathname, entry]),
    );

    for (const pathname of ["/", "/en", EXPLORER_ROUTE, "/actions/map"]) {
      expect(byPath.get(pathname)?.changeFrequency).toBe("daily");
    }

    expect(byPath.get("/reports")?.changeFrequency).toBe("weekly");

    const dailyPaths = new Set(["/", "/en", EXPLORER_ROUTE, "/actions/map"]);
    for (const [pathname, entry] of byPath) {
      if (dailyPaths.has(pathname) || pathname === "/reports") {
        continue;
      }
      expect(entry.changeFrequency).toBe("monthly");
    }

    expect(entries.map((entry) => new URL(entry.url).pathname)).toEqual([
      ...PUBLIC_APP_SITEMAP_PATHS,
      ...getPublicSectionSitemapPaths(),
    ]);
  });

  it("omits lastModified when no per-page modification dates are available", () => {
    for (const entry of [...sitemap(), ...sitemap()]) {
      expect(entry).not.toHaveProperty("lastModified");
    }
  });

  it("publishes unique absolute URLs on the configured canonical origin only", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    const parsedUrls = urls.map((url) => new URL(url));
    const [firstUrl] = parsedUrls;
    const privatePrefixes = [
      ...PRIVATE_APP_ROUTE_PREFIXES,
      ...getPrivateSectionRoutes(),
    ];

    expect(new Set(urls).size).toBe(urls.length);

    for (const url of parsedUrls) {
      expect(url.origin).toBe(firstUrl.origin);
      expect(["http:", "https:"]).toContain(url.protocol);
      expect(
        privatePrefixes.some(
          (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
        ),
      ).toBe(false);
    }
  });
});
