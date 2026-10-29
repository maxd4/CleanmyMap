import { describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import type { ActionRow } from "@/types/database";
import {
  assessSchoolActionRecognitions,
  buildSchoolActionAttestation,
  isConfirmedSchoolAction,
} from "./school-action-recognition";
import { BADGE_DEFINITIONS, PERSONAL_BADGE_DEFINITIONS } from "./badge-catalog";

function buildAction(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-10-29T10:00:00.000Z",
    created_by_clerk_id: "organizer-1",
    actor_name: null,
    action_date: "2026-10-29",
    location_label: "Cour de test",
    latitude: 48.85,
    longitude: 2.35,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: 3,
    cigarette_butts: null,
    volunteers_count: 4,
    duration_minutes: 60,
    notes: appendActionMetadataToNotes("Observation collective", {
      wasteMeasurementMethod: "balance_suspendue",
      wasteBreakdown: { recyclablesKg: 1, glassKg: 1, householdWasteKg: 1 },
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 12,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsConversionFormulaVersion: null,
        cigaretteButtsCountProvenance: "counted",
        cigaretteButtsMassProvenance: "unknown",
        cigaretteButtsVolumeProvenance: "unknown",
      },
    }),
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {
      volunteerParticipation: {
        childrenCount: 3,
        adultCount: 1,
        retiredCount: 0,
        participantsCount: 4,
        effectiveVolunteerUnits: 2.5,
        effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
      },
    },
    published_at: "2026-10-29T12:00:00.000Z",
    moderation_visibility: "visible",
    access_mode: "public",
    action_context: "school",
    action_context_source: "explicit",
    school_context_confirmed: true,
    school_context_confirmed_at: "2026-10-29T11:00:00.000Z",
    school_context_confirmed_by_clerk_id: "organizer-1",
    ...overrides,
  };
}

function mapAssessments(action: ActionRow = buildAction()) {
  return new Map(
    assessSchoolActionRecognitions({
      action,
      canonicalOrganizerIds: ["organizer-1"],
    }).map((assessment) => [assessment.id, assessment]),
  );
}

describe("school action collective recognition", () => {
  it("requires an explicit authorized confirmation, not automatic school detection", () => {
    const automatic = buildAction({
      action_context_source: "automatic_children_ratio",
      school_context_confirmed: false,
      school_context_confirmed_at: null,
      school_context_confirmed_by_clerk_id: null,
    });

    expect(isConfirmedSchoolAction(automatic, ["organizer-1"])).toBe(false);
    expect(mapAssessments(automatic).get("school_first_mission")?.qualified).toBe(false);
  });

  it("qualifies all three milestones only from the bounded collective facts", () => {
    const assessments = mapAssessments();

    expect([...assessments.values()].every((assessment) => assessment.qualified)).toBe(true);
    expect([...assessments.values()].every((assessment) => assessment.xpAwarded === 0)).toBe(true);
  });

  it("does not turn an absent measurement into a field debrief", () => {
    const action = buildAction({
      waste_kg: null,
      notes: appendActionMetadataToNotes("Sans mesure", {
        wasteMeasurementMethod: "inconnue",
        wasteBreakdown: { recyclablesKg: 1, glassKg: 1 },
      }),
    });

    expect(mapAssessments(action).get("school_first_mission")?.qualified).toBe(true);
    expect(mapAssessments(action).get("school_documented_sorting")?.qualified).toBe(true);
    expect(mapAssessments(action).get("school_field_debrief")?.qualified).toBe(false);
  });

  it("does not qualify documented sorting from one category or zeros", () => {
    const action = buildAction({
      notes: appendActionMetadataToNotes("Tri incomplet", {
        wasteMeasurementMethod: "balance_suspendue",
        wasteBreakdown: { recyclablesKg: 0, glassKg: 0 },
      }),
    });

    expect(mapAssessments(action).get("school_documented_sorting")?.qualified).toBe(false);
  });

  it("invalidates every recognition after rejection or reclassification", () => {
    for (const action of [
      buildAction({ status: "rejected" }),
      buildAction({ action_context: "citizen", school_context_confirmed: false }),
    ]) {
      expect([...mapAssessments(action).values()].every((assessment) => !assessment.qualified)).toBe(true);
    }
  });

  it("builds a bounded attestation without student PII or inferred facts", () => {
    const attestation = buildSchoolActionAttestation({
      action: buildAction({ waste_kg: null }),
      canonicalOrganizerIds: ["organizer-1"],
    });

    expect(attestation.status).toBe("eligible");
    expect(attestation.action.totalParticipants).toBe(4);
    expect(attestation.measuredResults.wasteKg).toBeNull();
    expect(attestation.limits.join(" ")).toContain("inconnue");
    expect(JSON.stringify(attestation)).not.toMatch(/studentName|studentAge|quizResult|gradeValue|health/i);
  });

  it("keeps action-scoped recognitions out of personal badge catalogs", () => {
    expect(BADGE_DEFINITIONS.some((definition) => definition.visibility === "action_collective")).toBe(true);
    expect(PERSONAL_BADGE_DEFINITIONS.some((definition) => definition.visibility === "action_collective")).toBe(false);
  });
});
