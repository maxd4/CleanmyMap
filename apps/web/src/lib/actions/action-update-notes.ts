import type { ActionCigaretteButtsMeasurements } from "@/lib/waste/cigarette-butts";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import { parseDrawingFromNotes } from "./geometry/drawing";
import { buildPersistedNotes } from "./store-notes";
import type { ActionVolunteerParticipation } from "./volunteer-participation";

type PersistedNotesPayload = Parameters<typeof buildPersistedNotes>[0];

function preferValue<T>(value: T | null | undefined, current: T | null | undefined): T | undefined {
  return value ?? current ?? undefined;
}

function preserveDefinedValue<T>(value: T | undefined, current: T | null | undefined): T | undefined {
  return value !== undefined ? value : current ?? undefined;
}

function shouldRefreshNotes(body: ActionUpdateInput): boolean {
  const ignoredKeys = new Set([
    "actionPhase",
    "preparationData",
    "organizerType",
    "departmentCode",
    "departmentName",
    "eventStartTime",
    "eventEndTime",
  ]);
  return Object.entries(body).some(
    ([key, value]) => !ignoredKeys.has(key) && value !== undefined,
  );
}

function buildGeneralNotesPayload(
  body: ActionUpdateInput,
  currentMetadata: ActionMetadata,
): Partial<PersistedNotesPayload> {
  return {
    associationName: preferValue(body.associationName, currentMetadata.associationName),
    groupJoinEnabled: preferValue(body.groupJoinEnabled, currentMetadata.groupJoinEnabled),
    departureLocationLabel: preferValue(
      body.departureLocationLabel,
      currentMetadata.departureLocationLabel,
    ),
    arrivalLocationLabel: preferValue(
      body.arrivalLocationLabel,
      currentMetadata.arrivalLocationLabel,
    ),
    routeStyle: preferValue(body.routeStyle, currentMetadata.routeStyle),
    routeAdjustmentMessage: preferValue(
      body.routeAdjustmentMessage,
      currentMetadata.routeAdjustmentMessage,
    ),
    notes: preferValue(body.notes, currentMetadata.cleanNotes),
    placeType: preferValue(body.placeType, currentMetadata.placeType),
    submissionMode: preferValue(body.submissionMode, currentMetadata.submissionMode),
    wasteBreakdown: preferValue(body.wasteBreakdown, currentMetadata.wasteBreakdown),
    wasteMeasurementMethod: preferValue(
      body.wasteMeasurementMethod,
      currentMetadata.wasteMeasurementMethod,
    ),
  };
}

function buildMeasurementNotesPayload(params: {
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
  hasButtsMeasurementUpdate: boolean;
  nextCigaretteButtsMeasurements: ActionCigaretteButtsMeasurements | null;
  nextVolunteerParticipation: ActionVolunteerParticipation | null;
}): Partial<PersistedNotesPayload> {
  const {
    body,
    currentMetadata,
    hasButtsMeasurementUpdate,
    nextCigaretteButtsMeasurements,
    nextVolunteerParticipation,
  } = params;
  return {
    cigaretteButtsKg: hasButtsMeasurementUpdate
      ? nextCigaretteButtsMeasurements?.cigaretteButtsMassKg
      : preserveDefinedValue(body.cigaretteButtsKg, currentMetadata.cigaretteButtsKg),
    cigaretteButtsMeasurements: hasButtsMeasurementUpdate
      ? nextCigaretteButtsMeasurements
      : currentMetadata.cigaretteButtsMeasurements,
    volunteerParticipation: nextVolunteerParticipation,
    cigaretteButtsMassKg: hasButtsMeasurementUpdate
      ? nextCigaretteButtsMeasurements?.cigaretteButtsMassKg
      : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsMassKg,
    cigaretteButtsVolumeLiters: hasButtsMeasurementUpdate
      ? nextCigaretteButtsMeasurements?.cigaretteButtsVolumeLiters
      : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters,
    cigaretteButtsCondition: hasButtsMeasurementUpdate
      ? nextCigaretteButtsMeasurements?.cigaretteButtsCondition
      : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsCondition,
  };
}

function buildMediaNotesPayload(
  body: ActionUpdateInput,
  currentMetadata: ActionMetadata,
): Partial<PersistedNotesPayload> {
  return {
    photos:
      body.photos?.map((photo) => ({
        id: photo.id,
        name: photo.name,
        mimeType: photo.mimeType,
        size: photo.size,
        width: photo.width ?? null,
        height: photo.height ?? null,
      })) ?? currentMetadata.photos ?? undefined,
    visionEstimate: preferValue(body.visionEstimate, currentMetadata.visionEstimate),
  };
}

export function buildActionUpdateNotes(params: {
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
  hasButtsMeasurementUpdate: boolean;
  nextCigaretteButtsMeasurements: ActionCigaretteButtsMeasurements | null;
  nextVolunteerParticipation: ActionVolunteerParticipation | null;
}): string | null | undefined {
  const {
    body,
    currentMetadata,
    hasButtsMeasurementUpdate,
    nextCigaretteButtsMeasurements,
    nextVolunteerParticipation,
  } = params;
  if (!shouldRefreshNotes(body)) return undefined;

  const persistedPayload = {
    ...buildGeneralNotesPayload(body, currentMetadata),
    ...buildMeasurementNotesPayload({
      body,
      currentMetadata,
      hasButtsMeasurementUpdate,
      nextCigaretteButtsMeasurements,
      nextVolunteerParticipation,
    }),
    ...buildMediaNotesPayload(body, currentMetadata),
  } satisfies PersistedNotesPayload;
  return buildPersistedNotes(persistedPayload, {
    resolvedCigaretteButtsMeasurements:
      hasButtsMeasurementUpdate || currentMetadata.cigaretteButtsMeasurements
        ? nextCigaretteButtsMeasurements
        : undefined,
  });
}

export function preserveManualDrawing(
  currentNotes: string | null,
  notes: string | null | undefined,
): string | null | undefined {
  const currentDrawing = parseDrawingFromNotes(currentNotes).manualDrawing;
  if (!currentDrawing || typeof notes !== "string") return notes;
  return buildPersistedNotes({ notes, manualDrawing: currentDrawing });
}
