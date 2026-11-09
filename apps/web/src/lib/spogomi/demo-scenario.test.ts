import { describe, expect, it } from "vitest";
import { getSpogomiCachanDemoScenario, isSpogomiCachanDemoEvent, SPOGOMI_CACHAN_DEMO_NOTICE, SPOGOMI_CACHAN_DEMO_ROUTE } from "./demo-scenario";

describe("SPOGOMI Cachan demo presentation contract", () => {
  it("recognizes only the explicitly marked synthetic scenario", () => {
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL" })).toBe(true);
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan, démonstration CleanMyMap" })).toBe(false);
    expect(isSpogomiCachanDemoEvent({ name: "SPOGOMI Cachan officielle" })).toBe(false);
  });

  it("keeps the exact non-official disclosure available to every surface", () => {
    expect(SPOGOMI_CACHAN_DEMO_NOTICE).toBe("Démonstration fictive, données synthétiques, règlement non officiel");
  });

  it("reads the canonical mixed fixture without turning it into a persisted event", () => {
    const scenario = getSpogomiCachanDemoScenario();
    expect(SPOGOMI_CACHAN_DEMO_ROUTE).toBe("/spogomi/demonstration/cachan");
    expect(scenario.mode).toBe("mixed");
    expect(scenario.official).toBe(false);
    expect(scenario.divisions.map((division) => division.division_type)).toEqual(["world_cup", "casual"]);
    expect(scenario.teams).toHaveLength(11);
    expect(new Set(scenario.teams.map((team) => team.division_ref))).toEqual(new Set(["DIV-WORLD-CUP", "DIV-CASUAL"]));
    expect(scenario.teams.flatMap((team) => team.place_ids)).toHaveLength(37);
  });
});
