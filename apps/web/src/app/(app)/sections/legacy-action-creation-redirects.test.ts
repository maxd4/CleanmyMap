import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routePage = readFileSync(
  new URL("./route/page.tsx", import.meta.url),
  "utf8",
);
const dynamicPage = readFileSync(
  new URL("./[sectionId]/page.tsx", import.meta.url),
  "utf8",
);

describe("legacy action creation surfaces", () => {
  it("redirects the old route page to the route panel", () => {
    expect(routePage).toContain("buildSeoRedirectTarget");
    expect(routePage).toContain('"/sections/route"');
    expect(routePage).toContain("permanentRedirect(");
    expect(routePage).not.toContain("RouteSection");
  });

  it("redirects weather and guide aliases to the weather panel", () => {
    expect(dynamicPage).toContain(
      'normalizedSectionId === "guide" || normalizedSectionId === "weather"',
    );
    expect(dynamicPage).toContain("buildSeoRedirectTarget");
    expect(dynamicPage).toContain('"/sections/guide"');
    expect(dynamicPage).toContain('"/sections/weather"');
    expect(dynamicPage).not.toContain('redirect("/sections/weather")');
  });

  it("uses the SEO redirect catalog for direct-message and join aliases", () => {
    expect(dynamicPage).toContain('"/sections/dm"');
    expect(dynamicPage).toContain('"/sections/rejoindre-un-formulaire"');
    expect(dynamicPage).not.toContain("buildLegacyJoinActionRedirect");
  });
});
