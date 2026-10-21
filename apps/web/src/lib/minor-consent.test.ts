import { describe, expect, it } from "vitest";
import { isOptionalConsentTreatmentAllowed, parseAgeBand } from "./minor-consent";

describe("minor consent eligibility", () => {
  it("allows optional treatments at 15 or over", () => {
    expect(isOptionalConsentTreatmentAllowed({ ageBand: "15_or_over" })).toBe(true);
  });

  it("denies under-15 users unless a verified joint parental consent exists", () => {
    expect(isOptionalConsentTreatmentAllowed({ ageBand: "under_15" })).toBe(false);
    expect(isOptionalConsentTreatmentAllowed({ ageBand: "under_15", parentalConsentVerified: true })).toBe(true);
  });

  it("denies unknown age status without blocking public access", () => {
    expect(isOptionalConsentTreatmentAllowed({ ageBand: "unknown" })).toBe(false);
  });

  it("normalizes malformed age declarations to unknown", () => {
    expect(parseAgeBand("18")).toBe("unknown");
    expect(parseAgeBand(null)).toBe("unknown");
  });
});
