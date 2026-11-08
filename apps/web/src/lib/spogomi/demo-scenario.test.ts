import { describe, expect, it } from "vitest";
import { isSpogomiCachanDemoEvent, SPOGOMI_CACHAN_DEMO_NOTICE } from "./demo-scenario";

describe("SPOGOMI Cachan demo presentation contract", () => {
  it("recognizes only the explicitly marked synthetic scenario", () => {
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL" })).toBe(true);
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan, démonstration CleanMyMap" })).toBe(false);
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan officielle" })).toBe(false);
  });

  it("keeps the exact non-official disclosure available to every surface", () => {
    expect(SPOGOMI_CACHAN_DEMO_NOTICE).toBe("Démonstration fictive, données synthétiques, règlement non officiel");
  });
});
