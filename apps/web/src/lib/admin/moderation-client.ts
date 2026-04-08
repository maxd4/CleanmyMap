export type ModerationEntityType = "action" | "clean_place";
export type ModerationActionStatus = "pending" | "approved" | "rejected";
export type ModerationCleanPlaceStatus = "new" | "validated" | "cleaned";

export type ModerationPayload =
  | { entityType: "action"; id: string; status: ModerationActionStatus }
  | { entityType: "clean_place"; id: string; status: ModerationCleanPlaceStatus };

export type ModerationSuccessResponse = {
  status: "ok";
  entityType: ModerationEntityType;
  id: string;
  sourceTable?: string;
  copiedToLocalValidatedStore?: boolean;
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

  constructor(code: ModerationClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ModerationClientError";
    this.code = code;
    this.status = status;
  }
}

function parseApiErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const error = (value as { error?: unknown }).error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
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

export async function postAdminModeration(payload: ModerationPayload): Promise<ModerationSuccessResponse> {
  let response: Response;
  try {
    response = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ModerationClientError(
      "network_error",
      "Reseau indisponible: impossible de contacter /api/admin/moderation.",
    );
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    const apiMessage = parseApiErrorMessage(body, "Moderation impossible.");
    if (response.status === 400) {
      throw new ModerationClientError("invalid_payload", apiMessage, response.status);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ModerationClientError("permission_denied", apiMessage, response.status);
    }
    if (response.status === 404) {
      throw new ModerationClientError("not_found", apiMessage, response.status);
    }
    throw new ModerationClientError("server_error", apiMessage, response.status);
  }

  if (!body || typeof body !== "object") {
    throw new ModerationClientError("server_error", "Reponse moderation invalide.");
  }

  const normalized = body as Record<string, unknown>;
  if (normalized.status !== "ok" || typeof normalized.entityType !== "string" || typeof normalized.id !== "string") {
    throw new ModerationClientError("server_error", "Reponse moderation incomplete.");
  }

  return {
    status: "ok",
    entityType: normalized.entityType as ModerationEntityType,
    id: normalized.id,
    sourceTable: typeof normalized.sourceTable === "string" ? normalized.sourceTable : undefined,
    copiedToLocalValidatedStore:
      typeof normalized.copiedToLocalValidatedStore === "boolean" ? normalized.copiedToLocalValidatedStore : undefined,
  };
}
