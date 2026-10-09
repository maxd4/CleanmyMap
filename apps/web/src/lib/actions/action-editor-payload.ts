import type { ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "./metadata";
import { parseDrawingFromNotes } from "./geometry/drawing";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { normalizeClockTime } from "./time-contract";
import { projectAdministrativeRequirementsForRead } from "./administrative-requirements";
import { rebaseRouteTargetDistancePolicy } from "./route-target-policy-rebase";
import { parseDrawingFromGeoJson } from "./geometry/derived-geometry";

type ActionEditorMetadata = ReturnType<typeof extractActionMetadataFromNotes>;
type ParsedActionDrawing = ReturnType<typeof parseDrawingFromNotes>;

function buildEditorPreparationData(row: ActionRow) {
  const preparationData = rebaseRouteTargetDistancePolicy({
    preparationData: normalizeActionPreparationData(row.preparation_data ?? {}),
    durationMinutes: row.duration_minutes,
  });

  if (row.action_phase !== "pre_action") {
    return preparationData;
  }

  return {
    ...preparationData,
    administrativeRequirements: projectAdministrativeRequirementsForRead(
      preparationData.administrativeRequirements,
    ),
  };
}

function buildEditorMeasurementFields(row: ActionRow, metadata: ActionEditorMetadata) {
  return {
    wasteKg: row.waste_kg,
    cigaretteButtsKg: metadata.cigaretteButtsKg,
    cigaretteButtsMeasurements: metadata.cigaretteButtsMeasurements,
    cigaretteButtsMassKg:
      metadata.cigaretteButtsMeasurements?.cigaretteButtsMassKg ?? metadata.cigaretteButtsKg,
    cigaretteButtsVolumeLiters:
      metadata.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters ?? null,
    cigaretteButtsCondition:
      metadata.cigaretteButtsMeasurements?.cigaretteButtsCondition ?? null,
    cigaretteButts: row.cigarette_butts,
    volunteersCount: row.volunteers_count,
    volunteerParticipation: metadata.volunteerParticipation,
    durationMinutes: row.duration_minutes,
    eventStartTime: normalizeClockTime(row.event_start_time),
    eventEndTime: normalizeClockTime(row.event_end_time),
    notes: metadata.cleanNotes,
    submissionMode: metadata.submissionMode,
  };
}

function buildEditorOrganizerFields(row: ActionRow, metadata: ActionEditorMetadata) {
  return {
    associationName: metadata.associationName,
    organizerType: row.organizer_type,
    organizerId: row.organizer_id ?? null,
    organizerName:
      row.organizer_name ??
      (row.organizer_type === "spontaneous" ? undefined : metadata.associationName),
    groupJoinEnabled: metadata.groupJoinEnabled,
  };
}

function buildEditorRouteFields(metadata: ActionEditorMetadata) {
  return {
    placeType: metadata.placeType,
    departureLocationLabel: metadata.departureLocationLabel,
    arrivalLocationLabel: metadata.arrivalLocationLabel,
    routeStyle: metadata.routeStyle,
    routeAdjustmentMessage: metadata.routeAdjustmentMessage,
    wasteBreakdown: metadata.wasteBreakdown,
    wasteMeasurementMethod: metadata.wasteMeasurementMethod,
  };
}

function buildEditorMediaFields(
  row: ActionRow,
  metadata: ActionEditorMetadata,
  parsedDrawing: ParsedActionDrawing,
) {
  return {
    photos: metadata.photos,
    visionEstimate: metadata.visionEstimate,
    manualDrawing:
      parseDrawingFromGeoJson(
        row.derived_geometry_geojson,
        row.derived_geometry_kind,
      ) ?? parsedDrawing.manualDrawing,
    geometrySource: row.geometry_source ?? null,
  };
}

export function buildActionEditorPayload(row: ActionRow | null) {
  if (!row) {
    return null;
  }

  const parsedDrawing = parseDrawingFromNotes(row.notes);
  const metadata = extractActionMetadataFromNotes(parsedDrawing.cleanNotes);
  const preparationData = buildEditorPreparationData(row);
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    publishedAt: row.published_at ?? null,
    recordType: "action",
    actionPhase: row.action_phase,
    preparationData,
    createdByClerkId: row.created_by_clerk_id,
    actorName: row.actor_name,
    actionDate: row.action_date,
    locationLabel: row.location_label,
    departmentCode: row.department_code ?? null,
    departmentName: row.department_name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    ...buildEditorMeasurementFields(row, metadata),
    ...buildEditorOrganizerFields(row, metadata),
    ...buildEditorRouteFields(metadata),
    ...buildEditorMediaFields(row, metadata, parsedDrawing),
  };
}
