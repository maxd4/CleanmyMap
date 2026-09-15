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
    expect(routePage).toContain("buildActionCreationPanelHref");
    expect(routePage).toContain('"itineraire"');
    expect(routePage).toContain("redirect(");
    expect(routePage).not.toContain("RouteSection");
  });

  it("redirects weather and guide aliases to the weather panel", () => {
    expect(dynamicPage).toContain(
      'normalizedSectionId === "guide" || normalizedSectionId === "weather"',
    );
    expect(dynamicPage).toContain("buildActionCreationPanelHref");
    expect(dynamicPage).toContain('"meteo"');
    expect(dynamicPage).not.toContain('redirect("/sections/weather")');
  });
});
