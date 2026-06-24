import type { SupabaseClient } from "@supabase/supabase-js";

type ActionQueryResult<TData = unknown> = {
  data: TData | null;
  error: { message: string } | null;
};

export type ActionQuery = {
  select: (...args: unknown[]) => any;
  eq: (...args: unknown[]) => any;
  order: (...args: unknown[]) => any;
  limit: (...args: unknown[]) => any;
  in: (...args: unknown[]) => any;
  neq: (...args: unknown[]) => any;
  is: (...args: unknown[]) => any;
  gte: (...args: unknown[]) => any;
  maybeSingle: (...args: unknown[]) => Promise<ActionQueryResult>;
};

type ActionQueryBuilder = (query: ActionQuery) => unknown;

function buildActionQuery(supabase: SupabaseClient) {
  return supabase.from("actions") as unknown as ActionQuery;
}

export async function runActionQuery<T>(
  supabase: SupabaseClient,
  configure: ActionQueryBuilder,
): Promise<T[]> {
  const result = await configure(buildActionQuery(supabase));

  const typedResult = result as ActionQueryResult<T>;

  if (typedResult.error) {
    throw new Error(typedResult.error.message);
  }

  return (typedResult.data ?? []) as T[];
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

  return (typedResult.data ?? null) as T | null;
}
