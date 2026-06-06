import type { SupabaseClient } from "@supabase/supabase-js";

type ActionQueryBuilder = (query: any) => any;

function buildActionQuery(supabase: SupabaseClient) {
  return supabase.from("actions");
}

export async function runActionQuery<T>(
  supabase: SupabaseClient,
  configure: ActionQueryBuilder,
): Promise<T[]> {
  const result = await configure(buildActionQuery(supabase));

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as T[];
}

export async function runSingleActionQuery<T>(
  supabase: SupabaseClient,
  configure: ActionQueryBuilder,
): Promise<T | null> {
  const result = await configure(buildActionQuery(supabase));

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? null) as T | null;
}
