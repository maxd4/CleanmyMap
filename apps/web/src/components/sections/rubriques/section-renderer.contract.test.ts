import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("composed Climate heading contract", () => {
  it("keeps Climate as the only primary heading", () => {
    const renderer = read("./section-renderer.tsx");
    const compare = read("./compare-section.tsx");

    expect(renderer).toContain(
      "<ClimateSection initialData={initialData?.climate} />",
    );
    expect(renderer).toContain("<CompareSection />");
    expect(compare).toContain('headingLevel="h2"');
  });

  it("keeps Open Data primary and links to the dedicated Funding page", () => {
    const renderer = read("./section-renderer.tsx");
    const openData = read("./open-data-section.tsx");
    const funding = read("./funding-section.tsx");

    expect(renderer).toContain("<OpenDataSection />");
    const openDataRenderer = renderer.match(/"open-data": \(\) => \([\s\S]*?\n  \),\n  funding:/)?.[0] ?? "";
    expect(openDataRenderer).toContain("<OpenDataFundingLink />");
    expect(openDataRenderer).not.toContain("<FundingSection");
    expect(renderer).toContain('href="/sections/funding"');
    expect(renderer).toContain(
      "funding: (fundingOnParticipeUrl?: string) => (\n    <FundingSection onParticipeUrl={fundingOnParticipeUrl} />",
    );
    expect(openData).toContain("<PageHeader");
    expect(funding).toContain("headingLevel={headingLevel}");
  });
});
