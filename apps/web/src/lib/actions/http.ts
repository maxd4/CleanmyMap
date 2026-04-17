import type {
  ActionImpactLevel,
  ActionListResponse,
  ActionMapResponse,
  ActionQualityGrade,
  ActionRecordType,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import { toContractCreatePayload } from "./data-contract";

type ActionTypeFilter = ActionRecordType | "all" | ActionRecordType[];

type FetchActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  types?: ActionTypeFilter;
  association?: string | "all";
  qualityGrade?: ActionQualityGrade;
  toFixPriority?: boolean;
  impact?: ActionImpactLevel;
};

type FetchMapActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  types?: ActionTypeFilter;
  association?: string | "all";
  impact?: ActionImpactLevel;
  qualityMin?: number;
};

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
  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    query.set("association", params.association.trim());
  }
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

export function buildMapActionsQueryString(
  params: FetchMapActionsParams = {},
): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 300, 80)));
  query.set("days", String(clampInteger(params.days, 1, 3650, 30)));
  query.set("types", serializeTypes(params.types, "all"));
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    query.set("association", params.association.trim());
  }
  if (params.impact) {
    query.set("impact", params.impact);
  }
  if (
    typeof params.qualityMin === "number" &&
    Number.isFinite(params.qualityMin)
  ) {
    query.set(
      "qualityMin",
      String(Math.max(0, Math.min(100, Math.round(params.qualityMin)))),
    );
  }
  return query.toString();
}

export async function createAction(
  payload: CreateActionPayload,
): Promise<{ id: string }> {
  const contractPayload = toContractCreatePayload(payload);
  const response = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contractPayload),
  });

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Impossible de créer l'action."));
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Réponse API invalide après création.");
  }

  return { id: (body as { id: string }).id };
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
    throw new Error(
      parseErrorMessage(body, "Impossible de charger l'historique."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { items?: unknown }).items)
  ) {
    throw new Error("Réponse API invalide pour l'historique.");
  }

  return body as ActionListResponse;
}

export async function fetchMapActions(
  params: FetchMapActionsParams = {},
): Promise<ActionMapResponse> {
  const query = buildMapActionsQueryString(params);
  const response = await fetch(`/api/actions/map?${query}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(
        body,
        "Impossible de charger les points cartographiques.",
      ),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { items?: unknown }).items)
  ) {
    throw new Error("Réponse API invalide pour la carte.");
  }

  return body as ActionMapResponse;
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

export async function fetchActionPrefill(): Promise<ActionPrefillResponse> {
  const response = await fetch("/api/actions/prefill", {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(
      parseErrorMessage(body, "Impossible de charger le pre-remplissage."),
    );
  }
  if (!body || typeof body !== "object") {
    throw new Error("Reponse API invalide pour le pre-remplissage.");
  }
  return body as ActionPrefillResponse;
}
