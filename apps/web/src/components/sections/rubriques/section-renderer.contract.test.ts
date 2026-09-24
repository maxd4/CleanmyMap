import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("composed Climate heading contract", () => {
  it("keeps Climate as the only primary heading", () => {
    const renderer = read("./section-renderer.tsx");
    const compare = read("./compare-section.tsx");

    expect(renderer).toContain("<ClimateSection />");
    expect(renderer).toContain("<CompareSection />");
    expect(compare).toContain('headingLevel="h2"');
  });
});
