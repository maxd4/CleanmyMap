import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./data-contract";
import { buildActionInsights } from "./insights";

describe("buildActionInsights", () => {
  it("produces quality and impact levels", () => {
    const contract = buildActionDataContract({
      id: "a1",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-04-01",
      createdAt: "2026-04-01T10:00:00.000Z",
      locationLabel: "Paris 3",
      latitude: 48.86,
      longitude: 2.35,
      wasteKg: 18,
      cigaretteButts: 200,
      volunteersCount: 6,
      durationMinutes: 120,
      actorName: "tester",
    });

    const result = buildActionInsights(
      contract,
      new Date("2026-04-02T00:00:00.000Z"),
    );
    expect(result.qualityScore).toBeGreaterThan(0);
    expect(["A", "B", "C"]).toContain(result.qualityGrade);
    expect(["faible", "moyen", "fort", "critique"]).toContain(
      result.impactLevel,
    );
  });
});
