import type { ChatUserOption, ParticipantPage } from "./action-participant-picker-model";

export async function fetchParticipantPage(
  endpoint: string,
  requestedQuery: string,
  offset: number,
  signal?: AbortSignal,
  includeCurrentUser = false,
): Promise<ParticipantPage> {
  const params = new URLSearchParams({ offset: String(offset) });
  if (requestedQuery) params.set("q", requestedQuery);
  if (includeCurrentUser) params.set("includeCurrentUser", "1");
  const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store", signal });
  const payload = (await response.json()) as
    | { users?: ChatUserOption[]; nextOffset?: number | null; hasMore?: boolean; error?: string }
    | null;
  if (!response.ok) throw new Error(payload?.error || "La recherche de membres a échoué.");
  return {
    items: deduplicateUsers(Array.isArray(payload?.users) ? payload.users : []),
    nextOffset: typeof payload?.nextOffset === "number" ? payload.nextOffset : null,
    hasMore: Boolean(payload?.hasMore),
  };
}

export function deduplicateUsers(users: ChatUserOption[]): ChatUserOption[] {
  return [...new Map(users.filter((item) => item?.id).map((item) => [item.id, item])).values()];
}
