import {
  ActionRecordType,
  ActionSubmissionMode,
  ActionPreparationData,
  ActionRouteTopology,
  ActionWasteBreakdown,
  ActionPhotoAsset,
  ActionVisionEstimate,
  CreateActionPayload,
} from "../types";
import {
  clearActionRouteArrivalForLoop,
  resolveActionRouteTopology,
} from "../route-topology";
import type { ActionGeometrySource } from "../types";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";
import type {
  RawCigaretteButtsMeasurementInput,
} from "@/lib/waste/cigarette-butts";
import type { ActionVolunteerParticipation } from "../volunteer-participation";

export type ActionContractCreatePayload = {
  type: ActionRecordType;
  source: string;
  createdByClerkId?: string | null;
  location: {
    label: string;
    latitude?: number;
    longitude?: number;
    departmentCode?: string | null;
    departmentName?: string | null;
  };
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeTopology?: ActionRouteTopology;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  geometry?: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
    geometrySource?: ActionGeometrySource | null;
  };
  dates: {
    observedAt: string;
    eventStartTime?: string | null;
    eventEndTime?: string | null;
  };
  metadata: Pick<
    CreateActionPayload,
    | "actorName"
    | "associationName"
    | "organizerType"
    | "organizerId"
    | "organizerName"
    | "organizerAccounts"
    | "participantAccounts"
    | "groupJoinEnabled"
    | "actionPhase"
    | "preparationData"
  > & {
    plannerSnapshotProof?: RoutePlannerProof | null;
    placeType?: string;
    wasteKg?: number | null;
    cigaretteButtsMeasurements?: RawCigaretteButtsMeasurementInput | null;
    volunteerParticipation?: ActionVolunteerParticipation | null;
    cigaretteButtsMassKg?: number | null;
    cigaretteButtsVolumeLiters?: number | null;
    cigaretteButtsCondition?: import("../types").ActionMegotsCondition | null;
    cigaretteButtsKg?: number | null;
    cigaretteButts?: number | null;
    volunteersCount?: number;
    durationMinutes?: number;
    notes?: string;
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    wasteMeasurementMethod?: import("@/lib/waste/measurement").ActionWasteMeasurementMethod | null;
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
    routeTopology?: ActionRouteTopology;
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
      departmentCode: payload.departmentCode ?? null,
      departmentName: payload.departmentName ?? null,
    },
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeTopology: payload.routeTopology,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    geometry: payload.manualDrawing
      ? {
          kind: payload.manualDrawing.kind,
          coordinates: payload.manualDrawing.coordinates,
          geometrySource: payload.geometrySource ?? null,
        }
      : undefined,
    dates: {
      observedAt: payload.actionDate,
      eventStartTime: payload.eventStartTime ?? null,
      eventEndTime: payload.eventEndTime ?? null,
    },
    metadata: {
      actorName: payload.actorName,
      associationName: payload.associationName,
      organizerType: payload.organizerType,
      organizerId: payload.organizerId,
      organizerName: payload.organizerName,
      organizerAccounts: payload.organizerAccounts,
      participantAccounts: payload.participantAccounts,
      groupJoinEnabled: payload.groupJoinEnabled,
      actionPhase: payload.actionPhase,
      preparationData: withRouteCalibrationContext(
        payload.preparationData,
        payload.routeCalibrationContext,
      ),
      plannerSnapshotProof: payload.plannerSnapshotProof ?? null,
      placeType: payload.placeType,
      wasteKg: payload.wasteKg,
      cigaretteButtsMeasurements: payload.cigaretteButtsMeasurements,
      volunteerParticipation: payload.volunteerParticipation,
      cigaretteButtsMassKg: payload.cigaretteButtsMassKg,
      cigaretteButtsVolumeLiters: payload.cigaretteButtsVolumeLiters,
      cigaretteButtsCondition: payload.cigaretteButtsCondition,
      cigaretteButtsKg: payload.cigaretteButtsKg,
      cigaretteButts: payload.cigaretteButts,
      volunteersCount: payload.volunteersCount,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
      routeStyle: payload.routeStyle,
      routeTopology: payload.routeTopology,
      routeAdjustmentMessage: payload.routeAdjustmentMessage,
      submissionMode: payload.submissionMode,
      wasteBreakdown: payload.wasteBreakdown,
      wasteMeasurementMethod: payload.wasteMeasurementMethod,
      photos: payload.photos,
      visionEstimate: payload.visionEstimate,
    },
  };
}

