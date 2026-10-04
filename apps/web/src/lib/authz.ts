import { auth, clerkClient } from "@clerk/nextjs/server";
import { env } from "./env";
import {
  resolveProfile,
  type AppRoleLabel,
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
} from "./profiles";
import {
  getEffectiveAccessForSessionRole,
  type EffectiveAccess,
  type SessionRole,
} from "./domain-language";
import { extractBadgeIds, mapBadgeIdsToBadges } from "./authz-badges";
import {
  buildActorNameOptions,
  getClerkUser,
  getDevAuthBypassSession,
  getCurrentUserIdentity,
  resolveActorNameFromClerk,
} from "./authz-identity";
import {
  extractRole,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveClerkRole,
} from "./auth/role-resolution";
export { isAdminRole } from "./auth/role-resolution";
export type { UserIdentity } from "./authz-identity";
export { getCurrentUserIdentity, pickTraceableActorName } from "./authz-identity";
export {
  getProfileBadge,
  getRoleBadge,
} from "./authz-badges";

export type AdminAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export type CreatorAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export type AuthenticatedAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

function resolveDevAuthBypassRole(role: string): AppRoleLabel {
  return resolveProfile({
    metadataRole: role,
    isAdmin: role === "admin",
    isMax: role === "max",
  });
}

export async function requireAdminAccess(): Promise<AdminAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return getEffectiveAccessForSessionRole(devBypass.role as SessionRole).canAccessAdminPage
      ? { ok: true, userId: devBypass.userId }
      : { ok: false, status: 403, error: "Forbidden" };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const access = await getCurrentUserEffectiveAccess();
  return access.canAccessAdminPage
    ? { ok: true, userId }
    : { ok: false, status: 403, error: "Forbidden" };
}

export async function requireCreatorAccess(): Promise<CreatorAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return devBypass.role === "max"
      ? { ok: true, userId: devBypass.userId }
      : { ok: false, status: 403, error: "Forbidden" };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const activeRole = await getCurrentUserActiveRole().catch(() => "anonymous" as const);
  if (activeRole === "max") {
    return { ok: true, userId };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireAuthenticatedAccess(): Promise<AuthenticatedAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return { ok: true, userId: devBypass.userId };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, userId };
}

export async function getCurrentUserRoleLabel(): Promise<AppRoleLabel> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return resolveDevAuthBypassRole(devBypass.role);
  }

  const { userId } = await auth();
  if (!userId) {
    return "anonymous" as const;
  }

  try {
    const client = await clerkClient();
    const user = await getClerkUser(client, userId);
    return resolveClerkRole({
      user,
      adminUserIds: parseAdminUserIds(env.CLERK_ADMIN_USER_IDS),
      maxUserIds: parseMaxUserIds(env.CLERK_MAX_USER_IDS),
    });
  } catch (error) {
    console.error("Current user role resolution failed", error);
    return "benevole";
  }
}

/** Returns GRANTED_ROLE, kept explicit for code that needs the obtained level. */

/** Returns ACTIVE_ROLE, the only role allowed to drive effective capabilities. */
export async function getCurrentUserActiveRole(): Promise<AppRoleLabel> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return resolveDevAuthBypassRole(devBypass.role);
  }

  const identity = await getCurrentUserIdentity();
  return identity?.activeRole ?? "anonymous";
}

export async function getCurrentUserEffectiveAccess(): Promise<EffectiveAccess> {
  const activeRole = await getCurrentUserActiveRole();
  return getEffectiveAccessForSessionRole(activeRole);
}

export const __authz_testables = {
  extractRole,
  resolveDevAuthBypassRole,
  extractBadgeIds,
  mapBadgeIdsToBadges,
  resolveClerkRole,
  buildActorNameOptions,
  resolveActorNameFromClerk,
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
};
