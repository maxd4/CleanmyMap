import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("homepage cache contract", () => {
  it("keeps the global homepage ISR out of the five-minute cadence", () => {
    const source = read("./page.tsx");

    expect(source).toMatch(/export const revalidate = 3600/);
    expect(source).not.toMatch(/export const revalidate = 300/);
  });

  it("gives recent activity its independent ten-minute refresh lane", () => {
    const route = read("./api/homepage/activity/route.ts");
    const dataCache = read("../lib/actions/unified-source/unified-source-cache.ts");
    const component = read(
      "../components/accueil/accueil-community-credibility.tsx",
    );

    expect(route).toMatch(/export const revalidate = 600/);
    expect(route).toContain("s-maxage=600");
    expect(dataCache).toMatch(
      /UNIFIED_ACTION_CONTRACTS_CACHE_REVALIDATE_SECONDS = 600/,
    );
    expect(component).toContain("revalidateOnMount: true");
    expect(component).toContain("revalidateOnFocus: false");
    expect(component).toContain("revalidateOnReconnect: false");
    expect(component).not.toContain("refreshInterval");
    expect(read("./page.tsx")).not.toContain("loadRecentCommunityActivity");
    expect(read("../lib/accueil/data.ts")).toContain("loadRecentCommunityActivity");
  });

  it("keeps methodology on the snapshot-aligned daily cadence", () => {
    const source = read("./(app)/methodologie/page.tsx");

    expect(source).toMatch(/export const revalidate = 86400/);
    expect(source).not.toMatch(/export const revalidate = 300/);
  });

  it("keeps the root chrome request-independent for public ISR", () => {
    const source = read("../components/layout/root-layout-chrome.tsx");

    expect(source).not.toContain("getCurrentUserIdentity");
    expect(source).not.toMatch(/export async function RootLayoutChrome/);
    expect(source).toContain("<AppNavigationRibbon />");
  });
});
