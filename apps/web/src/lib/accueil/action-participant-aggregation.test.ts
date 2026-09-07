import { describe, expect, it } from "vitest";
import {
  aggregatePublicActionMetrics,
  buildPublicLandingActionMetricsFromAggregate,
  getSpontaneousActionCategory,
  type ActionAggregationAction,
} from "./action-participant-aggregation";

function action(
  organizerType: ActionAggregationAction["metadata"]["organizerType"],
  volunteersCount: number,
  durationMinutes: number,
): ActionAggregationAction {
  return {
    metadata: { organizerType, volunteersCount, durationMinutes },
  };
}

describe("action participant aggregation", () => {
  it("sums participants and action duration without multiplying by participants", () => {
    const result = aggregatePublicActionMetrics([
      action("spontaneous", 1, 10),
      action("spontaneous", 2, 20),
      action("spontaneous", 3, 30),
      action("spontaneous", 4, 40),
      action("spontaneous", 5, 50),
      action("spontaneous", 6, 60),
      action("spontaneous", 7, 70),
    ]);

    expect(result.participantsTotal).toBe(28);
    expect(result.totalDurationMinutes).toBe(280);
    expect(result.totalDurationHours).toBe(280 / 60);
    expect(result.actionDistribution).toEqual([
      { key: "spontaneous:1", category: "Solo", count: 1 },
      { key: "spontaneous:2", category: "Duo", count: 1 },
      { key: "spontaneous:3", category: "Trio", count: 1 },
      { key: "spontaneous:4", category: "Quatuor", count: 1 },
      { key: "spontaneous:5", category: "Quintet", count: 1 },
      { key: "spontaneous:6", category: "Sextet", count: 1 },
      { key: "spontaneous:7", category: "Septet", count: 1 },
    ]);
    expect(result.actionDistribution.reduce((sum, entry) => sum + entry.count, 0)).toBe(7);
    expect(result.actionDistribution.some((entry) => entry.count === 0)).toBe(false);
    expect(getSpontaneousActionCategory(13)).toEqual({
      key: "spontaneous:13",
      category: "Groupe de 13 participants",
    });
  });

  it("keeps each structured organizer type distinct and never infers from a name", () => {
    const result = aggregatePublicActionMetrics([
      action("company", 5, 10),
      action("association", 2, 20),
      action("student_association", 3, 30),
      action("collective", 4, 40),
      action("other", 6, 50),
      action(null, 8, 60),
    ]);

    expect(result.actionDistribution).toEqual([
      { key: "association", category: "Association", count: 1 },
      { key: "student_association", category: "Association étudiante", count: 1 },
      { key: "other", category: "Autres", count: 2 },
      { key: "collective", category: "Collectif", count: 1 },
      { key: "company", category: "Entreprise", count: 1 },
    ]);
    expect(result.actionDistribution.reduce((sum, entry) => sum + entry.count, 0)).toBe(6);
    expect(result.classificationWarnings).toEqual([
      { code: "missing_organizer_type", count: 1 },
    ]);
  });

  it("classifies legacy and incoherent types as Autres with an administrative warning", () => {
    const result = aggregatePublicActionMetrics([
      action(undefined, 0, 5),
      action("legacy" as ActionAggregationAction["metadata"]["organizerType"], 2, 10),
      action("spontaneous", 0, 15),
    ]);

    expect(result.actionDistribution).toEqual([
      { key: "other", category: "Autres", count: 3 },
    ]);
    expect(result.classificationWarnings).toEqual([
      { code: "invalid_organizer_type", count: 1 },
      { code: "invalid_spontaneous_participant_count", count: 1 },
      { code: "missing_organizer_type", count: 1 },
    ]);
  });

  it("normalizes the structured RPC payload and removes zero categories", () => {
    expect(
      buildPublicLandingActionMetricsFromAggregate({
        volunteers: "12",
        total_duration_minutes: "90",
        action_distribution: [
          { key: "other", category: "Autres", count: 0 },
          { key: "spontaneous:2", category: "Duo", count: 2 },
        ],
        classification_warnings: [{ code: "missing_organizer_type", count: 1 }],
      }),
    ).toEqual({
      participantsTotal: 12,
      totalDurationMinutes: 90,
      totalDurationHours: 1.5,
      actionDistribution: [
        { key: "spontaneous:2", category: "Duo", count: 2 },
      ],
      classificationWarnings: [{ code: "missing_organizer_type", count: 1 }],
      impactTerrain: {
        wasteKg: 0,
        wasteBagsEquivalent: 0,
        wasteMechanicalBicyclesEquivalent: 0,
        buttsTotal: 0,
        qualifiedButtsTotal: 0,
        unqualifiedButtsTotal: 0,
        buttsByCondition: [],
        estimatedButtsWeightKg: 0,
        buttsDistanceMeters: 0,
      },
    });
  });
});
