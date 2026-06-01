import { describe, expect, it } from "vitest";
import { computeActionCreationRank, computePlacesRank } from "./utils";

describe("infinite badges ranks", () => {
  it("keeps the explorer family as the base reference", () => {
    expect(computePlacesRank(0).title).toBe("Promeneur Local");
    expect(computePlacesRank(10).title).toBe("Maître des Cartes");
  });

  it("reuses exploration grades for actions created and continues with Pilier tiers", () => {
    expect(computeActionCreationRank(0).title).toBe("Observateur");
    expect(computeActionCreationRank(1).title).toBe("Promeneur Local");
    expect(computeActionCreationRank(12).title).toBe("Maître des Cartes");
    expect(computeActionCreationRank(13).title).toBe("Pilier II");
    expect(computeActionCreationRank(14).title).toBe("Pilier III");
  });
});
