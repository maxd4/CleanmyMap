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
} from "./domain-language";
import { mapBadgeIdsToBadges } from "./authz-badges";
import {
  buildActorNameOptions,
  getClerkUser,
  getDevAuthBypassSession,
  getCurrentUserIdentity,
  resolveActorNameFromClerk,
} from "./authz-identity";
import {
  extractRole,
  isCanonicalImuOwner,
  resolveClerkRole,
  type ClerkMetadata,
} from "./auth/role-resolution";
export { isAdminRole } from "./auth/role-resolution";
export type { AccountBadge } from "./authz-badges";
export type { UserIdentity } from "./authz-identity";
export { getCurrentUserIdentity, pickTraceableActorName } from "./authz-identity";
export {
  getProfileBadge,
  getProfileBadgeId,
  getRoleBadge,
  getRoleBadgeId,
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

function extractBadgeIds(metadata: ClerkMetadata): string[] {
  if (!metadata) {
    return [];
  }
  const badges = metadata["badges"];
  if (!Array.isArray(badges)) {
    return [];
  }
  return badges
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
}

export async function requireAdminAccess(): Promise<AdminAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return devBypass.role === "admin" || devBypass.role === "max"
      ? { ok: true, userId: devBypass.userId }
      : { ok: false, status: 403, error: "Forbidden" };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const activeRole = await getCurrentUserActiveRole();
  return activeRole === "admin" || activeRole === "max"
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
    return resolveProfile({
      metadataRole: devBypass.role,
      isAdmin: devBypass.role === "admin",
      isMax: devBypass.role === "max",
    });
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
      ownerUserId: env.CLERK_IMU_OWNER_USER_ID,
      ownerEmail: env.CLERK_IMU_OWNER_EMAIL,
    });
  } catch (error) {
    console.error("Current user role resolution failed", error);
    return "benevole";
  }
}

/** Returns GRANTED_ROLE, kept explicit for code that needs the obtained level. */
export async function getCurrentUserGrantedRoleLabel(): Promise<AppRoleLabel> {
  return getCurrentUserRoleLabel();
}

/** Returns ACTIVE_ROLE, the only role allowed to drive effective capabilities. */
export async function getCurrentUserActiveRole(): Promise<AppRoleLabel> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return resolveProfile({
      metadataRole: devBypass.role,
      isAdmin: devBypass.role === "admin",
      isMax: devBypass.role === "max",
    });
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
  extractBadgeIds,
  mapBadgeIdsToBadges,
  resolveClerkRole,
  isCanonicalImuOwner,
  buildActorNameOptions,
  resolveActorNameFromClerk,
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
};
