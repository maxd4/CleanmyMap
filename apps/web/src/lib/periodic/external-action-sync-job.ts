import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseExternalActionSyncStore } from "@/lib/actions/external-sync/store";
import { runExternalActionSync } from "@/lib/actions/external-sync/engine";

export async function runExternalActionSyncMaintenanceJob(
  params: { now?: Date } = {},
) {
  const supabase = getSupabaseServerClient(true);
  const store = createSupabaseExternalActionSyncStore(supabase);
  return runExternalActionSync(
    { store },
    {
      mode: "cron_prepare",
      now: params.now,
    },
  );
}
