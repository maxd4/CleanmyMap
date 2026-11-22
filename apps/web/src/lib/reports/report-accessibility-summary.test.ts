import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
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
    expect(buildReportAccessibilitySummary([
      action("1", { accessibilityStatus: "conditions_reported", accessibility: "Chemin latéral" }),
      action("2", { accessibilityStatus: "obstacles_identified", accessibility: "Marche" }),
      action("3", { accessibilityStatus: "to_confirm" }),
      action("4", {}),
      action("5", {
        accessibilityPausePlan: "Pause possible",
        accessibilityAlternativeMissions: ["Tri adapté"],
        accessibilityAlternativeRouteVersionId: "route-1",
        accessibilityObservedMeasures: [
          { key: "pause-plan", label: "Pauses", evidenceKind: "organizer_observation", observedAt: "2026-11-21" },
          { key: "alternative-mission-1", label: "Tri adapté", evidenceKind: "participant_feedback", observedAt: "2026-11-21" },
        ],
      }),
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
});
