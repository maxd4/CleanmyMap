import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("global structured data", () => {
  it("limits root-layout JSON-LD to factual organization and website schemas", () => {
    const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
    const navigationData = readFileSync(
      new URL("../components/seo/structured-data/navigation-data.tsx", import.meta.url),
      "utf8",
    );
    const renderedSchemas = Array.from(
      layout.matchAll(/<([A-Z]\w*JsonLd)\s*\/>/g),
      ([, component]) => component,
    );

    expect(renderedSchemas).toEqual(["OrganizationJsonLd", "WebSiteJsonLd"]);
    expect(layout).not.toContain("FAQJsonLd");
    expect(navigationData).not.toMatch(/interactionStatistic|userInteractionCount/);
  });
});
