import type { ActionPhase, ActionStatus } from "@/lib/actions/types";
import type { AppProfile } from "@/lib/profiles";

export const ACTION_GLOBAL_ADMIN_ROLES = ["admin", "max"] as const;

export type ActionGlobalAdminRole = (typeof ACTION_GLOBAL_ADMIN_ROLES)[number];

export type ActionPermissionIdentity = {
  userId: string;
  /** GRANTED_ROLE, retained for audit and attribution only. */
  role: AppProfile | null | undefined;
  /** ACTIVE_ROLE, the only role used for capability decisions. */
  activeRole: AppProfile | null | undefined;
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

function hasGlobalActionCapability(
  role: AppProfile | null | undefined,
): role is ActionGlobalAdminRole {
  return role != null && ACTION_GLOBAL_ADMIN_ROLES.includes(role as ActionGlobalAdminRole);
}

export function canModerateActionsGlobally(
  identity: Pick<ActionPermissionIdentity, "activeRole"> | null | undefined,
): boolean {
  return Boolean(identity && hasGlobalActionCapability(identity.activeRole));
}

export function canManageActionsGlobally(
  identity: Pick<ActionPermissionIdentity, "activeRole"> | null | undefined,
): boolean {
  return Boolean(identity && hasGlobalActionCapability(identity.activeRole));
}

export function canOverrideActionParticipants(
  identity: Pick<ActionPermissionIdentity, "activeRole"> | null | undefined,
): boolean {
  return Boolean(identity && hasGlobalActionCapability(identity.activeRole));
}

export function canManageAction(
  identity: ActionPermissionIdentity | null | undefined,
  action: ActionPermissionTarget,
  organizerIds: string[],
): boolean {
  if (hasGlobalActionCapability(identity?.activeRole)) {
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
  identity: Pick<ActionPermissionIdentity, "activeRole"> | null | undefined,
): boolean {
  return Boolean(identity && hasGlobalActionCapability(identity.activeRole));
}

export function canViewActionModerationAudit(
  identity: Pick<ActionPermissionIdentity, "activeRole"> | null | undefined,
): boolean {
  return Boolean(identity && hasGlobalActionCapability(identity.activeRole));
}
