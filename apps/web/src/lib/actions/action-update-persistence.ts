import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import { extractActionMetadataFromNotes } from "./metadata";
import { isActionDateInFuture } from "./temporal";
import { getTimeContractValidationMessage } from "./time-contract";
import { prepareActionUpdateBody } from "./action-update-preparation";
import { buildActionUpdateFields, getExplicitDrawing } from "./action-update-fields";
import { buildActionUpdateMeasurements } from "./action-update-measurements";
import {
  buildActionUpdateNotes,
  preserveManualDrawing,
} from "./action-update-notes";
import { preserveObservedRouteGeometry } from "./action-update-geometry";
import {
  geometryRepresentativeCoordinates,
  getAcceptedActionDrawing,
  isManualDrawingReplacementBlocked,
} from "./action-observed-geometry";
import {
  getVolunteerActionCompositionValidationMessage,
  getVolunteerForecastValidationMessage,
} from "./volunteer-participation";
import { resolveActionContext } from "./action-context";

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

function buildActionContextUpdate(params: {
  current: ActionRow;
  body: ActionUpdateInput;
  nextActionPhase: ActionRow["action_phase"];
  nextParticipation: ReturnType<typeof buildActionUpdateMeasurements>["nextVolunteerParticipation"];
  nextVolunteersCount: number | null;
  userId?: string;
}): Record<string, unknown> {
  const { current, body, nextActionPhase, nextParticipation, nextVolunteersCount, userId } = params;
  const preparationContextProvided =
    body.preparationData !== undefined &&
    Object.prototype.hasOwnProperty.call(body.preparationData ?? {}, "actionContextSelection");
  const explicitContextProvided =
    Object.prototype.hasOwnProperty.call(body, "actionContext") || preparationContextProvided;
  const explicitContext =
    body.actionContext !== undefined
      ? body.actionContext
      : preparationContextProvided
        ? body.preparationData?.actionContextSelection
        : undefined;
  const participationChanged =
    body.volunteersCount !== undefined || body.volunteerParticipation !== undefined;
  const shouldResolve =
    explicitContextProvided ||
    (nextActionPhase === "post_action_complete" &&
      (current.action_phase !== "post_action_complete" || participationChanged));

  if (!shouldResolve) return {};
  if (!explicitContextProvided && current.action_context_source === "explicit") return {};

  const classification =
    nextActionPhase === "pre_action" && explicitContext === null
      ? { context: null, source: null }
      : nextActionPhase === "pre_action" && explicitContext === undefined
        ? { context: null, source: null }
        : resolveActionContext({
            composition: {
              volunteersCount: nextVolunteersCount,
              childrenCount: nextParticipation?.childrenCount,
              retiredCount: nextParticipation?.retiredCount,
            },
            explicitContext,
          });
  const explicitSchool = classification.source === "explicit" && classification.context === "school";
  return {
    action_context: classification.context,
    action_context_source: classification.source,
    school_context_confirmed: explicitSchool ? true : null,
    school_context_confirmed_at: explicitSchool ? new Date().toISOString() : null,
    school_context_confirmed_by_clerk_id:
      explicitSchool ? userId ?? current.created_by_clerk_id : null,
  };
}

function isNewFinalization(
  current: ActionRow,
  nextActionPhase: ActionRow["action_phase"],
): boolean {
  return (
    nextActionPhase === "post_action_complete" &&
    current.action_phase !== "post_action_complete"
  );
}

