import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseActionSupabaseResult } from "@/lib/actions/query";

export async function runActionRemindersJob(params: { now?: Date } = {}): Promise<{
  status: "delivered";
  insertedCount: number;
}> {
  const now = params.now ?? new Date();
  const rawResult: unknown = await getSupabaseServerClient(true).rpc(
    "emit_action_j1_reminders",
    { p_now: now.toISOString() },
  );
  const result = parseActionSupabaseResult(rawResult);

  if (result.error) throw result.error;

  return {
    status: "delivered",
    insertedCount: typeof result.data === "number" ? result.data : Number(result.data ?? 0),
  };
}
