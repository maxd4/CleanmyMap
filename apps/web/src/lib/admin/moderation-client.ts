import type {
  ActionDrawing,
  ActionSubmissionMode,
  ActionWasteBreakdown,
} from "@/lib/actions/types";
import {
  dispatchActionPollutionScoreReferencesInvalidated,
} from "@/lib/actions/pollution-score-references-events";

export type ModerationEntityType = "action" | "clean_place";
export type ModerationActionStatus = "pending" | "approved" | "rejected";
export type ModerationCleanPlaceStatus = "new" | "validated" | "cleaned";

export type AdminActionEditPayload = {
  actorName?: string | null;
  associationName?: string | null;
  actionDate?: string;
  locationLabel?: string;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
  routeAdjustmentMessage?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  wasteKg?: number;
  cigaretteButts?: number;
  volunteersCount?: number;
  durationMinutes?: number;
  notes?: string | null;
  placeType?: string | null;
  submissionMode?: ActionSubmissionMode | null;
  wasteBreakdown?: ActionWasteBreakdown | null;
  manualDrawing?: ActionDrawing | null;
};

export type AdminCleanPlaceEditPayload = {
  label?: string;
  wasteType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

export type ModerationPayload =
  | {
      entityType: "action";
      id: string;
      status: ModerationActionStatus;
      confirmPhrase: string;
      edits?: AdminActionEditPayload;
    }
  | {
      entityType: "clean_place";
      id: string;
      status: ModerationCleanPlaceStatus;
      confirmPhrase: string;
      edits?: AdminCleanPlaceEditPayload;
    };

export type ModerationSuccessResponse = {
  status: "ok";
  entityType: ModerationEntityType;
  id: string;
  sourceTable?: string;
  copiedToLocalValidatedStore?: boolean;
  operationId?: string;
};

export type ModerationClientErrorCode =
  | "invalid_payload"
  | "permission_denied"
  | "not_found"
  | "network_error"
  | "server_error";

export class ModerationClientError extends Error {
  readonly code: ModerationClientErrorCode;
  readonly status?: number;
  readonly hint?: string;
  readonly operationId?: string;

  constructor(params: {
    code: ModerationClientErrorCode;
    message: string;
    status?: number;
    hint?: string;
    operationId?: string;
  }) {
    super(params.message);
    this.name = "ModerationClientError";
    this.code = params.code;
    this.status = params.status;
    this.hint = params.hint;
    this.operationId = params.operationId;
  }
}

function parseApiErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  const error = record["error"];
  const message = record["message"];
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  return fallback;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseApiHint(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const hint = (value as Record<string, unknown>)["hint"];
  return typeof hint === "string" && hint.trim().length > 0 ? hint : undefined;
}

function parseOperationId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const operationId = (value as Record<string, unknown>)["operationId"];
  return typeof operationId === "string" && operationId.trim().length > 0
    ? operationId
    : undefined;
}

function throwModerationResponseError(
  status: number,
  message: string,
  hint?: string,
  operationId?: string,
): never {
  switch (status) {
    case 400:
    case 409:
      throw new ModerationClientError({
        code: "invalid_payload",
        message,
        status,
        hint,
        operationId,
      });
    case 401:
    case 403:
      throw new ModerationClientError({
        code: "permission_denied",
        message,
        status,
        hint,
        operationId,
      });
    case 404:
      throw new ModerationClientError({
        code: "not_found",
        message,
        status,
        hint,
        operationId,
      });
    default:
      throw new ModerationClientError({
        code: "server_error",
        message,
        status,
        hint,
        operationId,
      });
  }
}

function isModerationSuccessBody(
  value: unknown,
): value is {
  status: "ok";
  entityType: ModerationEntityType;
  id: string;
  sourceTable?: unknown;
  copiedToLocalValidatedStore?: unknown;
  operationId?: unknown;
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const normalized = value as Record<string, unknown>;
  return (
    normalized["status"] === "ok" &&
    typeof normalized["entityType"] === "string" &&
    typeof normalized["id"] === "string"
  );
}

function buildModerationSuccessResponse(
  value: {
    status: "ok";
    entityType: ModerationEntityType;
    id: string;
    sourceTable?: unknown;
    copiedToLocalValidatedStore?: unknown;
    operationId?: unknown;
  },
): ModerationSuccessResponse {
  return {
    status: "ok",
    entityType: value.entityType,
    id: value.id,
    sourceTable:
      typeof value.sourceTable === "string" ? value.sourceTable : undefined,
    copiedToLocalValidatedStore:
      typeof value.copiedToLocalValidatedStore === "boolean"
        ? value.copiedToLocalValidatedStore
        : undefined,
    operationId:
      typeof value.operationId === "string" ? value.operationId : undefined,
  };
}

export async function postAdminModeration(
  payload: ModerationPayload,
): Promise<ModerationSuccessResponse> {
  let response: Response;
  try {
    response = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ModerationClientError({
      code: "network_error",
      message:
        "Reseau indisponible: impossible de contacter /api/admin/moderation.",
    });
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throwModerationResponseError(
      response.status,
      parseApiErrorMessage(body, "Moderation impossible."),
      parseApiHint(body),
      parseOperationId(body),
    );
  }

  if (!isModerationSuccessBody(body)) {
    throw new ModerationClientError({
      code: "server_error",
      message: !body || typeof body !== "object"
        ? "Reponse moderation invalide."
        : "Reponse moderation incomplete.",
    });
  }

  if (payload.entityType === "action" && payload.status === "approved") {
    dispatchActionPollutionScoreReferencesInvalidated();
  }

  return buildModerationSuccessResponse(body);
}
