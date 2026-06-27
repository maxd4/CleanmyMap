import type { SupabaseClient } from "@supabase/supabase-js";

type ActionQueryResult<TData = unknown> = {
  data: TData | null;
  error: { message: string } | null;
};

type ActionQueryTerminal = PromiseLike<ActionQueryResult<unknown>>;

export type ActionQuery = PromiseLike<ActionQueryResult<unknown>> & {
  select: (...args: unknown[]) => ActionQuery;
  eq: (...args: unknown[]) => ActionQuery;
  order: (...args: unknown[]) => ActionQuery;
  limit: (...args: unknown[]) => ActionQuery;
  in: (...args: unknown[]) => ActionQuery;
  neq: (...args: unknown[]) => ActionQuery;
  is: (...args: unknown[]) => ActionQuery;
  not: (...args: unknown[]) => ActionQuery;
  gte: (...args: unknown[]) => ActionQuery;
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
