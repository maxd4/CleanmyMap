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

function buildContractLocation(payload: CreateActionPayload): ActionContractCreatePayload["location"] {
  return {
    label: payload.locationLabel,
    latitude: payload.latitude,
    longitude: payload.longitude,
    departmentCode: payload.departmentCode ?? null,
    departmentName: payload.departmentName ?? null,
  };
}

function buildContractGeometry(
  payload: CreateActionPayload,
): ActionContractCreatePayload["geometry"] {
  if (!payload.manualDrawing) {
    return undefined;
  }

  return {
    kind: payload.manualDrawing.kind,
    coordinates: payload.manualDrawing.coordinates,
    geometrySource: payload.geometrySource ?? null,
  };
}

function buildContractDates(payload: CreateActionPayload): ActionContractCreatePayload["dates"] {
  return {
    observedAt: payload.actionDate,
    eventStartTime: payload.eventStartTime ?? null,
    eventEndTime: payload.eventEndTime ?? null,
  };
}

function buildContractMetadata(
  payload: CreateActionPayload,
): ActionContractCreatePayload["metadata"] {
  return {
    actorName: payload.actorName,
    associationName: payload.associationName,
    organizerType: payload.organizerType,
    organizerId: payload.organizerId,
    organizerName: payload.organizerName?.trim() || undefined,
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
  };
}

/**
 * Prépare le payload pour la création d'un contrat via l'API.
 */
export function toContractCreatePayload(
  payload: CreateActionPayload,
): ActionContractCreatePayload {
  return {
    type: payload.recordType ?? "action",
    source: "web_form",
    location: buildContractLocation(payload),
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeTopology: payload.routeTopology,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    geometry: buildContractGeometry(payload),
    dates: buildContractDates(payload),
    metadata: buildContractMetadata(payload),
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

function normalizePreparationData(params: {
  preparationData: ActionPreparationData | null | undefined;
  recordType: ActionRecordType;
  topology: ActionRouteTopology;
  arrivalLocationLabel: string | null | undefined;
}): ActionPreparationData {
  const { preparationData, recordType, topology, arrivalLocationLabel } = params;
  return clearActionRouteArrivalForLoop(
    {
      ...(preparationData ?? {}),
      ...(recordType !== "action" && arrivalLocationLabel && !preparationData?.zoneCiblePrevue
        ? { zoneCiblePrevue: arrivalLocationLabel }
        : {}),
      routeTopology: topology,
    },
    { recordType, topology },
  );
}

type ContractNormalizationContext = {
  recordType: ActionRecordType;
  arrivalLocationLabel: string;
  routeTopology: ActionRouteTopology;
  preparationData: ActionPreparationData;
};

function buildContractNormalizationContext(
  payload: ActionContractCreatePayload,
): ContractNormalizationContext {
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

  return {
    recordType,
    arrivalLocationLabel,
    routeTopology,
    preparationData: normalizePreparationData({
      preparationData: payload.metadata.preparationData,
      recordType,
      topology: routeTopology,
      arrivalLocationLabel,
    }),
  };
}

function buildNormalizedIdentityFields(
  payload: ActionContractCreatePayload,
  context: ContractNormalizationContext,
){
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    organizerType: payload.metadata.organizerType ?? undefined,
    organizerId: payload.metadata.organizerId ?? null,
    organizerName:
      payload.metadata.organizerName ??
      (payload.metadata.organizerType === "spontaneous"
        ? undefined
        : payload.metadata.associationName),
    groupJoinEnabled: payload.metadata.groupJoinEnabled,
    actionPhase: payload.metadata.actionPhase ?? undefined,
    preparationData: context.preparationData,
    plannerSnapshotProof: payload.metadata.plannerSnapshotProof ?? null,
    organizerAccounts: payload.metadata.organizerAccounts ?? undefined,
    participantAccounts: payload.metadata.participantAccounts ?? undefined,
    actionDate: payload.dates.observedAt,
    recordType: payload.type,
  };
}

function buildNormalizedLocationFields(
  payload: ActionContractCreatePayload,
  context: ContractNormalizationContext,
) {
  const { recordType, arrivalLocationLabel, routeTopology } = context;
  return {
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
  };
}

function buildNormalizedMeasurementFields(payload: ActionContractCreatePayload) {
  return {
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
  };
}

function buildNormalizedMediaFields(payload: ActionContractCreatePayload) {
  return {
    wasteBreakdown: payload.metadata.wasteBreakdown,
    wasteMeasurementMethod: payload.metadata.wasteMeasurementMethod ?? undefined,
    photos: payload.metadata.photos ?? undefined,
    visionEstimate: payload.metadata.visionEstimate ?? undefined,
    manualDrawing: buildManualDrawing(payload.geometry),
    geometrySource: payload.geometry?.geometrySource ?? undefined,
    placeType: payload.metadata.placeType ?? undefined,
  };
}

function buildNormalizedContractPayload(
  payload: ActionContractCreatePayload,
  context: ContractNormalizationContext,
): CreateActionPayload {
  return {
    ...buildNormalizedIdentityFields(payload, context),
    ...buildNormalizedLocationFields(payload, context),
    ...buildNormalizedMeasurementFields(payload),
    ...buildNormalizedMediaFields(payload),
  };
}

/**
 * Normalise un payload de création (qu'il vienne du formulaire web ou d'un contrat existant).
 */
function normalizeContractCreatePayload(
  payload: ActionContractCreatePayload,
): CreateActionPayload {
  return buildNormalizedContractPayload(
    payload,
    buildContractNormalizationContext(payload),
  );
}

function normalizeLegacyCreatePayload(payload: CreateActionPayload): CreateActionPayload {
  const recordType = payload.recordType ?? "action";
  const arrivalLocationLabel = payload.arrivalLocationLabel ?? payload.preparationData?.zoneCiblePrevue;
  const routeTopology = resolveActionRouteTopology({
    topology: payload.routeTopology ?? payload.preparationData?.routeTopology,
    arrivalLocationLabel,
    recordType,
  });
  const normalizedPayload = {
    ...payload,
    wasteKg: payload.wasteKg ?? null,
    cigaretteButts: payload.cigaretteButts ?? null,
    routeTopology,
    arrivalLocationLabel:
      recordType !== "action" || routeTopology === "point_to_point"
        ? payload.arrivalLocationLabel
        : undefined,
    preparationData: normalizePreparationData({
      preparationData: payload.preparationData,
      recordType,
      topology: routeTopology,
      arrivalLocationLabel,
    }),
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

export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    return normalizeLegacyCreatePayload(payload);
  }
  return normalizeContractCreatePayload(payload);
}
