import { describe, expect, it } from "vitest";
import {
  getAccountBadgeIconName,
  getGamificationBadgeIconName,
} from "./badge-icon";

describe("badge icon mapping", () => {
  it("maps gamification labels to non-text pictograms", () => {
    expect(getGamificationBadgeIconName("Contributeur regulier")).toBe("zap");
    expect(getGamificationBadgeIconName("Esprit d'Équipe")).toBe("users");
    expect(getGamificationBadgeIconName("Sentinelle Exemplaire")).toBe(
      "badge-check",
    );
  });

  it("maps account badge keys to pictograms", () => {
    expect(getAccountBadgeIconName("role_admin")).toBe("crown");
    expect(getAccountBadgeIconName("impact_100kg")).toBe("droplets");
    expect(getAccountBadgeIconName("unknown_key")).toBe("award");
  });
});
