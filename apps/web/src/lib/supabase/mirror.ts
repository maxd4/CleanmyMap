import type { SupabaseClient } from "@supabase/supabase-js";
import { canUseSupabaseServerPersistence } from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function resolveAdminClient(): SupabaseClient | null {
  if (!canUseSupabaseServerPersistence()) {
    return null;
  }

  try {
    return getSupabaseServerClient(true);
  } catch {
    return null;
  }
}

export async function upsertSupabaseMirror(
  table: string,
  row: Record<string, unknown>,
): Promise<boolean> {
  const client = resolveAdminClient();
  if (!client) {
    return false;
  }

  const result = await client.from(table).upsert(row, { onConflict: "id" });
  if (result.error) {
    throw result.error;
  }

  return true;
}

export async function deleteSupabaseMirror(
  table: string,
  id: string,
): Promise<boolean> {
  const client = resolveAdminClient();
  if (!client) {
    return false;
  }

  const result = await client.from(table).delete().eq("id", id);
  if (result.error) {
    throw result.error;
  }

  return true;
}
