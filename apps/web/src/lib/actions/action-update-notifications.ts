import type { SupabaseClient } from "@supabase/supabase-js";
import { logFailure } from "@/lib/logging/failure-log";
import type { ActionChangeKind } from "./action-change-notifications";

type ActionUpdateNotificationParams = {
  supabase: SupabaseClient;
  actionId: string;
  actorUserId: string;
  changeKinds: readonly ActionChangeKind[];
  eventKey: string;
};

/**
 * Delivers the action_event after the action write has succeeded. The event
 * key makes retries safe; the short retry covers transient PostgREST failures
 * without turning notification delivery into a second blocking mutation.
 */
export async function emitActionUpdateNotifications(
  params: ActionUpdateNotificationParams,
): Promise<boolean> {
  if (params.changeKinds.length === 0) return false;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await params.supabase.rpc("emit_action_update_notifications", {
      p_action_id: params.actionId,
      p_actor_id: params.actorUserId,
      p_change_kinds: [...params.changeKinds],
      p_event_key: params.eventKey,
    });
    if (!result.error) return true;
    lastError = result.error;
  }

  logFailure("action-update-notifications", "Action update notification delivery failed", lastError, {
    actionId: params.actionId,
    eventKey: params.eventKey,
  });
  return false;
}
