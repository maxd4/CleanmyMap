import type {
  ActionImpactLevel,
  ActionListResponse,
  ActionPhase,
  ActionRecordType,
  ActionQualityGrade,
  ActionStatus,
  ActionPreparationData,
  CreateActionPayload,
} from "@/lib/actions/types";
import { AppError, type AppErrorKind, defaultMessageForKind } from "@/lib/errors/app-errors";
import { toContractCreatePayload } from "./data-contract";

export { buildMapActionsQueryString, fetchMapActions } from "./map-http";

type ActionTypeFilter = ActionRecordType | "all" | ActionRecordType[];

type FetchActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  types?: ActionTypeFilter;
  association?: string | "all";
  scopeKind?: string;
  scopeValue?: string | null;
  qualityGrade?: ActionQualityGrade;
  toFixPriority?: boolean;
  impact?: ActionImpactLevel;
};

function setScopeQueryParams(
  query: URLSearchParams,
  params: {
    association?: string | "all";
    scopeKind?: string;
    scopeValue?: string | null;
  },
): void {
  if (params.scopeKind && params.scopeKind !== "global") {
    query.set("scopeKind", params.scopeKind);
    if (typeof params.scopeValue === "string" && params.scopeValue.trim()) {
      query.set("scopeValue", params.scopeValue.trim());
    }
    return;
  }

  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    query.set("association", params.association.trim());
  }
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function kindFromStatus(status: number): AppErrorKind {
  if (status === 400 || status === 422) {
    return "validation";
  }
  if (status === 401 || status === 403) {
    return "permission";
  }
  if (status === 429) {
    return "network";
  }
  return "server";
}

function createActionError(
  response: Response,
  payload: unknown,
  fallback: string,
): AppError {
  const kind = kindFromStatus(response.status);
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  return new AppError({
    kind,
    message: parseErrorMessage(body, fallback || defaultMessageForKind(kind)),
    status: response.status,
    code: typeof body?.["code"] === "string" ? String(body["code"]) : undefined,
    referenceCode:
      typeof body?.["referenceCode"] === "string"
        ? String(body["referenceCode"])
        : undefined,
    retryable: kind === "network" || kind === "server",
    details:
      body?.["details"] && typeof body["details"] === "object"
        ? (body["details"] as Record<string, unknown>)
        : undefined,
  });
}

function serializeTypes(
  raw: ActionTypeFilter | undefined,
  fallback: ActionTypeFilter,
): string {
  const value = raw ?? fallback;
  if (value === "all") {
    return "all";
  }
  if (typeof value === "string") {
    return value;
  }
  const deduped = [...new Set(value)];
  if (deduped.length === 0) {
    return "all";
  }
  return deduped.join(",");
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type ActionCreationResponse = {
  id: string;
  retentionLoop?: {
    summary: string;
    badge: string;
    thanksMessage: string;
    share: { text: string; url: string };
    nextActionSuggestion: string;
  } | null;
};

function parseActionCreationResponse(body: unknown): ActionCreationResponse | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as { id?: unknown; retentionLoop?: ActionCreationResponse["retentionLoop"] };
  if (typeof candidate.id !== "string") {
    return null;
  }

  return {
    id: candidate.id,
    retentionLoop: candidate.retentionLoop ?? null,
  };
}

export async function createAction(
  payload: CreateActionPayload,
): Promise<{
  id: string;
  retentionLoop?: {
    summary: string;
    badge: string;
    thanksMessage: string;
    share: { text: string; url: string };
    nextActionSuggestion: string;
  } | null;
}> {
  const postPayload = async (bodyPayload: unknown) => {
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });
    const body = await parseJsonSafely(response);
    return { response, body };
  };

  const contractPayload = toContractCreatePayload(payload);
  const contractResult = await postPayload(contractPayload);
  const contractError = parseErrorMessage(contractResult.body, "Impossible de créer l'action.");

  if (!contractResult.response.ok) {
    if (contractResult.response.status === 400 || contractResult.response.status === 422) {
      const legacyResult = await postPayload(payload);
      const legacyBody = parseActionCreationResponse(legacyResult.body);
      if (legacyResult.response.ok && legacyBody) {
        return legacyBody;
      }

      throw createActionError(
        legacyResult.response,
        legacyResult.body,
        contractError || "Impossible de créer l'action.",
      );
    }

    throw createActionError(contractResult.response, contractResult.body, contractError);
  }

  const body = parseActionCreationResponse(contractResult.body);
  if (!body) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète après la création.",
    });
  }

  return body;
}

export function buildActionsQueryString(
  params: FetchActionsParams = {},
): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 200, 30)));
  if (typeof params.days === "number") {
    query.set("days", String(clampInteger(params.days, 1, 3650, 90)));
  }
  query.set("types", serializeTypes(params.types, "action"));
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  setScopeQueryParams(query, params);
  if (params.qualityGrade) {
    query.set("qualityGrade", params.qualityGrade);
  }
  if (typeof params.toFixPriority === "boolean") {
    query.set("toFixPriority", String(params.toFixPriority));
  }
  if (params.impact) {
    query.set("impact", params.impact);
  }
  return query.toString();
}

export async function fetchActions(
  params: FetchActionsParams = {},
): Promise<ActionListResponse> {
  const query = buildActionsQueryString(params);
  const response = await fetch(`/api/actions?${query}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger l'historique."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { items?: unknown }).items)
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour l'historique.",
    });
  }

  return body as ActionListResponse;
}

export type ActionPrefillResponse = {
  status: "ok";
  prefill: {
    actionDate: string;
    actorName: string;
    associationName: string | null;
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
  status: ActionStatus;
  actionPhase: ActionPhase;
  preparationData: ActionPreparationData | null;
  createdByClerkId: string | null;
  actorName: string | null;
  actionDate: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  notes: string | null;
  submissionMode: "quick" | "complete" | null;
  associationName: string | null;
  groupJoinEnabled: boolean;
  placeType: string | null;
  departureLocationLabel: string | null;
  arrivalLocationLabel: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  wasteBreakdown?: unknown;
  photos?: unknown;
  visionEstimate?: unknown;
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
