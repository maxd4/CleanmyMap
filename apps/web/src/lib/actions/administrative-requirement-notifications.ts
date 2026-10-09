import type { SupabaseClient } from "@supabase/supabase-js";
import { logFailure } from "@/lib/logging/failure-log";

/**
 * The action write remains authoritative. This best-effort RPC is called only
 * after a successful write or publication; the database rechecks visibility,
 * lifecycle and administrativeRequirements before delivering one grouped,
 * idempotent reminder per organizer and action.
 */
export async function emitAdministrativeRequirementNotifications(params: {
  supabase: SupabaseClient;
  actionId: string;
}): Promise<boolean> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await params.supabase.rpc(
      "emit_action_administrative_requirement_notifications",
      { p_action_id: params.actionId },
    );
    if (!result.error) return true;
    lastError = result.error;
  }

  logFailure(
    "administrative-requirement-notifications",
    "Administrative requirement notification delivery failed",
    lastError,
    { actionId: params.actionId },
  );
  return false;
}

export async function emitAdministrativeRequirementNotificationsIfNeeded(params: {
  supabase: SupabaseClient;
  actionId: string;
  current: { published_at: string | null };
  updateData: Record<string, unknown>;
  actionWriteSucceeded: boolean;
}): Promise<void> {
  if (
    !params.actionWriteSucceeded ||
    (!params.current.published_at && !params.updateData.published_at)
  ) {
    return;
  }
  await emitAdministrativeRequirementNotifications({
    supabase: params.supabase,
    actionId: params.actionId,
  });
}
