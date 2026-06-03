import { describe, expect, it } from "vitest";
import { getGamificationBadgeState } from "./badge-ui";

describe("gamification badge ui helpers", () => {
  it("maps zero progress to vide", () => {
    expect(getGamificationBadgeState(0, 3)).toBe("vide");
  });

  it("maps a threshold hit to debloque", () => {
    expect(getGamificationBadgeState(3, 3)).toBe("debloque");
  });

  it("maps in-between progress to actif", () => {
    expect(getGamificationBadgeState(4, 3)).toBe("actif");
  });
});
