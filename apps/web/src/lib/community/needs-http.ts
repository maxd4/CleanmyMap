import type {
  ActionNeedActionSummary,
  ActionNeedItem,
  ActionNeedListResult,
} from "@/lib/community/action-needs-service";
import type { ActionNeedEffectiveStatus, CommunityHelpCategory } from "@/lib/community/action-needs";

export type CommunityNeedsResponse = ActionNeedListResult & { status: "ok" };

type NeedsFilters = {
  actionId?: string | null;
  category?: CommunityHelpCategory | null;
  effectiveStatus?: ActionNeedEffectiveStatus | null;
  limit?: number;
  offset?: number;
};

export type CreateActionNeedInput = {
  actionId: string;
  category: CommunityHelpCategory;
  title: string;
  description: string;
  quantityLabel?: string | null;
  expiresAt?: string | null;
};

export type UpdateActionNeedInput =
  | { operation: "update"; category?: CommunityHelpCategory; title?: string; description?: string; quantityLabel?: string | null; expiresAt?: string | null }
  | { operation: "fulfill" }
  | { operation: "cancel" };

function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return fallback;
}

async function requestNeeds<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new Error("Les besoins ne sont pas disponibles pour le moment.");
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The status below still provides the safe client error.
  }
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Les besoins ne sont pas disponibles pour le moment."));
  }
  return body as T;
}

export async function fetchCommunityNeeds(filters: NeedsFilters = {}): Promise<CommunityNeedsResponse> {
  const params = new URLSearchParams();
  if (filters.actionId) params.set("actionId", filters.actionId);
  if (filters.category) params.set("category", filters.category);
  if (filters.effectiveStatus) params.set("effectiveStatus", filters.effectiveStatus);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  const result = await requestNeeds<CommunityNeedsResponse>(`/api/community/needs?${params.toString()}`);
  if (result.status !== "ok" || !Array.isArray(result.items) || !Array.isArray(result.managerActions)) {
    throw new Error("La réponse des besoins est invalide.");
  }
  return result;
}

export async function createCommunityNeed(input: CreateActionNeedInput): Promise<ActionNeedItem> {
  const result = await requestNeeds<{ status: "created"; item: ActionNeedItem }>("/api/community/needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return result.item;
}

export async function updateCommunityNeed(needId: string, input: UpdateActionNeedInput): Promise<ActionNeedItem> {
  const result = await requestNeeds<{ status: "updated"; item: ActionNeedItem }>(
    `/api/community/needs/${encodeURIComponent(needId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return result.item;
}

export type { ActionNeedActionSummary, ActionNeedItem };
