import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildDeclaredAccessibilityObservationMeasures } from "@/lib/actions/accessibility-observations";
import { buildReportAccessibilitySummary } from "./report-accessibility-summary";

function action(id: string, preparationData: Parameters<typeof buildActionDataContract>[0]["preparationData"]) {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "actions",
    createdByClerkId: "organizer",
    publishedAt: "2026-11-21T10:00:00.000Z",
    observedAt: "2026-11-21",
    createdAt: "2026-11-20T10:00:00.000Z",
    locationLabel: "Parc",
    latitude: 48,
    longitude: 2,
    wasteKg: null,
    cigaretteButts: null,
    volunteersCount: null,
    durationMinutes: 0,
    actionPhase: "pre_action",
    preparationData,
  });
}

describe("report accessibility summary", () => {
  it("counts only public declared status and keeps unevaluated distinct from zero information", () => {
    const preparation = {
      accessibilityPausePlan: "Pause possible",
      accessibilityAlternativeMissions: ["Tri adapté"],
      accessibilityAlternativeRouteVersionId: "route-1",
    };
    const observations = buildDeclaredAccessibilityObservationMeasures(preparation).map((measure, index) => ({
      ...measure,
      evidenceKind: index === 0 ? "organizer_observation" as const : "participant_feedback" as const,
      observedAt: new Date().toISOString().slice(0, 10),
    }));
    expect(buildReportAccessibilitySummary([
      action("1", { accessibilityStatus: "conditions_reported", accessibility: "Chemin latéral" }),
      action("2", { accessibilityStatus: "obstacles_identified", accessibility: "Marche" }),
      action("3", { accessibilityStatus: "to_confirm" }),
      action("4", {}),
      action("5", { ...preparation, accessibilityObservedMeasures: observations }),
    ])).toEqual({
      actionCount: 5,
      informationDeclared: 3,
      conditionsReported: 1,
      obstaclesIdentified: 1,
      toConfirm: 1,
      notEvaluated: 2,
      declaredPlanMeasures: 2,
      observedMeasures: 2,
      observedByOrganizer: 1,
      observedByParticipantFeedback: 1,
    });
  });

  it("does not count attestations whose plan definition has changed", () => {
    const original = {
      accessibilityAlternativeMissions: ["Tri adapté", "Compostage"],
    };
    const oldObservations = buildDeclaredAccessibilityObservationMeasures(original).map((measure) => ({
      ...measure,
      evidenceKind: "organizer_observation" as const,
      observedAt: new Date().toISOString().slice(0, 10),
    }));
    const changed = { accessibilityAlternativeMissions: ["Compostage", "Tri manuel"] };
    const summary = buildReportAccessibilitySummary([
      action("changed", { ...changed, accessibilityObservedMeasures: oldObservations }),
    ]);
    expect(summary.observedMeasures).toBe(1);
    expect(summary.observedByOrganizer).toBe(1);
  });
});
