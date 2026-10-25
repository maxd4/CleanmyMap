export function escapePostgrestLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type ChatSupabaseError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type ChatSupabaseResult = {
  data: unknown;
  error: ChatSupabaseError | null;
  count: number | null;
};

export function isChatRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function parseChatSupabaseError(value: unknown): ChatSupabaseError | null {
  if (value === null || value === undefined) return null;
  if (!isChatRecord(value) || typeof value.message !== "string") {
    return { message: "La réponse Supabase du Chat est invalide." };
  }
  return {
    message: value.message,
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(typeof value.details === "string" ? { details: value.details } : {}),
    ...(typeof value.hint === "string" ? { hint: value.hint } : {}),
  };
}

export function parseChatSupabaseResult(value: unknown): ChatSupabaseResult {
  if (!isChatRecord(value) || (!('data' in value) && !('error' in value))) {
    return {
      data: null,
      error: { message: "La réponse Supabase du Chat est invalide." },
      count: null,
    };
  }
  return {
    data: "data" in value ? value.data : null,
    error: parseChatSupabaseError("error" in value ? value.error : null),
    count: typeof value.count === "number" ? value.count : null,
  };
}

export function parseChatSingleRow<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
): T | null {
  const candidate = isUnknownArray(data) ? data[0] : data;
  if (candidate === null || candidate === undefined) return null;
  return guard(candidate) ? candidate : null;
}

export function parseChatRows<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
): T[] | null {
  if (!isUnknownArray(data) || !data.every(guard)) return null;
  return data;
}

export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

export function mergeRowGroupsById<T extends { id: string }>(groups: T[][]): T[] {
  return dedupeById(groups.flat());
}

export function sortByCreatedAtAsc<T extends { id: string; created_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const timeDelta = Date.parse(left.created_at) - Date.parse(right.created_at);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.id.localeCompare(right.id);
  });
}
