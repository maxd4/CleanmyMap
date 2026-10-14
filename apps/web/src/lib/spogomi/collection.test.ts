import { describe, expect, it } from "vitest";
import { getSpogomiBadgePresentation } from "./collection";

describe("SPOGOMI collection badge presentation", () => {
  it("uses the canonical label and a safe fallback for unknown badges", () => {
    expect(getSpogomiBadgePresentation("spogomi_collector")).toMatchObject({
      family: "collector",
      icon: "collector",
      tone: "emerald",
    });
    expect(getSpogomiBadgePresentation("unknown-badge")).toMatchObject({
      label: "unknown-badge",
      family: "other",
      icon: "badge",
    });
  });
});
