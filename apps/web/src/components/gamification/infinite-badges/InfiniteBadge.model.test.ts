import { describe, expect, it } from "vitest";
import { buildInfiniteBadgeModel } from "./InfiniteBadge.model";

describe("InfiniteBadge view model", () => {
  it("preserves generic levels, ranks, state, thresholds and progress", () => {
    const model = buildInfiniteBadgeModel({ icon: "star", title: "Étoile", total: 15, step: 10 });

    expect(model.level).toBe(1);
    expect(model.displayTitle).toBe("Étoile");
    expect(model.displayIcon).toBe("star");
    expect(model.next).toBe(20);
    expect(model.progress).toBe(0.5);
    expect(model.state).toBe("actif");
  });

  it("uses the canonical action progression and family labels", () => {
    const model = buildInfiniteBadgeModel({ icon: "star", title: "Actions", total: 3, step: 100, family: "actions" });

    expect(model.level).toBe(3);
    expect(model.displayTitle).toBe("Topaze");
    expect(model.displayIcon).toBe("users");
    expect(model.next).toBe(5);
    expect(model.progress).toBe(0);
    expect(model.rank.grade).toBe("Topaze");
  });

  it("converts the canonical action percentage to the badge ring fraction", () => {
    const model = buildInfiniteBadgeModel({ icon: "star", title: "Actions", total: 4, step: 100, family: "actions" });

    expect(model.progress).toBe(0.5);
    expect(model.progress).toBeGreaterThanOrEqual(0);
    expect(model.progress).toBeLessThanOrEqual(1);
  });

  it("preserves place-specific rank display", () => {
    const model = buildInfiniteBadgeModel({ icon: "star", title: "Lieux", total: 50, step: 5, family: "lieux" });

    expect(model.displayTitle).toBe("Maître des Cartes");
    expect(model.displayIcon).toBe("star");
    expect(model.displayRank).toBe("Maître des Cartes");
  });
});
