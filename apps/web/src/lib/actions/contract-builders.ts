import {
  ActionRecordType,
  ActionSubmissionMode,
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

/**
 * Normalise un payload de création (qu'il vienne du formulaire web ou d'un contrat existant).
 */
export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    return payload;
  }
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    actionDate: payload.dates.observedAt,
    locationLabel: payload.location.label,
    departureLocationLabel:
      payload.departureLocationLabel ??
      payload.metadata.departureLocationLabel ??
      "",
    arrivalLocationLabel:
      payload.arrivalLocationLabel ?? payload.metadata.arrivalLocationLabel ?? "",
    routeStyle: payload.routeStyle ?? payload.metadata.routeStyle ?? undefined,
    routeAdjustmentMessage:
      payload.routeAdjustmentMessage ??
      payload.metadata.routeAdjustmentMessage ??
      undefined,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    wasteKg: payload.metadata.wasteKg,
    cigaretteButts: payload.metadata.cigaretteButts ?? 0,
    volunteersCount: payload.metadata.volunteersCount ?? 1,
    durationMinutes: payload.metadata.durationMinutes ?? 0,
    notes: payload.metadata.notes,
    submissionMode: payload.metadata.submissionMode ?? "complete",
    wasteBreakdown: payload.metadata.wasteBreakdown,
    photos: payload.metadata.photos ?? undefined,
    visionEstimate: payload.metadata.visionEstimate ?? undefined,
    manualDrawing: payload.geometry
      ? {
          kind: payload.geometry.kind,
          coordinates: payload.geometry.coordinates,
        }
      : undefined,
    placeType: payload.metadata.placeType ?? undefined,
  };
}
