import type { ActionPhase } from "@/lib/actions/types";

/** Returns whether the action phase is still backed by action_registrations. */
export function usesRegistrationStore(
  actionPhase: ActionPhase | null | undefined,
): boolean {
  return actionPhase === "pre_action" || actionPhase === "post_action_draft";
}