function isBoundedCoordinatePair(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validateEffectiveActionDate(
  current: ActionRow,
  body: ActionUpdateInput,
  nextActionPhase: ActionRow["action_phase"],
): void {
  const isCompletedActionDateChange =
    current.action_phase === "post_action_complete" &&
    body.actionDate !== undefined;
  if (
    (isNewFinalization(current, nextActionPhase) || isCompletedActionDateChange) &&
    isActionDateInFuture(body.actionDate ?? current.action_date)
  ) {
    throw new ActionUpdateValidationError(
      "actionDate",
      "Une déclaration finale doit concerner une date déjà passée ou aujourd’hui.",
    );
  }
}

function validateEffectiveActionCoordinates(
  current: ActionRow,
  body: ActionUpdateInput,
): void {
  const representative = geometryRepresentativeCoordinates(
    getAcceptedActionDrawing({
      current,
      drawing: getExplicitDrawing(body),
      source: body.geometrySource,
    }),
  );
  const hasCoordinatePatch = body.latitude !== undefined || body.longitude !== undefined;
  if (!hasCoordinatePatch && !representative) return;

  const nextLatitude = representative?.latitude ?? body.latitude ?? current.latitude;
  const nextLongitude = representative?.longitude ?? body.longitude ?? current.longitude;
  if (!isBoundedCoordinatePair(nextLatitude, nextLongitude)) {
    throw new ActionUpdateValidationError(
      "latitude",
      "Une latitude et une longitude valides doivent être renseignées ensemble.",
    );
  }
}

export async function persistActionUpdate(params: {
  supabase: SupabaseClient;
  actionId: string;
  updateData: Record<string, unknown>;
}): Promise<{ succeeded: boolean; revision: string | null }> {
  if (Object.keys(params.updateData).length === 0) {
    return { succeeded: false, revision: null };
  }
  const updateResult = await params.supabase
    .from("actions")
    .update(params.updateData)
    .eq("id", params.actionId)
    .select("id, updated_at")
    .single();
  if (updateResult.error) throw new Error("Action update failed");
  return {
    succeeded: Boolean(updateResult.data),
    revision: typeof updateResult.data?.updated_at === "string" ? updateResult.data.updated_at : null,
  };
}

export async function prepareActionUpdate(params: {
  current: ActionRow;
  parsedBody: ActionUpdateInput;
  userId?: string;
}): Promise<PreparedActionUpdate> {
  const { current, parsedBody, userId } = params;
  let body: ActionUpdateInput;
  try {
    body = prepareActionUpdateBody(current, parsedBody);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Le contexte historique de calibration ne peut pas être réécrit."
    ) {
      throw new ActionUpdateValidationError("preparationData", error.message);
    }
    throw error;
  }

  const nextActionPhase = body.actionPhase ?? current.action_phase;
  const submittedDrawing = getExplicitDrawing(body);
  if (
    submittedDrawing &&
    isManualDrawingReplacementBlocked(current, body.geometrySource)
  ) {
    throw new ActionUpdateValidationError(
      "manualDrawing",
      "Un dessin manuel ne peut pas remplacer un tracé GPX ou GPS déjà observé.",
    );
  }
  validateEffectiveActionDate(current, body, nextActionPhase);
  validateEffectiveActionCoordinates(current, body);
  if (body.accessMode === "invite_link" && nextActionPhase !== "pre_action") {
    throw new ActionUpdateValidationError(
      "accessMode",
      "Le mode privé sur invitation est réservé aux pré-actions.",
    );
  }
  if (nextActionPhase === "pre_action" && body.preparationData) {
    const volunteerForecastMessage = getVolunteerForecastValidationMessage({
      volunteersExpected: body.preparationData.volunteersExpected,
      volunteerParticipation: body.preparationData.volunteerParticipation,
    });
    if (volunteerForecastMessage) {
      throw new ActionUpdateValidationError(
        "preparationData",
        volunteerForecastMessage,
      );
    }
  }

  const currentMetadata = extractActionMetadataFromNotes(current.notes);
  const isFinalization = isNewFinalization(current, nextActionPhase);
  const isParticipantSubmission =
    nextActionPhase === "post_action_complete" &&
    (body.volunteersCount !== undefined ||
      body.volunteerParticipation !== undefined);
  if (isFinalization || isParticipantSubmission) {
    const participation =
      isFinalization
        ? body.volunteerParticipation
        : body.volunteerParticipation !== undefined
        ? body.volunteerParticipation
        : currentMetadata.volunteerParticipation;
    const compositionMessage = getVolunteerActionCompositionValidationMessage({
      volunteersCount: isFinalization
        ? body.volunteersCount ?? null
        : body.volunteersCount ?? current.volunteers_count,
      childrenCount: participation?.childrenCount ?? null,
      retiredCount: participation?.retiredCount ?? null,
    });
    if (compositionMessage) {
      throw new ActionUpdateValidationError(
        "volunteerParticipation",
        compositionMessage,
      );
    }
  }
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
      body.eventEndTime !== undefined ? body.eventEndTime : current.event_end_time,
  });
  if (temporalMessage) {
    throw new ActionUpdateValidationError("eventStartTime", temporalMessage);
  }

  const updateData = await buildActionUpdateFields({ current, body });
  const measurements = buildActionUpdateMeasurements({
    current,
    body,
    currentMetadata,
  });
  Object.assign(updateData, measurements.updateData);
  Object.assign(
    updateData,
    buildActionContextUpdate({
      current,
      body,
      nextActionPhase,
      nextParticipation: measurements.nextVolunteerParticipation,
      nextVolunteersCount:
        typeof measurements.updateData.volunteers_count === "number"
          ? measurements.updateData.volunteers_count
          : current.volunteers_count,
      userId,
    }),
  );

  const notes = buildActionUpdateNotes({
    body,
    currentMetadata,
    hasButtsMeasurementUpdate: measurements.hasButtsMeasurementUpdate,
    nextCigaretteButtsMeasurements: measurements.nextCigaretteButtsMeasurements,
    nextVolunteerParticipation: measurements.nextVolunteerParticipation,
  });
  if (notes !== undefined) {
    const replacementDrawing = getAcceptedActionDrawing({
      current,
      drawing: submittedDrawing,
      source: body.geometrySource,
    }) ?? undefined;
    updateData["notes"] = preserveManualDrawing(
      current.notes,
      notes,
      replacementDrawing,
    );
  }

  preserveObservedRouteGeometry(current, updateData);
  return { body, currentMetadata, updateData };
}
