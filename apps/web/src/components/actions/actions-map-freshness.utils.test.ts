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
});
