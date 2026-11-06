import { describe, expect, it } from "vitest";
import type { ActionRow } from "@/types/database";
import {
  buildActionUpdateMeasurements,
  type ActionUpdateMeasurements,
} from "./action-update-measurements";
import { buildActionUpdateNotes } from "./action-update-notes";
import { extractActionMetadataFromNotes } from "./metadata";
import { buildPersistedNotes } from "./persistence/notes";
import {
  CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
  normalizeCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import { CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1 } from "@/lib/impact/impact-terrain-2026";

function buildCurrent(notes: string | null): ActionRow {
  return {
    id: "action-source-integrity",
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

function updateMeasurements(current: ActionRow, body: Record<string, unknown>): ActionUpdateMeasurements {
  return buildActionUpdateMeasurements({
    current,
    body: body as never,
    currentMetadata: extractActionMetadataFromNotes(current.notes),
  });
}

describe("persisted cigarette-butt source integrity", () => {
  it("keeps a persisted v1 volume source when an action condition changes", () => {
    const measurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 600,
      cigaretteButtsMassKg: 0.132,
      cigaretteButtsVolumeLiters: 1,
      cigaretteButtsCondition: "propre",
      cigaretteButtsCountProvenance: "volume_converted",
      cigaretteButtsMassProvenance: "weight_converted",
      cigaretteButtsVolumeProvenance: "measured",
      cigaretteButtsInputSource: "volume_l",
      cigaretteButtsConversionFormulaVersion: CIGARETTE_BUTTS_MASS_CONVERSION_VERSION_V1,
      cigaretteButtsVolumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });
    const notes = buildPersistedNotes({ notes: "Action historique", cigaretteButtsMeasurements: measurements }, {
      resolvedCigaretteButtsMeasurements: measurements,
    });

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 600,
        cigaretteButtsMassKg: 0.132,
        cigaretteButtsVolumeLiters: 1,
        cigaretteButtsCondition: "humide",
        cigaretteButtsInputSource: "volume_l",
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: 600,
      cigaretteButtsVolumeLiters: 1,
      cigaretteButtsVolumeConversionFormulaVersion: CIGARETTE_BUTTS_VOLUME_CONVERSION_VERSION_V1,
    });
  });

  it("does not retain scalar equivalences when a volume source is cleared through PATCH", () => {
    const measurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_750,
      cigaretteButtsMassKg: 0.385,
      cigaretteButtsVolumeLiters: 2.5,
      cigaretteButtsCondition: "propre",
      cigaretteButtsCountProvenance: "volume_converted",
      cigaretteButtsMassProvenance: "weight_converted",
      cigaretteButtsVolumeProvenance: "measured",
      cigaretteButtsInputSource: "volume_l",
      cigaretteButtsVolumeConversionFormulaVersion: "cleanmymap-butts-volume-v2",
    });
    const notes = buildPersistedNotes({ notes: "Action volume", cigaretteButtsMeasurements: measurements }, {
      resolvedCigaretteButtsMeasurements: measurements,
    });

    const result = updateMeasurements(buildCurrent(notes), {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: null,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: null,
      },
    });

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsCount: null,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsInputSource: null,
    });
    const nextNotes = buildActionUpdateNotes({
      body: { cigaretteButtsMeasurements: {
        cigaretteButtsCount: null,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: null,
      } } as never,
      currentMetadata: extractActionMetadataFromNotes(notes),
      hasButtsMeasurementUpdate: result.hasButtsMeasurementUpdate,
      nextCigaretteButtsMeasurements: result.nextCigaretteButtsMeasurements,
      nextVolunteerParticipation: result.nextVolunteerParticipation,
    });
    expect(extractActionMetadataFromNotes(nextNotes).cigaretteButtsMeasurements).toBeNull();
  });

  it("persists a new mass source when a PATCH clears the counted source", () => {
    const measurements = normalizeCigaretteButtsMeasurements({
      cigaretteButtsCount: 1_750,
      cigaretteButtsCondition: "propre",
      cigaretteButtsCountProvenance: "counted",
      cigaretteButtsMassProvenance: "weight_converted",
      cigaretteButtsInputSource: "count",
    });
    const notes = buildPersistedNotes({ notes: "Action count", cigaretteButtsMeasurements: measurements }, {
      resolvedCigaretteButtsMeasurements: measurements,
    });

    const body = {
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: null,
        cigaretteButtsMassKg: 1,
        cigaretteButtsCondition: "propre",
        cigaretteButtsInputSource: "mass_kg",
      },
    };
    const result = updateMeasurements(buildCurrent(notes), body);

    expect(result.nextCigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsMassKg: 1,
      cigaretteButtsCount: expect.any(Number),
      cigaretteButtsCountProvenance: "weight_converted",
      cigaretteButtsMassProvenance: "measured",
      cigaretteButtsInputSource: "mass_kg",
    });

    const nextNotes = buildActionUpdateNotes({
      body: body as never,
      currentMetadata: extractActionMetadataFromNotes(notes),
      hasButtsMeasurementUpdate: result.hasButtsMeasurementUpdate,
      nextCigaretteButtsMeasurements: result.nextCigaretteButtsMeasurements,
      nextVolunteerParticipation: result.nextVolunteerParticipation,
    });
    expect(extractActionMetadataFromNotes(nextNotes).cigaretteButtsMeasurements).toMatchObject({
      cigaretteButtsMassKg: 1,
      cigaretteButtsInputSource: "mass_kg",
      cigaretteButtsMassProvenance: "measured",
    });
  });
});
