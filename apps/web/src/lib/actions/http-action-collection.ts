import type {
  ActionImpactLevel,
  ActionListResponse,
  ActionQualityGrade,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import { AppError } from "@/lib/errors/app-errors";
import { toContractCreatePayload } from "./contracts/contract-builders";
import {
  clampInteger,
  serializeTypes,
  setScopeQueryParams,
  type ActionTypeFilter,
} from "./map/map-http-utils";
import {
  createActionError,
  parseErrorMessage,
  parseJsonSafely,
} from "./http-errors";

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
  futureOnly?: boolean;
};

type ActionCreationResponse = {
  id: string;
  retentionLoop?: {
    summary: string;
    badge: string | null;
    xpAwarded: number;
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
    badge: string | null;
    xpAwarded: number;
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
  if (params.futureOnly) {
    query.set("view", "future");
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
