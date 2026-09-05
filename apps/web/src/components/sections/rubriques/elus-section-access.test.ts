import { describe, expect, it } from "vitest";
import { isPromotionEligibleEluAccessDenied } from "./elus-section-access";

describe("ElusSection access discovery", () => {
  it("offers the evolution route only for an authenticated eligible 403", () => {
    expect(
      isPromotionEligibleEluAccessDenied({ status: 403 }, true, "benevole"),
    ).toBe(true);
    expect(
      isPromotionEligibleEluAccessDenied({ status: 403 }, true, "admin"),
    ).toBe(false);
  });

  it("keeps 401 and unrelated errors out of the promotion CTA", () => {
    expect(
      isPromotionEligibleEluAccessDenied({ status: 401 }, true, "benevole"),
    ).toBe(false);
    expect(
      isPromotionEligibleEluAccessDenied(new Error("temporary"), true, "benevole"),
    ).toBe(false);
    expect(
      isPromotionEligibleEluAccessDenied({ status: 403 }, false, "benevole"),
    ).toBe(false);
  });
});
