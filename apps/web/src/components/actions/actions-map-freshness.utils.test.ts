import { describe, expect, it } from "vitest";
import { formatMapFreshnessLabel } from "./actions-map-freshness.utils";

describe("actions map freshness utils", () => {
  it("formats a last update label from a timestamp", () => {
    const label = formatMapFreshnessLabel(new Date("2026-04-28T14:45:00.000Z").getTime());
    expect(label).toContain("Dernière actualisation");
  });

  it("returns null for invalid timestamps", () => {
    expect(formatMapFreshnessLabel(null)).toBeNull();
    expect(formatMapFreshnessLabel(Number.NaN)).toBeNull();
  });

  it("describes data refresh time rather than terrain pollution", () => {
    const label = formatMapFreshnessLabel(Date.parse("2026-08-27T14:32:00.000Z"));

    expect(label).toMatch(/^Dernière actualisation /);
    expect(label).not.toContain("pollution");
    expect(label).not.toContain("terrain");
  });
});
