import type {
  ActionPhotoAsset,
  CreateActionPayload,
} from "@/lib/actions/types";
import { DRAWING_NOTE_PREFIX } from "@/lib/actions/geometry/drawing";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  normalizeCigaretteButtsMeasurementsFromUserInput,
  type ActionCigaretteButtsMeasurements,
} from "@/lib/waste/cigarette-butts";
import {
  normalizeVolunteerParticipation,
  type ActionVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";

type PersistedActionNotesPayload = Partial<Pick<
  CreateActionPayload,
  | "notes"
  | "submissionMode"
  | "wasteBreakdown"
  | "wasteMeasurementMethod"
  | "cigaretteButtsKg"
  | "cigaretteButtsMeasurements"
  | "associationName"
  | "groupJoinEnabled"
  | "placeType"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeStyle"
  | "routeAdjustmentMessage"
  | "visionEstimate"
  | "manualDrawing"
  | "cigaretteButts"
  | "cigaretteButtsCount"
  | "cigaretteButtsMassKg"
  | "cigaretteButtsVolumeLiters"
  | "cigaretteButtsCondition"
  | "volunteerParticipation"
  >> & {
  photos?: Array<
    Pick<
      ActionPhotoAsset,
      "id" | "name" | "mimeType" | "size" | "width" | "height"
    >
  >;
};

type PersistedActionNotesOptions = {
  /** Internal server resolution; never sourced from an HTTP payload. */
  resolvedCigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
};

export function buildPersistedNotes(
  payload: PersistedActionNotesPayload,
  options: PersistedActionNotesOptions = {},
): string | null {
  const cigaretteButtsMeasurements =
    options.resolvedCigaretteButtsMeasurements !== undefined
      ? options.resolvedCigaretteButtsMeasurements
      : resolveActionCigaretteButtsMeasurements(payload);
  const baseWithMetadata = appendActionMetadataToNotes(payload.notes, {
    submissionMode: payload.submissionMode,
    wasteBreakdown: payload.wasteBreakdown,
    wasteMeasurementMethod: payload.wasteMeasurementMethod ?? undefined,
    cigaretteButtsKg: payload.cigaretteButtsKg,
    cigaretteButtsMeasurements,
    volunteerParticipation: resolveActionVolunteerParticipation(payload),
    associationName: payload.associationName,
    groupJoinEnabled: payload.groupJoinEnabled,
    placeType: payload.placeType,
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    photos: payload.photos,
    visionEstimate: payload.visionEstimate,
  });
  const base = baseWithMetadata?.trim() ?? "";
  if (!payload.manualDrawing) {
    return base || null;
  }

  const drawingJson = JSON.stringify({
    kind: payload.manualDrawing.kind,
    coordinates: payload.manualDrawing.coordinates,
  });
  return base
    ? `${base}\n${DRAWING_NOTE_PREFIX}${drawingJson}`
    : `${DRAWING_NOTE_PREFIX}${drawingJson}`;
}

function resolveActionVolunteerParticipation(
  payload: Partial<Pick<CreateActionPayload, "volunteerParticipation">>,
): ActionVolunteerParticipation | null {
  return payload.volunteerParticipation
    ? normalizeVolunteerParticipation(payload.volunteerParticipation)
    : null;
}

function resolveActionCigaretteButtsMeasurements(
  payload: Partial<Pick<
    CreateActionPayload,
    | "cigaretteButtsMeasurements"
    | "cigaretteButtsCount"
    | "cigaretteButts"
    | "cigaretteButtsMassKg"
    | "cigaretteButtsVolumeLiters"
    | "cigaretteButtsCondition"
    | "cigaretteButtsKg"
    | "wasteBreakdown"
  >>,
): ActionCigaretteButtsMeasurements {
  if (payload.cigaretteButtsMeasurements) {
    return normalizeCigaretteButtsMeasurementsFromUserInput(
      payload.cigaretteButtsMeasurements,
    );
  }

  return normalizeCigaretteButtsMeasurementsFromUserInput({
    cigaretteButtsCount: payload.cigaretteButtsCount ?? payload.cigaretteButts,
    cigaretteButtsMassKg:
      payload.cigaretteButtsMassKg ??
      payload.cigaretteButtsKg ??
      payload.wasteBreakdown?.megotsKg ??
      null,
    cigaretteButtsVolumeLiters: payload.cigaretteButtsVolumeLiters ?? null,
    cigaretteButtsCondition:
      payload.cigaretteButtsCondition ?? payload.wasteBreakdown?.megotsCondition ?? null,
  });
}

export function resolvePersistedCigaretteButts(
  payload: CreateActionPayload,
): number | null {
  const measurements = resolveActionCigaretteButtsMeasurements(payload);

  return measurements.cigaretteButtsCount;
}
