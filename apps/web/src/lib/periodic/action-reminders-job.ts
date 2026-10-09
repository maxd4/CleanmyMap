import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function runActionRemindersJob(params: { now?: Date } = {}): Promise<{
  status: "delivered";
  insertedCount: number;
}> {
  const now = params.now ?? new Date();
  const { data, error } = await getSupabaseServerClient(true).rpc(
    "emit_action_j1_reminders",
    { p_now: now.toISOString() },
  );

  if (error) throw error;

  return {
    status: "delivered",
    insertedCount: typeof data === "number" ? data : Number(data ?? 0),
  };
}
