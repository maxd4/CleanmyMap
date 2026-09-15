import {
  canAutoApproveOwnAction,
  type ActionPermissionIdentity,
} from "./permissions";
import type { ActionPhase, ActionStatus } from "./types";

export type ResolveNextActionStatusParams = {
  currentStatus: ActionStatus;
  actionPhase?: ActionPhase;
  permissionIdentity: ActionPermissionIdentity | null | undefined;
  createdByClerkId?: string | null;
};

/**
 * Resolves the status implied by an action phase update.
 *
 * A draft phase, or no phase update, deliberately preserves the current
 * status. The caller decides whether the resolved value belongs in a
 * persistence payload; this function only owns the status transition rule.
 */
export function resolveNextActionStatus({
  currentStatus,
  actionPhase,
  permissionIdentity,
  createdByClerkId,
}: ResolveNextActionStatusParams): ActionStatus {
  if (actionPhase === "pre_action") {
    return "pending";
  }

  if (actionPhase === "post_action_complete") {
    return canAutoApproveOwnAction(permissionIdentity, {
      createdByClerkId,
    })
      ? "approved"
      : "pending";
  }

  return currentStatus;
}
