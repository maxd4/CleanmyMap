import type { ActionRow } from "@/types/database";
import type { ActionMetadata, ActionUpdateInput } from "./action-update-audit";
import { extractActionMetadataFromNotes } from "./metadata";
import { getTimeContractValidationMessage } from "./time-contract";
import {
  hasPendingAdministrativeRequirements,
  prepareActionUpdateBody,
} from "./action-update-preparation";
import { buildActionUpdateFields } from "./action-update-fields";
import { buildActionUpdateMeasurements } from "./action-update-measurements";
import {
  buildActionUpdateNotes,
  preserveManualDrawing,
} from "./action-update-notes";
import { preserveGpxObservation } from "./action-update-geometry";

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

  if (hasPendingAdministrativeRequirements(current, body)) {
    throw new ActionUpdateValidationError(
      "preparationData",
      "Les démarches administratives doivent être validées avant le démarrage de l'action.",
    );
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

  const notes = buildActionUpdateNotes({
    body,
    currentMetadata,
    hasButtsMeasurementUpdate: measurements.hasButtsMeasurementUpdate,
    nextCigaretteButtsMeasurements: measurements.nextCigaretteButtsMeasurements,
    nextVolunteerParticipation: measurements.nextVolunteerParticipation,
  });
  if (notes !== undefined) {
    updateData["notes"] = preserveManualDrawing(current.notes, notes);
  }

  preserveGpxObservation(current, updateData);
  return { body, currentMetadata, updateData };
}
