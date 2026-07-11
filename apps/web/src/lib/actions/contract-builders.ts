import {
  ActionRecordType,
  ActionSubmissionMode,
  ActionPhase,
  ActionPreparationData,
  ActionWasteBreakdown,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "./types";

export type ActionContractCreatePayload = {
  type: ActionRecordType;
  source: string;
  createdByClerkId?: string | null;
  location: {
    label: string;
    latitude?: number;
    longitude?: number;
  };
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  geometry?: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  };
  dates: {
    observedAt: string;
  };
  metadata: {
    actorName?: string;
    associationName?: string;
    organizerAccounts?: string[];
    participantAccounts?: string[];
    groupJoinEnabled?: boolean;
    actionPhase?: ActionPhase;
    preparationData?: ActionPreparationData | null;
    placeType?: string;
    wasteKg: number;
    cigaretteButts?: number;
    volunteersCount?: number;
    durationMinutes?: number;
    notes?: string;
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
    photos?: ActionPhotoAsset[];
    visionEstimate?: ActionVisionEstimate | null;
  };
};

/**
 * Prépare le payload pour la création d'un contrat via l'API.
 */
export function toContractCreatePayload(
  payload: CreateActionPayload,
): ActionContractCreatePayload {
  return {
    type: payload.recordType ?? "action",
    source: "web_form",
    location: {
      label: payload.locationLabel,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    geometry: payload.manualDrawing
      ? {
          kind: payload.manualDrawing.kind,
          coordinates: payload.manualDrawing.coordinates,
        }
      : undefined,
    dates: {
      observedAt: payload.actionDate,
    },
    metadata: {
      actorName: payload.actorName,
      associationName: payload.associationName,
      organizerAccounts: payload.organizerAccounts,
      participantAccounts: payload.participantAccounts,
      groupJoinEnabled: payload.groupJoinEnabled,
      actionPhase: payload.actionPhase,
      preparationData: payload.preparationData ?? null,
      placeType: payload.placeType,
      wasteKg: payload.wasteKg,
      cigaretteButts: payload.cigaretteButts,
      volunteersCount: payload.volunteersCount,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
      routeStyle: payload.routeStyle,
      routeAdjustmentMessage: payload.routeAdjustmentMessage,
      submissionMode: payload.submissionMode,
      wasteBreakdown: payload.wasteBreakdown,
      photos: payload.photos,
      visionEstimate: payload.visionEstimate,
    },
  };
}

function fallbackString(
  primary: string | null | undefined,
  secondary: string | null | undefined,
  fallback = "",
): string {
  return primary ?? secondary ?? fallback;
}

function fallbackNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  return value ?? fallback;
}

function buildManualDrawing(
  geometry: CreateActionPayload["manualDrawing"],
): CreateActionPayload["manualDrawing"] {
  if (!geometry) {
    return undefined;
  }

  return {
    kind: geometry.kind,
    coordinates: geometry.coordinates,
  };
}

/**
 * Normalise un payload de création (qu'il vienne du formulaire web ou d'un contrat existant).
 */
function normalizeContractCreatePayload(
  payload: ActionContractCreatePayload,
): CreateActionPayload {
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    groupJoinEnabled: payload.metadata.groupJoinEnabled,
    actionPhase: payload.metadata.actionPhase ?? undefined,
    preparationData: payload.metadata.preparationData ?? null,
    organizerAccounts: payload.metadata.organizerAccounts ?? undefined,
    participantAccounts: payload.metadata.participantAccounts ?? undefined,
    actionDate: payload.dates.observedAt,
    recordType: payload.type,
    locationLabel: payload.location.label,
    departureLocationLabel: fallbackString(payload.departureLocationLabel, payload.metadata.departureLocationLabel),
    arrivalLocationLabel: fallbackString(payload.arrivalLocationLabel, payload.metadata.arrivalLocationLabel),
    routeStyle: payload.routeStyle ?? payload.metadata.routeStyle ?? undefined,
    routeAdjustmentMessage: payload.routeAdjustmentMessage ?? payload.metadata.routeAdjustmentMessage ?? undefined,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    wasteKg: payload.metadata.wasteKg,
    cigaretteButts: fallbackNumber(payload.metadata.cigaretteButts, 0),
    volunteersCount: fallbackNumber(payload.metadata.volunteersCount, 1),
    durationMinutes: fallbackNumber(payload.metadata.durationMinutes, 0),
    notes: payload.metadata.notes,
    submissionMode: payload.metadata.submissionMode ?? "complete",
    wasteBreakdown: payload.metadata.wasteBreakdown,
    photos: payload.metadata.photos ?? undefined,
    visionEstimate: payload.metadata.visionEstimate ?? undefined,
    manualDrawing: buildManualDrawing(payload.geometry),
    placeType: payload.metadata.placeType ?? undefined,
  };
}

export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    return payload;
  }
  return normalizeContractCreatePayload(payload);
}
