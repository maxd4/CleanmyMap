import { describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import type { ActionRow } from "@/types/database";
import {
  assessSchoolActionRecognitions,
  buildSchoolActionAttestation,
  isConfirmedSchoolAction,
  isEligibleForSchoolActionRecognition,
} from "./school-action-recognition";
import { BADGE_DEFINITIONS, PERSONAL_BADGE_DEFINITIONS } from "./badge-catalog";

function buildAction(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-10-29T10:00:00.000Z",
    created_by_clerk_id: "organizer-1",
    organizer_type: "association",
    organizer_id: "org-1",
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
      volunteerParticipation: {
        childrenCount: 3,
        adultCount: 1,
        retiredCount: 0,
        participantsCount: 4,
        effectiveVolunteerUnits: 2.5,
        effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
      },
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

  it("uses the final composition instead of the preparation forecast", () => {
    const action = buildAction({
      volunteers_count: 26,
      preparation_data: {
        volunteerParticipation: {
          childrenCount: 20,
          adultCount: 8,
          retiredCount: 0,
          participantsCount: 28,
          effectiveVolunteerUnits: 18,
          effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
        },
      },
      notes: appendActionMetadataToNotes("Bilan final", {
        volunteerParticipation: {
          childrenCount: 18,
          adultCount: 8,
          retiredCount: 0,
          participantsCount: 26,
          effectiveVolunteerUnits: 16,
          effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
        },
      }),
    });

    const attestation = buildSchoolActionAttestation({ action, canonicalOrganizerIds: ["organizer-1"] });
    expect(attestation.action.totalParticipants).toBe(26);
    expect(attestation.action.children).toBe(18);
    expect(attestation.action.adultSupervisors).toBe(8);
  });

  it("keeps participation unknown when only the forecast is present", () => {
    const action = buildAction({
      notes: appendActionMetadataToNotes("Bilan sans composition finale", {
        volunteerParticipation: null,
      }),
    });

    const attestation = buildSchoolActionAttestation({ action, canonicalOrganizerIds: ["organizer-1"] });
    expect(attestation.action.totalParticipants).toBeNull();
    expect(attestation.action.children).toBeNull();
    expect(attestation.action.adultSupervisors).toBeNull();
    expect(attestation.limits.join(" ")).toContain("incomplète");
  });

  it("does not impute missing final categories from the total", () => {
    const action = buildAction({
      notes: appendActionMetadataToNotes("Bilan partiel", {
        volunteerParticipation: {
          childrenCount: null,
          adultCount: 4,
          retiredCount: null,
          participantsCount: 4,
          effectiveVolunteerUnits: null,
          effectiveVolunteerUnitsFormulaVersion: null,
        },
      }),
    });

    const attestation = buildSchoolActionAttestation({ action, canonicalOrganizerIds: ["organizer-1"] });
    expect(attestation.action.totalParticipants).toBeNull();
    expect(attestation.action.children).toBeNull();
    expect(attestation.action.adultSupervisors).toBeNull();
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
      buildAction({ status: "cancelled" }),
      buildAction({ published_at: null }),
      buildAction({ moderation_visibility: "hidden" }),
      buildAction({ access_mode: "invite_link" }),
      buildAction({ action_phase: "pre_action" }),
      buildAction({ school_context_confirmed: false, school_context_confirmed_by_clerk_id: null }),
      buildAction({ school_context_confirmed_by_clerk_id: "unrelated-user" }),
      buildAction({ action_context: "citizen", school_context_confirmed: false }),
    ]) {
      expect([...mapAssessments(action).values()].every((assessment) => !assessment.qualified)).toBe(true);
      expect(isEligibleForSchoolActionRecognition(action, ["organizer-1"])).toBe(false);
    }
  });

  it("reactivates the same descriptive recognitions when the public action becomes eligible again", () => {
    const rejected = buildAction({ status: "rejected" });
    expect(mapAssessments(rejected).get("school_first_mission")?.qualified).toBe(false);
    expect(mapAssessments(buildAction()).get("school_first_mission")?.qualified).toBe(true);
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
    expect(attestation.verifiedOrganizer).toBe(false);
    expect(attestation.organizerPresence).toBe("structured");
    expect(JSON.stringify(attestation)).not.toMatch(/studentName|studentAge|quizResult|gradeValue|health/i);
  });

  it("distinguishes metadata-only notes from free observations", () => {
    const metadataOnly = buildAction({
      notes: appendActionMetadataToNotes(undefined, {
        volunteerParticipation: {
          childrenCount: 3,
          adultCount: 1,
          retiredCount: 0,
          participantsCount: 4,
          effectiveVolunteerUnits: 2.5,
          effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
        },
      }),
    });
    const withObservation = buildAction({
      notes: appendActionMetadataToNotes("Les enfants ont trié les flux", {
        volunteerParticipation: {
          childrenCount: 3,
          adultCount: 1,
          retiredCount: 0,
          participantsCount: 4,
          effectiveVolunteerUnits: 2.5,
          effectiveVolunteerUnitsFormulaVersion: "effective-volunteer-units-v1",
        },
      }),
    });

    expect(buildSchoolActionAttestation({ action: metadataOnly, canonicalOrganizerIds: ["organizer-1"] }).measuredResults.observationsProvided).toBe(false);
    expect(buildSchoolActionAttestation({ action: withObservation, canonicalOrganizerIds: ["organizer-1"] }).measuredResults.observationsProvided).toBe(true);
  });

  it("preserves explicit zero measurements without inventing observations", () => {
    const action = buildAction({
      waste_kg: 0,
      notes: appendActionMetadataToNotes(undefined, {
        cigaretteButtsMeasurements: {
          cigaretteButtsCount: 0,
          cigaretteButtsMassKg: null,
          cigaretteButtsVolumeLiters: null,
          cigaretteButtsCondition: "propre",
          cigaretteButtsConversionFormulaVersion: null,
          cigaretteButtsCountProvenance: "counted",
          cigaretteButtsMassProvenance: "unknown",
          cigaretteButtsVolumeProvenance: "unknown",
        },
      }),
    });

    const attestation = buildSchoolActionAttestation({ action, canonicalOrganizerIds: ["organizer-1"] });
    expect(attestation.measuredResults.wasteKg).toBe(0);
    expect(attestation.measuredResults.cigaretteButtsCount).toBe(0);
    expect(attestation.measuredResults.observationsProvided).toBe(false);
  });

  it("keeps action-scoped recognitions out of personal badge catalogs", () => {
    expect(BADGE_DEFINITIONS.some((definition) => definition.visibility === "action_collective")).toBe(true);
    expect(PERSONAL_BADGE_DEFINITIONS.some((definition) => definition.visibility === "action_collective")).toBe(false);
  });
});
