import { describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";
import type { ActionRow } from "./progression-types";
import {
  actionMilestoneSourceId,
  assessActionMilestones,
} from "./action-milestones";

const formalitiesWorkflow = {
  schemaVersion: "action-formalities-workflow-v1",
  contentVersion: "qualification-v1",
  trace: {
    qualifiedAt: "2026-09-20T10:00:00.000Z",
    rulesetVersion: "rules-v1",
    officialSourceIds: [],
    officialSources: [],
    verifiedOn: "2026-09-20",
    actionDependencyFingerprint: "fnv1a-test",
    determiningFacts: {} as never,
    formalities: [
      {
        id: "formality-1",
        requirementStatus: "required",
        procedureKind: "city_aot",
        sourceId: "source-1",
      },
    ],
  },
  progress: [
    {
      formalityId: "formality-1",
      userStatus: "sent",
      contentVersion: "qualification-v1",
      statusChangedAt: "2026-09-20T10:00:00.000Z",
      proof: null,
      active: true,
      validForQualification: true,
      invalidatedAt: null,
    },
  ],
} as ActionFormalitiesWorkflowState;

function buildAction(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "action-1",
    created_at: "2026-09-20T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-09-20",
    location_label: "Parc de test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 2,
    cigarette_butts: 12,
    volunteers_count: 2,
    duration_minutes: 60,
    status: "approved",
    action_phase: "post_action_complete",
    published_at: "2026-09-18T10:00:00.000Z",
    geometry_source: "gpx_import",
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: JSON.stringify({
      type: "LineString",
      coordinates: [[2.35, 48.85], [2.351, 48.851]],
    }),
    preparation_data: {
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1.2,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
      formalitiesWorkflow,
    },
    notes: appendActionMetadataToNotes("Action préparée", {
      groupJoinEnabled: true,
      wasteMeasurementMethod: "balance_suspendue",
      wasteBreakdown: {
        recyclablesKg: 1,
        glassKg: 0.5,
        householdWasteKg: 0.5,
      },
    }),
    ...overrides,
  };
}

function assessmentMap(action: ActionRow = buildAction(), qualityGrade: "A" | "B" | "C" | null = "A") {
  return new Map(
    assessActionMilestones({
      action,
      userId: "user-1",
      canonicalOrganizerIds: ["user-1"],
      confirmedParticipantUserIds: ["user-1", "user-2"],
      validationQualityGrade: qualityGrade,
    }).map((assessment) => [assessment.id, assessment]),
  );
}

describe("CURRENT action one-shot milestones", () => {
  it("qualifies every positive fact with the exact XP split", () => {
    const assessments = assessmentMap();

    expect([...assessments.values()].every((assessment) => assessment.qualified)).toBe(true);
    expect(assessments.get("boucle_bouclee")?.xpAwarded).toBe(1);
    expect(assessments.get("mobilisateur")?.xpAwarded).toBe(1);
    expect(assessments.get("donnee_exemplaire")?.xpAwarded).toBe(1);
    expect(assessments.get("parcours_documente")?.xpAwarded).toBe(0);
    expect(assessments.get("mesure_tracable")?.xpAwarded).toBe(0);
    expect(assessments.get("tri_documente")?.xpAwarded).toBe(0);
    expect(assessments.get("formalites_preparees")?.xpAwarded).toBe(0);
  });

  it("rejects partial facts and never treats a direct complete form as a loop", () => {
    expect(assessmentMap(buildAction({ published_at: null })).get("boucle_bouclee")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ preparation_data: { preparationState: "action_en_cours" }, published_at: null })).get("boucle_bouclee")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ published_at: null })).get("mobilisateur")?.qualified).toBe(false);
    expect(assessmentMap(buildAction(), "B").get("donnee_exemplaire")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ geometry_source: "estimated_route" })).get("parcours_documente")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ notes: appendActionMetadataToNotes("Action", { groupJoinEnabled: true }) })).get("mesure_tracable")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ notes: appendActionMetadataToNotes("Action", { wasteMeasurementMethod: "balance_suspendue", wasteBreakdown: { recyclablesKg: 1 } }) })).get("tri_documente")?.qualified).toBe(false);
    expect(assessmentMap(buildAction({ preparation_data: { preparationState: "action_en_cours" } })).get("formalites_preparees")?.qualified).toBe(false);
    expect([...assessmentMap(buildAction({ status: "rejected" })).values()].every((assessment) => !assessment.qualified)).toBe(true);
    expect([...assessmentMap(buildAction({ action_phase: "post_action_draft" })).values()].every((assessment) => !assessment.qualified)).toBe(true);
  });

  it("does not qualify an action when no formality is required", () => {
    const workflowWithoutRequiredFormality = {
      ...formalitiesWorkflow,
      trace: {
        ...formalitiesWorkflow.trace,
        formalities: formalitiesWorkflow.trace.formalities.map((formality) => ({
          ...formality,
          requirementStatus: "recommended" as const,
        })),
      },
    };

    expect(
      assessmentMap(
        buildAction({
          preparation_data: {
            formalitiesWorkflow: workflowWithoutRequiredFormality,
          },
        }),
      ).get("formalites_preparees")?.qualified,
    ).toBe(false);
  });

  it("requires a confirmed person distinct from the organizer and keeps one-shot identity stable", () => {
    const noOtherParticipant = assessActionMilestones({
      action: buildAction(),
      userId: "user-1",
      canonicalOrganizerIds: ["user-1"],
      confirmedParticipantUserIds: ["user-1"],
      validationQualityGrade: "A",
    });

    expect(noOtherParticipant.find((assessment) => assessment.id === "mobilisateur")?.qualified).toBe(false);
    expect(actionMilestoneSourceId("mobilisateur")).toBe(actionMilestoneSourceId("mobilisateur"));
    expect(actionMilestoneSourceId("mobilisateur")).not.toBe(actionMilestoneSourceId("boucle_bouclee"));
  });
});
