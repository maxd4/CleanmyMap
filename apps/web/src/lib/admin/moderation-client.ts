import type {
  ActionDrawing,
  ActionSubmissionMode,
  ActionWasteBreakdown,
} from "@/lib/actions/types";

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
    const apiMessage = parseApiErrorMessage(body, "Moderation impossible.");
    const hint = parseApiHint(body);
    const operationId = parseOperationId(body);
    if (response.status === 400 || response.status === 409) {
      throw new ModerationClientError({
        code: "invalid_payload",
        message: apiMessage,
        status: response.status,
        hint,
        operationId,
      });
    }
    if (response.status === 401 || response.status === 403) {
      throw new ModerationClientError({
        code: "permission_denied",
        message: apiMessage,
        status: response.status,
        hint,
        operationId,
      });
    }
    if (response.status === 404) {
      throw new ModerationClientError({
        code: "not_found",
        message: apiMessage,
        status: response.status,
        hint,
        operationId,
      });
    }
    throw new ModerationClientError({
      code: "server_error",
      message: apiMessage,
      status: response.status,
      hint,
      operationId,
    });
  }

  if (!body || typeof body !== "object") {
    throw new ModerationClientError({
      code: "server_error",
      message: "Reponse moderation invalide.",
    });
  }

  const normalized = body as Record<string, unknown>;
  if (
    normalized["status"] !== "ok" ||
    typeof normalized["entityType"] !== "string" ||
    typeof normalized["id"] !== "string"
  ) {
    throw new ModerationClientError({
      code: "server_error",
      message: "Reponse moderation incomplete.",
    });
  }

  return {
    status: "ok",
    entityType: normalized["entityType"] as ModerationEntityType,
    id: normalized["id"],
    sourceTable:
      typeof normalized["sourceTable"] === "string"
        ? normalized["sourceTable"]
        : undefined,
    copiedToLocalValidatedStore:
      typeof normalized["copiedToLocalValidatedStore"] === "boolean"
        ? normalized["copiedToLocalValidatedStore"]
        : undefined,
    operationId:
      typeof normalized["operationId"] === "string"
        ? normalized["operationId"]
        : undefined,
  };
}
