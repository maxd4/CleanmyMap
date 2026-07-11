import type { ActionPhase, ActionStatus } from "@/lib/actions/types";
import type { AppProfile } from "@/lib/profiles";

export const ACTION_MODERATION_ROLES = ["admin", "elu", "max"] as const;

export type ActionModerationRole = (typeof ACTION_MODERATION_ROLES)[number];

export type ActionPermissionIdentity = {
  userId: string;
  role: AppProfile | null | undefined;
};

export type ActionPermissionTarget = {
  createdByClerkId?: string | null;
  actionPhase?: ActionPhase | null;
  status?: ActionStatus | null;
};

function normalizeUserId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function isActionModerationRole(
  role: AppProfile | null | undefined,
): role is ActionModerationRole {
  return role === "admin" || role === "elu" || role === "max";
}

export function canUseAdminOverride(
  identity: Pick<ActionPermissionIdentity, "role"> | null | undefined,
): boolean {
  return Boolean(identity && isActionModerationRole(identity.role));
}

export function canModerateAnyAction(
  identity: Pick<ActionPermissionIdentity, "role"> | null | undefined,
): boolean {
  return canUseAdminOverride(identity);
}

export function canAutoApproveOwnAction(
  identity: ActionPermissionIdentity | null | undefined,
  action: ActionPermissionTarget,
): boolean {
  const userId = normalizeUserId(identity?.userId);
  const creatorId = normalizeUserId(action.createdByClerkId);

  return Boolean(
    userId &&
      creatorId &&
      userId === creatorId &&
      canUseAdminOverride(identity),
  );
}

export function canManageAction(
  identity: ActionPermissionIdentity | null | undefined,
  action: ActionPermissionTarget,
  organizerIds: string[],
): boolean {
  if (canUseAdminOverride(identity)) {
    return true;
  }

  const userId = normalizeUserId(identity?.userId);
  if (!userId) {
    return false;
  }

  if (normalizeUserId(action.createdByClerkId) === userId) {
    return true;
  }

  return organizerIds.map((value) => value.trim()).includes(userId);
}

export function canReviewActionParticipants(
  identity: ActionPermissionIdentity | null | undefined,
  action: ActionPermissionTarget,
  organizerIds: string[],
): boolean {
  return canManageAction(identity, action, organizerIds);
}

export function canEditValidatedImpact(
  identity: ActionPermissionIdentity | null | undefined,
  action: ActionPermissionTarget,
): boolean {
  return (
    canUseAdminOverride(identity) ||
    normalizeUserId(identity?.userId) === normalizeUserId(action.createdByClerkId)
  );
}

export function canChangeActionStatus(
  identity: Pick<ActionPermissionIdentity, "role"> | null | undefined,
): boolean {
  return canModerateAnyAction(identity);
}

export function canViewModerationAudit(
  identity: Pick<ActionPermissionIdentity, "role"> | null | undefined,
): boolean {
  return canModerateAnyAction(identity);
}
