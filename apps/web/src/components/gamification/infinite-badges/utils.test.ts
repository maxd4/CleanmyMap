import { describe, expect, it } from "vitest";
import { computeActionCreationRank, computePlacesRank } from "./utils";

describe("infinite badges ranks", () => {
  it("keeps the explorer family as the base reference", () => {
    expect(computePlacesRank(0).title).toBe("Promeneur Local");
    expect(computePlacesRank(10).title).toBe("Maître des Cartes");
  });

  it("uses the canonical gem scale for actions created", () => {
    expect(computeActionCreationRank(0).title).toBe("Observateur");
    expect(computeActionCreationRank(1).title).toBe("Quartz");
    expect(computeActionCreationRank(2).title).toBe("Quartz");
    expect(computeActionCreationRank(3).title).toBe("Topaze");
    expect(computeActionCreationRank(8).title).toBe("Rubis");
    expect(computeActionCreationRank(20).title).toBe("Opale");
    expect(computeActionCreationRank(25).title).toBe("Pilier II");
    expect(computeActionCreationRank(30).title).toBe("Pilier III");
  });
});
