import { buildPersistedNotes } from "./store-notes";
import { preserveHistoricalRouteCalibrationContext } from "@/lib/route/route-calibration";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";
import { resolveActionDepartmentForPersistence } from "@/lib/geo/action-department-resolver";
import {
  getTimeContractValidationMessage,
} from "./time-contract";
import {
  normalizeCigaretteButtsMeasurementsFromUserInput,
} from "@/lib/waste/cigarette-butts";
import {
  normalizeVolunteerParticipation,
  resolveParticipantsCount,
} from "./volunteer-participation";
import { extractActionMetadataFromNotes } from "./metadata";
import type { ActionRow } from "@/types/database";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import { resolveNextActionStatus } from "./action-update-status";
import { normalizeAdministrativeRequirements } from "./administrative-requirements";

export class ActionUpdateValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "ActionUpdateValidationError";
  }
}

export type PreparedActionUpdate = {
  body: ActionUpdateInput;
  currentMetadata: ActionMetadata;
  updateData: Record<string, unknown>;
};

export async function prepareActionUpdate(params: {
  current: ActionRow;
  parsedBody: ActionUpdateInput;
}): Promise<PreparedActionUpdate> {
  const { current, parsedBody } = params;
  const updateData: Record<string, unknown> = {};
  let body = parsedBody;

  if (parsedBody.preparationData !== undefined) {
    let preservedPreparationData: typeof parsedBody.preparationData;
    try {
      preservedPreparationData = preserveHistoricalRouteCalibrationContext(
        current.preparation_data,
        parsedBody.preparationData,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Le contexte historique de calibration ne peut pas être réécrit."
      ) {
        throw new ActionUpdateValidationError("preparationData", error.message);
      }
      throw error;
    }
    const nextActionPhase = parsedBody.actionPhase ?? current.action_phase;
    if (nextActionPhase === "pre_action") {
      preservedPreparationData = {
        ...preservedPreparationData,
        // Only the dedicated server capability may transition this state.
        administrativeRequirements: normalizeAdministrativeRequirements(
          current.preparation_data?.administrativeRequirements,
        ),
      };
    }
    body = { ...parsedBody, preparationData: preservedPreparationData };
  }

  const currentMetadata = extractActionMetadataFromNotes(current.notes);
  const temporalMessage = getTimeContractValidationMessage({
    actionDurationMinutes:
      body.durationMinutes !== undefined
        ? body.durationMinutes
        : current.duration_minutes,
    startTime:
      body.eventStartTime !== undefined
        ? body.eventStartTime
        : current.event_start_time,
    endTime:
      body.eventEndTime !== undefined
        ? body.eventEndTime
        : current.event_end_time,
  });
  if (temporalMessage) {
    throw new ActionUpdateValidationError("eventStartTime", temporalMessage);
  }

  if (body.actionPhase) {
    updateData["action_phase"] = body.actionPhase;
    const nextStatus = resolveNextActionStatus({
      currentStatus: current.status,
      actionPhase: body.actionPhase,
    });
    if (body.actionPhase !== "post_action_draft") {
      updateData["status"] = nextStatus;
    }
  }
  if (body.preparationData !== undefined) {
    updateData["preparation_data"] = normalizeActionPreparationData(
      body.preparationData ?? {},
    );
  }
  if (body.actorName !== undefined) {
    updateData["actor_name"] = body.actorName.trim() || null;
  }
  if (body.actionDate !== undefined) {
    updateData["action_date"] = body.actionDate;
  }
  if (body.locationLabel !== undefined) {
    updateData["location_label"] = body.locationLabel.trim();
  }
  if (body.latitude !== undefined) {
    updateData["latitude"] = body.latitude;
  }
  if (body.longitude !== undefined) {
    updateData["longitude"] = body.longitude;
  }

  const coordinatesChanged =
    (body.latitude !== undefined && body.latitude !== current.latitude) ||
    (body.longitude !== undefined && body.longitude !== current.longitude);
  const department = await resolveActionDepartmentForPersistence({
    latitude: body.latitude ?? current.latitude,
    longitude: body.longitude ?? current.longitude,
    geometry: coordinatesChanged
      ? null
      : {
          kind: current.derived_geometry_kind,
          geojson: current.derived_geometry_geojson,
        },
    existingDepartmentCode: current.department_code,
    existingDepartmentName: current.department_name,
    spatiallyChanged: coordinatesChanged,
  });
  updateData["department_code"] = department.departmentCode;
  updateData["department_name"] = department.departmentName;

  if (body.wasteKg !== undefined) {
    updateData["waste_kg"] = body.wasteKg;
  }

  const hasButtsMeasurementUpdate = [
    "cigaretteButtsMeasurements",
    "cigaretteButtsCount",
    "cigaretteButtsMassKg",
    "cigaretteButtsVolumeLiters",
    "cigaretteButtsCondition",
    "cigaretteButtsKg",
    "cigaretteButts",
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
  let nextCigaretteButtsMeasurements =
    currentMetadata.cigaretteButtsMeasurements ?? null;
  if (hasButtsMeasurementUpdate) {
    const currentMeasurements = currentMetadata.cigaretteButtsMeasurements;
    nextCigaretteButtsMeasurements = normalizeCigaretteButtsMeasurementsFromUserInput(
      body.cigaretteButtsMeasurements !== undefined
        ? body.cigaretteButtsMeasurements === null
          ? {}
          : body.cigaretteButtsMeasurements
        : {
            cigaretteButtsCount:
              body.cigaretteButtsCount !== undefined
                ? body.cigaretteButtsCount
                : body.cigaretteButts !== undefined
                  ? body.cigaretteButts
                  : currentMeasurements?.cigaretteButtsCount ??
                    current.cigarette_butts,
            cigaretteButtsMassKg:
              body.cigaretteButtsMassKg !== undefined
                ? body.cigaretteButtsMassKg
                : body.cigaretteButtsKg !== undefined
                  ? body.cigaretteButtsKg
                  : currentMeasurements?.cigaretteButtsMassKg ??
                    currentMetadata.cigaretteButtsKg,
            cigaretteButtsVolumeLiters:
              body.cigaretteButtsVolumeLiters !== undefined
                ? body.cigaretteButtsVolumeLiters
                : currentMeasurements?.cigaretteButtsVolumeLiters ?? null,
            cigaretteButtsCondition:
              body.cigaretteButtsCondition !== undefined
                ? body.cigaretteButtsCondition
                : currentMeasurements?.cigaretteButtsCondition ?? null,
          },
      body.cigaretteButtsMeasurements !== undefined
        ? { preserveExplicitNulls: true }
        : {
            explicitNullFields: [
              ...(body.cigaretteButtsCount === null || body.cigaretteButts === null
                ? ["cigaretteButtsCount" as const]
                : []),
              ...(body.cigaretteButtsMassKg === null || body.cigaretteButtsKg === null
                ? ["cigaretteButtsMassKg" as const]
                : []),
              ...(body.cigaretteButtsVolumeLiters === null
                ? ["cigaretteButtsVolumeLiters" as const]
                : []),
            ],
          },
    );
    updateData["cigarette_butts"] =
      nextCigaretteButtsMeasurements.cigaretteButtsCount;
  }

  const hasVolunteerParticipationUpdate = Object.prototype.hasOwnProperty.call(
    body,
    "volunteerParticipation",
  );
  const nextVolunteerParticipation = hasVolunteerParticipationUpdate
    ? body.volunteerParticipation === null || body.volunteerParticipation === undefined
      ? null
      : normalizeVolunteerParticipation(body.volunteerParticipation)
    : currentMetadata.volunteerParticipation;
  if (hasVolunteerParticipationUpdate || body.volunteersCount !== undefined) {
    updateData["volunteers_count"] = resolveParticipantsCount({
      volunteerParticipation: nextVolunteerParticipation,
      legacyVolunteersCount:
        body.volunteersCount ?? current.volunteers_count,
    });
  }
  if (body.durationMinutes !== undefined) {
    updateData["duration_minutes"] = body.durationMinutes;
  }
  if (body.eventStartTime !== undefined) {
    updateData["event_start_time"] = body.eventStartTime;
  }
  if (body.eventEndTime !== undefined) {
    updateData["event_end_time"] = body.eventEndTime;
  }
  if (body.organizerType !== undefined) {
    updateData["organizer_type"] = body.organizerType;
  }

  const shouldRefreshNotes = Object.entries(body).some(
    ([key, value]) =>
      key !== "actionPhase" &&
      key !== "preparationData" &&
      key !== "organizerType" &&
      key !== "departmentCode" &&
      key !== "departmentName" &&
      key !== "eventStartTime" &&
      key !== "eventEndTime" &&
      value !== undefined,
  );
  if (shouldRefreshNotes) {
    const persistedPayload = {
      associationName:
        body.associationName ?? currentMetadata.associationName ?? undefined,
      groupJoinEnabled:
        body.groupJoinEnabled ?? currentMetadata.groupJoinEnabled,
      departureLocationLabel:
        body.departureLocationLabel ??
        currentMetadata.departureLocationLabel ??
        undefined,
      arrivalLocationLabel:
        body.arrivalLocationLabel ??
        currentMetadata.arrivalLocationLabel ??
        undefined,
      routeStyle: body.routeStyle ?? currentMetadata.routeStyle ?? undefined,
      routeAdjustmentMessage:
        body.routeAdjustmentMessage ??
        currentMetadata.routeAdjustmentMessage ??
        undefined,
      notes: body.notes ?? currentMetadata.cleanNotes ?? undefined,
      placeType: body.placeType ?? currentMetadata.placeType ?? undefined,
      submissionMode:
        body.submissionMode ?? currentMetadata.submissionMode ?? undefined,
      wasteBreakdown:
        body.wasteBreakdown ?? currentMetadata.wasteBreakdown ?? undefined,
      wasteMeasurementMethod:
        body.wasteMeasurementMethod ??
        currentMetadata.wasteMeasurementMethod ??
        undefined,
      cigaretteButtsKg:
        hasButtsMeasurementUpdate
          ? nextCigaretteButtsMeasurements?.cigaretteButtsMassKg
          : body.cigaretteButtsKg !== undefined
            ? body.cigaretteButtsKg
            : currentMetadata.cigaretteButtsKg,
      cigaretteButtsMeasurements:
        hasButtsMeasurementUpdate
          ? nextCigaretteButtsMeasurements
          : currentMetadata.cigaretteButtsMeasurements,
      volunteerParticipation: nextVolunteerParticipation,
      cigaretteButtsMassKg:
        hasButtsMeasurementUpdate
          ? nextCigaretteButtsMeasurements?.cigaretteButtsMassKg
          : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsMassKg,
      cigaretteButtsVolumeLiters:
        hasButtsMeasurementUpdate
          ? nextCigaretteButtsMeasurements?.cigaretteButtsVolumeLiters
          : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsVolumeLiters,
      cigaretteButtsCondition:
        hasButtsMeasurementUpdate
          ? nextCigaretteButtsMeasurements?.cigaretteButtsCondition
          : currentMetadata.cigaretteButtsMeasurements?.cigaretteButtsCondition,
      photos:
        body.photos?.map((photo) => ({
          id: photo.id,
          name: photo.name,
          mimeType: photo.mimeType,
          size: photo.size,
          width: photo.width ?? null,
          height: photo.height ?? null,
        })) ?? currentMetadata.photos ?? undefined,
      visionEstimate:
        body.visionEstimate ?? currentMetadata.visionEstimate ?? undefined,
    } satisfies Parameters<typeof buildPersistedNotes>[0];
    updateData["notes"] = buildPersistedNotes(persistedPayload, {
      resolvedCigaretteButtsMeasurements:
        hasButtsMeasurementUpdate || currentMetadata.cigaretteButtsMeasurements
          ? nextCigaretteButtsMeasurements
          : undefined,
    });
  }

  return { body, currentMetadata, updateData };
}