function withRouteCalibrationContext(
  preparationData: ActionPreparationData | null | undefined,
  context: RouteCalibrationContext | null | undefined,
): ActionPreparationData | null {
  if (!context) return preparationData ?? null;
  return {
    ...(preparationData ?? {}),
    routeCalibrationContext: context,
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
  const recordType = payload.type;
  const arrivalLocationLabel = fallbackString(
    payload.arrivalLocationLabel,
    payload.metadata.arrivalLocationLabel,
  );
  const routeTopology = resolveActionRouteTopology({
    topology: payload.routeTopology ?? payload.metadata.routeTopology,
    arrivalLocationLabel,
    recordType,
  });
  const preparationData = clearActionRouteArrivalForLoop(
    {
      ...(payload.metadata.preparationData ?? {}),
      ...(recordType !== "action" && arrivalLocationLabel && !payload.metadata.preparationData?.zoneCiblePrevue
        ? { zoneCiblePrevue: arrivalLocationLabel }
        : {}),
      routeTopology,
    },
    { recordType, topology: routeTopology },
  );
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    organizerType: payload.metadata.organizerType ?? undefined,
    organizerId: payload.metadata.organizerId ?? null,
    organizerName: payload.metadata.organizerName ?? payload.metadata.associationName,
    groupJoinEnabled: payload.metadata.groupJoinEnabled,
    actionPhase: payload.metadata.actionPhase ?? undefined,
    preparationData,
    plannerSnapshotProof: payload.metadata.plannerSnapshotProof ?? null,
    organizerAccounts: payload.metadata.organizerAccounts ?? undefined,
    participantAccounts: payload.metadata.participantAccounts ?? undefined,
    actionDate: payload.dates.observedAt,
    recordType: payload.type,
    locationLabel: payload.location.label,
    departureLocationLabel: fallbackString(payload.departureLocationLabel, payload.metadata.departureLocationLabel),
    arrivalLocationLabel:
      recordType !== "action" || routeTopology === "point_to_point"
        ? arrivalLocationLabel
        : undefined,
    routeTopology,
    routeStyle: payload.routeStyle ?? payload.metadata.routeStyle ?? undefined,
    routeAdjustmentMessage: payload.routeAdjustmentMessage ?? payload.metadata.routeAdjustmentMessage ?? undefined,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    departmentCode: payload.location.departmentCode ?? null,
    departmentName: payload.location.departmentName ?? null,
    wasteKg: payload.metadata.wasteKg ?? null,
    cigaretteButtsMeasurements: payload.metadata.cigaretteButtsMeasurements ?? null,
    volunteerParticipation: payload.metadata.volunteerParticipation ?? null,
    cigaretteButtsMassKg: payload.metadata.cigaretteButtsMassKg ?? null,
    cigaretteButtsVolumeLiters: payload.metadata.cigaretteButtsVolumeLiters ?? null,
    cigaretteButtsCondition: payload.metadata.cigaretteButtsCondition ?? null,
    cigaretteButtsKg: payload.metadata.cigaretteButtsKg ?? null,
    cigaretteButts: payload.metadata.cigaretteButts ?? null,
    volunteersCount: fallbackNumber(payload.metadata.volunteersCount, 1),
    durationMinutes: fallbackNumber(payload.metadata.durationMinutes, 0),
    eventStartTime: payload.dates.eventStartTime ?? null,
    eventEndTime: payload.dates.eventEndTime ?? null,
    notes: payload.metadata.notes,
    submissionMode: payload.metadata.submissionMode ?? "complete",
    wasteBreakdown: payload.metadata.wasteBreakdown,
    wasteMeasurementMethod: payload.metadata.wasteMeasurementMethod ?? undefined,
    photos: payload.metadata.photos ?? undefined,
    visionEstimate: payload.metadata.visionEstimate ?? undefined,
    manualDrawing: buildManualDrawing(payload.geometry),
    geometrySource: payload.geometry?.geometrySource ?? undefined,
    placeType: payload.metadata.placeType ?? undefined,
  };
}

export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    const recordType = payload.recordType ?? "action";
    const arrivalLocationLabel =
      payload.arrivalLocationLabel ?? payload.preparationData?.zoneCiblePrevue;
    const normalizedMeasurements = {
      ...payload,
      wasteKg: payload.wasteKg ?? null,
      cigaretteButts: payload.cigaretteButts ?? null,
      routeTopology: resolveActionRouteTopology({
        topology: payload.routeTopology ?? payload.preparationData?.routeTopology,
        arrivalLocationLabel,
        recordType,
      }),
    };
    const preparationData = clearActionRouteArrivalForLoop(
      {
        ...(payload.preparationData ?? {}),
        ...(recordType !== "action" && arrivalLocationLabel && !payload.preparationData?.zoneCiblePrevue
          ? { zoneCiblePrevue: arrivalLocationLabel }
          : {}),
        routeTopology: normalizedMeasurements.routeTopology,
      },
      { recordType, topology: normalizedMeasurements.routeTopology },
    );
    const normalizedPayload = {
      ...normalizedMeasurements,
      arrivalLocationLabel:
        recordType !== "action" || normalizedMeasurements.routeTopology === "point_to_point"
          ? payload.arrivalLocationLabel
          : undefined,
      preparationData,
    };
    if (!payload.routeCalibrationContext) {
      return normalizedPayload;
    }
    return {
      ...normalizedPayload,
      preparationData: withRouteCalibrationContext(
        normalizedPayload.preparationData,
        payload.routeCalibrationContext,
      ),
    };
  }
  return normalizeContractCreatePayload(payload);
}
