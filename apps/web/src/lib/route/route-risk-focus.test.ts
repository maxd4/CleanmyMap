import { describe, expect, it } from "vitest";
import { resolveEffectiveRiskFocus } from "./route-risk-focus";

describe("resolveEffectiveRiskFocus", () => {
  it("defaults a request without preference or legacy focus to all", () => {
    expect(resolveEffectiveRiskFocus({})).toBe("all");
    expect(resolveEffectiveRiskFocus({ pickupPreference: "balanced" })).toBe("all");
  });

  it("preserves an explicit legacy focus for a balanced preference", () => {
    expect(
      resolveEffectiveRiskFocus({
        pickupPreference: "balanced",
        riskFocus: "waste",
      }),
    ).toBe("waste");
  });

  it("gives an explicit waste preference priority over the legacy focus", () => {
    expect(
      resolveEffectiveRiskFocus({
        pickupPreference: "waste",
        riskFocus: "cigaretteButts",
      }),
    ).toBe("waste");
  });

  it("maps cigarette-butts preference to the cigarette branch", () => {
    expect(resolveEffectiveRiskFocus({ pickupPreference: "cigarette_butts" })).toBe(
      "cigaretteButts",
    );
    expect(
      resolveEffectiveRiskFocus({
        pickupPreference: "cigarette_butts",
        riskFocus: "waste",
      }),
    ).toBe("cigaretteButts");
  });
});
