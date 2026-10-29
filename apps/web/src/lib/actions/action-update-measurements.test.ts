import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import {
  buildActionUpdateMeasurements,
  type ActionUpdateMeasurements,
} from "./action-update-measurements";
import { extractActionMetadataFromNotes } from "./metadata";
import { buildActionUpdateNotes } from "./action-update-notes";
import { buildPersistedNotes } from "./store-notes";
import { normalizeCigaretteButtsMeasurements } from "@/lib/waste/cigarette-butts";

function buildCurrent(notes: string | null): ActionRow {
  return {
    id: "action-42",
    created_at: "2026-09-15T09:00:00.000Z",
    updated_at: "2026-09-15T09:00:00.000Z",
    created_by_clerk_id: "creator-1",
    actor_name: "Test",
    organizer_type: null,
    action_date: "2026-09-20",
    location_label: "Paris",
    department_code: null,
    department_name: null,
    latitude: null,
    longitude: null,
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: null,
    cigarette_butts: 1_750,
    volunteers_count: 1,
    duration_minutes: 30,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    notes,
    status: "approved",
    published_at: null,
    action_phase: "post_action_complete",
    preparation_data: null,
  } as unknown as ActionRow;
}

function buildMeasurementsMetadata(source: "mass" | "unknown") {
  const cigaretteButtsMeasurements = source === "mass"
    ? normalizeCigaretteButtsMeasurements({
        cigaretteButtsMassKg: 1,
        cigaretteButtsCondition: "humide",
        deriveMissingFromMassOrCount: true,
      })
    : normalizeCigaretteButtsMeasurements({
        cigaretteButtsCount: 1_700,
        cigaretteButtsMassKg: 1,
        cigaretteButtsCondition: "humide",
        cigaretteButtsCountProvenance: "unknown",
        cigaretteButtsMassProvenance: "unknown",
      });
  const notes = buildPersistedNotes({
    notes: "Action terrain",
    cigaretteButtsMeasurements,
  }, {
    resolvedCigaretteButtsMeasurements: cigaretteButtsMeasurements,
  });
  return { notes, metadata: extractActionMetadataFromNotes(notes) };
}

function updateMeasurements(
  current: ActionRow,
  body: Record<string, unknown>,
): ActionUpdateMeasurements {
  return buildActionUpdateMeasurements({
    current,
    body: body as never,
    currentMetadata: extractActionMetadataFromNotes(current.notes),
  });
}

describe("buildActionUpdateMeasurements cigarette-butt provenance", () => {
  it("recalculates only the derived count after a hydrated mass-source condition change", () => {
    const { notes } = buildMeasurementsMetadata("mass");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_750,
        cigaretteButtsMassKg: 1,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "mass",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 2_500,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "propre",
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
    });
    expect(result.updateData).toEqual({ cigarette_butts: 2_500 });
  });

  it("preserves an independent historical pair when its source is unknown", () => {
    const { notes } = buildMeasurementsMetadata("unknown");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_700,
        cigaretteButtsMassKg: 1,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "unknown",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("does not requalify an ambiguous pair when no butt field is submitted", () => {
    const { notes } = buildMeasurementsMetadata("unknown");

    const result = updateMeasurements(buildCurrent(notes), {
      notes: "Correction indépendante",
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
    expect(result.hasButtsMeasurementUpdate).toBe(false);
  });

  it("does not trust a forged source hint when historical values are unchanged", () => {
    const { notes } = buildMeasurementsMetadata("unknown");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_700,
        cigaretteButtsMassKg: 1,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "count",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("persists the preserved provenance through the update notes boundary", () => {
    const { notes } = buildMeasurementsMetadata("unknown");
    const currentMetadata = extractActionMetadataFromNotes(notes);
    const body = {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_700,
        cigaretteButtsMassKg: 1,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "unknown",
      },
      notes: "Action reprise",
    };
    const result = updateMeasurements(buildCurrent(notes), body);
    const nextNotes = buildActionUpdateNotes({
      body: body as never,
      currentMetadata,
      hasButtsMeasurementUpdate: result.hasButtsMeasurementUpdate,
      nextCigaretteButtsMeasurements: result.nextCigaretteButtsMeasurements,
      nextVolunteerParticipation: result.nextVolunteerParticipation,
    });

    expect(extractActionMetadataFromNotes(nextNotes).cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "unknown",
      cigaretteButtsMassProvenance: "unknown",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("keeps established independent observations when the condition changes", () => {
    const measurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCondition: "humide",
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
    });
    const notes = buildPersistedNotes({
      notes: "Action terrain",
      cigaretteButtsMeasurements: measurements,
    }, {
      resolvedCigaretteButtsMeasurements: measurements,
    });

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_700,
        cigaretteButtsMassKg: 1,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "unknown",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 1_700,
      cigaretteButtsMassKg: 1,
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsConversionFormulaVersion: null,
    });
  });

  it("lets an explicit count edit replace an ambiguous historical source", () => {
    const { notes } = buildMeasurementsMetadata("unknown");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 2_000,
        cigaretteButtsMassKg: 1.1428571428571428,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "humide",
        cigaretteButtsInputSource: "count",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 2_000,
      cigaretteButtsMassProvenance: "weight_converted",
      cigaretteButtsCountProvenance: "counted",
    });
    expect(result.nextCigaretteButtsMeasurements?.cigaretteButtsConversionFormulaVersion).toBe(
      "impact-terrain-2026-butts-mass-v1",
    );
  });

  it("lets an explicit mass edit replace an ambiguous historical source", () => {
    const { notes } = buildMeasurementsMetadata("unknown");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 1_750,
        cigaretteButtsMassKg: 1.2,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "humide",
        cigaretteButtsInputSource: "mass",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 2_100,
      cigaretteButtsMassKg: 1.2,
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
    });
  });

  it("keeps an explicit clear request as null values", () => {
    const { notes } = buildMeasurementsMetadata("mass");

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: null,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: null,
        cigaretteButtsInputSource: null,
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsConversionFormulaVersion: null,
    });
    expect(result.updateData).toEqual({ cigarette_butts: null });
  });
});
