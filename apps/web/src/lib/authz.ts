import { auth, clerkClient } from "@clerk/nextjs/server";
import { env } from "./env";
import {
  resolveProfile,
  type AppRoleLabel,
  normalizeDisplayNameMode,
  normalizeProfileRole,
  resolveAccountDisplayName,
} from "./profiles";
import {
  getEffectiveAccessForSessionRole,
  type EffectiveAccess,
} from "./domain-language";
import { isCreatorInboxEmail } from "@/lib/auth/privileged-identities";
import { mapBadgeIdsToBadges } from "./authz-badges";
import {
  buildActorNameOptions,
  getClerkUser,
  getDevAuthBypassSession,
  normalizeLegacyOwnerMetadata,
  resolveActorNameFromClerk,
} from "./authz-identity";
export type { AccountBadge } from "./authz-badges";
export type { UserIdentity } from "./authz-identity";
export { getCurrentUserIdentity, pickTraceableActorName } from "./authz-identity";
export {
  getProfileBadge,
  getProfileBadgeId,
  getRoleBadge,
  getRoleBadgeId,
} from "./authz-badges";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type AdminAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export type CreatorAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export type AuthenticatedAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

function parseAdminUserIds(raw: string | undefined): Set<string> {
  return parseUserIds(raw);
}

function parseMaxUserIds(
  raw: string | undefined,
  fallbackRaw?: string | undefined,
): Set<string> {
  const parsed = parseUserIds(raw);
  if (parsed.size > 0) {
    return parsed;
  }
  return parseUserIds(fallbackRaw);
}

function parseUserIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }
  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return new Set(ids);
}

function extractRole(metadata: ClerkMetadata): string | null {
  if (!metadata) {
    return null;
  }
  const roleValue = metadata["role"] ?? metadata["profile"];
  if (typeof roleValue !== "string") {
    return null;
  }

  const normalized = roleValue.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalizeProfileRole(normalized) ?? normalized;
}

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

export function isAdminRole(metadata: {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
}): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "admin" || publicRole === "max") {
    return true;
  }
  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "admin" || privateRole === "max";
}

export function isMaxRole(metadata: {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
}): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "max") {
    return true;
  }
  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "max";
}

export async function requireAdminAccess(): Promise<AdminAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return { ok: true, userId: devBypass.userId };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
  const maxUserIds = parseMaxUserIds(
    env.CLERK_MAX_USER_IDS,
    env.CLERK_ADMIN_USER_IDS,
  );
  if (adminUserIds.has(userId) || maxUserIds.has(userId)) {
    return { ok: true, userId };
  }

  try {
    const client = await clerkClient();
    const user = await getClerkUser(client, userId);
    if (isCreatorInboxEmail(user.primaryEmailAddress?.emailAddress)) {
      return { ok: true, userId };
    }
    if (
      isAdminRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      })
    ) {
      return { ok: true, userId };
    }
  } catch (error) {
    console.error("Admin role resolution failed", error);
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireCreatorAccess(): Promise<CreatorAccessResult> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return { ok: true, userId: devBypass.userId };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const role = await getCurrentUserRoleLabel().catch(() => "anonymous");
  if (role === "max") {
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
    const user = await normalizeLegacyOwnerMetadata(
      client,
      await getClerkUser(client, userId),
    );
    const maxUserIds = parseMaxUserIds(
      env.CLERK_MAX_USER_IDS,
      env.CLERK_ADMIN_USER_IDS,
    );
    if (
      maxUserIds.has(userId) ||
      isCreatorInboxEmail(user.primaryEmailAddress?.emailAddress) ||
      isMaxRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      })
    ) {
      return "max" as const;
    }

    const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
    if (
      adminUserIds.has(userId) ||
      isAdminRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      })
    ) {
      return "admin" as const;
    }

    const metadataRole =
      extractRole(user.publicMetadata) ?? extractRole(user.privateMetadata);
    return resolveProfile({ metadataRole, isAdmin: false, isMax: false });
  } catch (error) {
    console.error("Current user role resolution failed", error);
    return "benevole";
  }
}

export async function getCurrentUserEffectiveAccess(): Promise<EffectiveAccess> {
  const role = await getCurrentUserRoleLabel();
  return getEffectiveAccessForSessionRole(role);
}

export const __authz_testables = {
  parseAdminUserIds,
  extractRole,
  extractBadgeIds,
  mapBadgeIdsToBadges,
  buildActorNameOptions,
  resolveActorNameFromClerk,
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
};
