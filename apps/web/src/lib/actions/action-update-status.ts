import type { ActionPhase, ActionStatus } from "./types";

export type ResolveNextActionStatusParams = {
  currentStatus: ActionStatus;
  actionPhase?: ActionPhase;
};

/**
 * Resolves the status implied by an action phase update.
 *
 * A draft phase, or no phase update, deliberately preserves the current
 * status. Completing or publishing an action still follows the normal
 * moderation workflow; the creator's role never changes that status.
 */
export function resolveNextActionStatus({
  currentStatus,
  actionPhase,
}: ResolveNextActionStatusParams): ActionStatus {
  if (actionPhase === "pre_action") {
    return "pending";
  }

  if (actionPhase === "post_action_complete") {
    return "pending";
  }

  return currentStatus;
}
