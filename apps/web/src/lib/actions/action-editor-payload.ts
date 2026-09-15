import type { ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "./metadata";
import { parseDrawingFromNotes } from "./geometry/drawing";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { normalizeClockTime } from "./time-contract";
import { normalizeAdministrativeRequirements } from "./administrative-requirements";

export function buildActionEditorPayload(row: ActionRow | null) {
  if (!row) {
    return null;
  }

  const parsedDrawing = parseDrawingFromNotes(row.notes);
  const metadata = extractActionMetadataFromNotes(parsedDrawing.cleanNotes);
  const preparationData = normalizeActionPreparationData(row.preparation_data ?? {});
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    publishedAt: row.published_at ?? null,
    recordType: "action",
    actionPhase: row.action_phase,
    preparationData:
      row.action_phase === "pre_action"
        ? {
            ...preparationData,
            administrativeRequirements: normalizeAdministrativeRequirements(
              preparationData.administrativeRequirements,
            ),
          }
        : preparationData,
    createdByClerkId: row.created_by_clerk_id,
    actorName: row.actor_name,
    actionDate: row.action_date,
    locationLabel: row.location_label,
    departmentCode: row.department_code ?? null,
    departmentName: row.department_name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    wasteKg: row.waste_kg,
    cigaretteButtsKg: metadata.cigaretteButtsKg,
    cigaretteButtsMeasurements: metadata.cigaretteButtsMeasurements,
    cigaretteButtsMassKg:
      metadata.cigaretteButtsMeasurements?.cigaretteButtsMassKg ??
      metadata.cigaretteButtsKg,
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
    associationName: metadata.associationName,
    organizerType: row.organizer_type,
    groupJoinEnabled: metadata.groupJoinEnabled,
    placeType: metadata.placeType,
    departureLocationLabel: metadata.departureLocationLabel,
    arrivalLocationLabel: metadata.arrivalLocationLabel,
    routeStyle: metadata.routeStyle,
    routeAdjustmentMessage: metadata.routeAdjustmentMessage,
    wasteBreakdown: metadata.wasteBreakdown,
    wasteMeasurementMethod: metadata.wasteMeasurementMethod,
    photos: metadata.photos,
    visionEstimate: metadata.visionEstimate,
    manualDrawing: parsedDrawing.manualDrawing,
  };
}
