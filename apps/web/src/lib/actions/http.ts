import type { ActionListResponse, ActionMapResponse, ActionStatus, CreateActionPayload } from "@/lib/actions/types";

type FetchActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
};

type FetchMapActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
};

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
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

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function buildActionsQueryString(params: FetchActionsParams = {}): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 200, 30)));
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  return query.toString();
}

export function buildMapActionsQueryString(params: FetchMapActionsParams = {}): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 300, 80)));
  query.set("days", String(clampInteger(params.days, 1, 3650, 30)));
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  return query.toString();
}

export async function createAction(payload: CreateActionPayload): Promise<{ id: string }> {
  const response = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Impossible de créer l'action."));
  }

  if (!body || typeof body !== "object" || typeof (body as { id?: unknown }).id !== "string") {
    throw new Error("Réponse API invalide après création.");
  }

  return { id: (body as { id: string }).id };
}

export async function fetchActions(params: FetchActionsParams = {}): Promise<ActionListResponse> {
  const query = buildActionsQueryString(params);
  const response = await fetch(`/api/actions?${query}`, { method: "GET", cache: "no-store" });
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Impossible de charger l'historique."));
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    throw new Error("Réponse API invalide pour l'historique.");
  }

  return body as ActionListResponse;
}

export async function fetchMapActions(params: FetchMapActionsParams = {}): Promise<ActionMapResponse> {
  const query = buildMapActionsQueryString(params);
  const response = await fetch(`/api/actions/map?${query}`, { method: "GET", cache: "no-store" });
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Impossible de charger les points cartographiques."));
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    throw new Error("Réponse API invalide pour la carte.");
  }

  return body as ActionMapResponse;
}
