import { describe, expect, it } from "vitest";
import { buildGeometryContributionFacts } from "./gamification-facts-loader";

describe("cartography progression facts", () => {
  it("counts one accepted contribution per user and distinct action", () => {
    const facts = buildGeometryContributionFacts([
      { action_id: "action-1", observed_at: "2026-10-01T10:00:00Z" },
      { action_id: "action-1", observed_at: "2026-10-01T11:00:00Z" },
      { action_id: "action-1", observed_at: "2026-10-01T12:00:00Z" },
      { action_id: "action-2", observed_at: "2026-10-02T10:00:00Z" },
    ]);

    expect(facts).toHaveLength(2);
    expect(facts.map((fact) => fact.sourceId)).toEqual(["action-1", "action-2"]);
    expect(facts.every((fact) => fact.mechanicId === "cartography")).toBe(true);
    expect(facts.every((fact) => fact.eventType === "verified_geometry_contribution")).toBe(true);
  });

  it("does not create a file, retry, or kilometer-based unit", () => {
    const [fact] = buildGeometryContributionFacts([
      { action_id: "action-1", observed_at: "2026-10-01T10:00:00Z" },
      { action_id: "action-1", observed_at: "2026-10-01T11:00:00Z" },
    ]);

    expect(fact?.xpAwarded).toBe(1);
    expect(fact?.metadata).toMatchObject({ noXpPerFile: true, noXpPerKilometer: true });
  });
});
