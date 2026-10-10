import type { ActionCigaretteButtsMeasurements } from "@/lib/waste/cigarette-butts";
import type {
  ActionGeometrySource,
  ActionPhase,
  ActionPreparationData,
  ActionStatus,
  ActionWasteMeasurementMethod,
  CreateActionPayload,
} from "@/lib/actions/types";
import type { ActionVolunteerParticipation } from "@/lib/actions/volunteer-participation";
import type { OrganizerType } from "@/lib/actions/organizer-type";
import type { ActionManualInvitationStatusRecord } from "@/lib/actions/participation/registration-records";
import { AppError } from "@/lib/errors/app-errors";
import { createActionError, parseErrorMessage, parseJsonSafely } from "./http-errors";

export type ActionPrefillResponse = {
  status: "ok";
  prefill: {
    actionDate: string;
    actorName: string;
    associationName: string | null;
    organizerType: OrganizerType | null;
    locationLabel: string | null;
    volunteersCount: number;
    durationMinutes: number;
  };
  basedOn: {
    recentDeclarations: number;
  };
};

export type ActionEditorRecord = {
  id: string;
  createdAt: string;
  status: ActionStatus;
  publishedAt?: string | null;
  actionPhase: ActionPhase;
  preparationData: ActionPreparationData | null;
  createdByClerkId: string | null;
  actorName: string | null;
  actionDate: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  wasteKg: number | null;
  cigaretteButtsMeasurements?: ActionCigaretteButtsMeasurements | null;
  cigaretteButtsMassKg?: number | null;
  cigaretteButtsVolumeLiters?: number | null;
  cigaretteButtsCondition?: import("@/lib/actions/types").ActionMegotsCondition | null;
  volunteerParticipation?: ActionVolunteerParticipation | null;
  cigaretteButtsKg?: number | null;
  cigaretteButts: number | null;
  volunteersCount: number;
  durationMinutes: number;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  notes: string | null;
  submissionMode: "quick" | "complete" | null;
  associationName: string | null;
  organizerType?: OrganizerType | null;
  organizerId?: string | null;
  organizerName?: string | null;
  organizerAccounts?: string[];
  groupJoinEnabled: boolean;
  participantAccounts: string[];
  manualInvitationStatuses?: ActionManualInvitationStatusRecord[];
  placeType: string | null;
  departureLocationLabel: string | null;
  arrivalLocationLabel: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  wasteBreakdown?: unknown;
  wasteMeasurementMethod?: ActionWasteMeasurementMethod | null;
  photos?: unknown;
  visionEstimate?: unknown;
  manualDrawing?: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  } | null;
  /** Canonical provenance of the geometry carried by manualDrawing. */
  geometrySource?: ActionGeometrySource | null;
  recordType?: string | null;
};

export type ActionEditorResponse = {
  status: "ok";
  action: ActionEditorRecord;
};

export async function fetchActionPrefill(): Promise<ActionPrefillResponse> {
  const response = await fetch("/api/actions/prefill", {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger le pre-remplissage."),
    );
  }
  if (!body || typeof body !== "object") {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour le pre-remplissage.",
    });
  }
  return body as ActionPrefillResponse;
}

export async function fetchActionById(
  actionId: string,
): Promise<ActionEditorRecord> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger l'action."),
    );
  }
  if (!body || typeof body !== "object" || !("action" in body)) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour l'action.",
    });
  }
  return (body as ActionEditorResponse).action;
}

export async function updateAction(
  actionId: string,
  payload: Partial<CreateActionPayload> & {
    actionPhase?: ActionPhase;
    preparationData?: ActionPreparationData | null;
  },
): Promise<{ actionId: string; actionPhase: ActionPhase | null }> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de mettre à jour l'action."),
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { actionId?: unknown }).actionId !== "string"
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète lors de la mise à jour.",
    });
  }
  return body as { actionId: string; actionPhase: ActionPhase | null };
}

export async function publishAction(actionId: string): Promise<{
  id: string;
  publishedAt: string;
  alreadyPublished: boolean;
}> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de publier cette action."),
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { id?: unknown }).id !== "string" ||
    typeof (body as { publishedAt?: unknown }).publishedAt !== "string"
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète lors de la publication.",
    });
  }
  return body as { id: string; publishedAt: string; alreadyPublished: boolean };
}
