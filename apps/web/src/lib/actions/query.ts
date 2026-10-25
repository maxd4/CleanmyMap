import type { SupabaseClient } from "@supabase/supabase-js";

type ActionQueryResult<TData = unknown> = {
  data: TData | null;
  error: { message: string } | null;
};

export class ActionSupabaseError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(
    message: string,
    metadata: {
      code?: string;
      details?: string;
      hint?: string;
    } = {},
  ) {
    super(message);
    this.name = "ActionSupabaseError";
    this.code = metadata.code;
    this.details = metadata.details;
    this.hint = metadata.hint;
  }
}

export type ActionSupabaseResult = {
  data: unknown;
  error: ActionSupabaseError | null;
  count: number | null;
};

export function isActionRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseActionSupabaseError(value: unknown): ActionSupabaseError | null {
  if (value === null || value === undefined) return null;
  if (!isActionRecord(value) || typeof value.message !== "string") {
    return new ActionSupabaseError("La réponse Supabase est invalide.");
  }
  return new ActionSupabaseError(value.message, {
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(typeof value.details === "string" ? { details: value.details } : {}),
    ...(typeof value.hint === "string" ? { hint: value.hint } : {}),
  });
}

export function parseActionSupabaseResult(value: unknown): ActionSupabaseResult {
  if (!isActionRecord(value) || (!("data" in value) && !("error" in value))) {
    return {
      data: null,
      error: new ActionSupabaseError("La réponse Supabase est invalide."),
      count: null,
    };
  }
  return {
    data: "data" in value ? value.data : null,
    error: parseActionSupabaseError("error" in value ? value.error : null),
    count: typeof value.count === "number" ? value.count : null,
  };
}

export function parseActionSingleRow<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
): T | null {
  const candidate = isUnknownArray(data) ? data[0] : data;
  if (candidate === null || candidate === undefined) return null;
  return guard(candidate) ? candidate : null;
}

export function parseActionRows<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
): T[] | null {
  if (!Array.isArray(data) || !data.every(guard)) return null;
  return data;
}

type ActionQueryTerminal = PromiseLike<ActionQueryResult<unknown>>;

export type ActionQuery = PromiseLike<ActionQueryResult<unknown>> & {
  select: (...args: unknown[]) => ActionQuery;
  eq: (...args: unknown[]) => ActionQuery;
  or: (...args: unknown[]) => ActionQuery;
  order: (...args: unknown[]) => ActionQuery;
  limit: (...args: unknown[]) => ActionQuery;
  in: (...args: unknown[]) => ActionQuery;
  neq: (...args: unknown[]) => ActionQuery;
  is: (...args: unknown[]) => ActionQuery;
  not: (...args: unknown[]) => ActionQuery;
  range: (...args: unknown[]) => ActionQuery;
  gte: (...args: unknown[]) => ActionQuery;
  lte: (...args: unknown[]) => ActionQuery;
  lt: (...args: unknown[]) => ActionQuery;
  maybeSingle: () => ActionQueryTerminal;
};

type ActionQueryBuilder = (query: ActionQuery) => ActionQueryTerminal;

function buildActionQuery(supabase: SupabaseClient) {
  return supabase.from("actions") as unknown as ActionQuery;
}

export async function runActionQuery<T>(
  supabase: SupabaseClient,
  configure: ActionQueryBuilder,
): Promise<T[]> {
  const result = await configure(buildActionQuery(supabase));
  const typedResult = result as ActionQueryResult<T[]>;

  if (typedResult.error) {
    throw new Error(typedResult.error.message);
  }

  return typedResult.data ?? [];
}

export async function runSingleActionQuery<T>(
  supabase: SupabaseClient,
  configure: ActionQueryBuilder,
): Promise<T | null> {
  const result = await configure(buildActionQuery(supabase));
  const typedResult = result as ActionQueryResult<T>;

  if (typedResult.error) {
    throw new Error(typedResult.error.message);
  }

  return typedResult.data ?? null;
}
