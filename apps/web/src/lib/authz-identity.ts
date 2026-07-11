import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { env } from "./env";
import {
  resolveProfile,
  type AppProfile,
  type DisplayNameMode,
  normalizeProfileRole,
} from "./profiles";
import {
  getProfileBadgeId,
  getRoleBadgeId,
  mapBadgeIdsToBadges,
  type AccountBadge,
} from "./authz-badges";
import {
  resolveIdentityActorNameOptions,
  resolveIdentityDisplayName,
  resolveIdentityDisplayNameMode,
  resolveIdentityHandle,
  resolveIdentityNameParts,
} from "./authz-identity-names";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { isCreatorInboxEmail } from "@/lib/auth/privileged-identities";
import {
  getDisplayNameModeCookieOverride,
  getDisplayNameModeOverride,
} from "@/lib/account/display-name-mode-store";
import {
  extractUserLocationPreferenceFromMetadata,
  type UserLocationPreference,
} from "@/lib/user-location-preference";
import {
  getDevAuthBypassDisplayName,
  getDevAuthBypassRole,
  getDevAuthBypassUserId,
  getDevAuthBypassUsername,
  isLocalhostHost,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-auth";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type UserIdentity = {
  userId: string;
  displayName: string;
  displayNameMode?: DisplayNameMode;
  handle: string;
  firstName: string | null;
  username: string;
  email: string | null;
  currentLevel: number;
  actorNameOptions: string[];
  role: AppProfile;
  badges: AccountBadge[];
  locationPreference?: UserLocationPreference | null;
};


function parseUserIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function parseAdminUserIds(raw: string | undefined): Set<string> {
  return parseUserIds(raw);
}

function parseMaxUserIds(raw: string | undefined, fallbackRaw?: string | undefined): Set<string> {
  const parsed = parseUserIds(raw);
  return parsed.size > 0 ? parsed : parseUserIds(fallbackRaw);
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

export { getRoleBadgeId, getProfileBadgeId, getRoleBadge, getProfileBadge, mapBadgeIdsToBadges } from "./authz-badges";

export function buildActorNameOptions(
  firstName: string | null,
  username: string,
  userId: string,
): string[] {
  const candidates = [firstName ?? "", username, userId]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(candidates));
}

export function resolveActorNameFromClerk(
  actorNameOptions: string[],
  preferred: string | null | undefined,
): string {
  const normalizedOptions = actorNameOptions
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (normalizedOptions.length === 0) {
    return "unknown-user";
  }
  const preferredCandidate = (preferred ?? "").trim();
  if (preferredCandidate.length > 0 && normalizedOptions.includes(preferredCandidate)) {
    return preferredCandidate;
  }
  return normalizedOptions[0];
}

export async function getClerkUser(
  client: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
): Promise<User> {
  try {
    return await client.users.getUser(userId);
  } catch (error) {
    const msg =
      error instanceof Error && error.message ? error.message : `Clerk getUser failed for ${userId}`;
    throw new Error(msg, { cause: error });
  }
}

function describeBackgroundSyncError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function loadUserCurrentLevel(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase.from("progression_profiles").select("current_level").eq("user_id", userId).maybeSingle();
    if (result.error) {
      return 1;
    }
    const level = Number((result.data as { current_level?: unknown } | null)?.current_level ?? 1);
    return Number.isFinite(level) && level >= 1 ? Math.trunc(level) : 1;
  } catch {
    return 1;
  }
}

type StoredProfileRow = {
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
};

export async function loadStoredProfile(userId: string): Promise<StoredProfileRow | null> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase
      .from("profiles")
      .select("display_name, display_name_mode, handle")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) {
      return null;
    }
    return (result.data as StoredProfileRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function normalizeLegacyOwnerMetadata(
  client: Awaited<ReturnType<typeof clerkClient>>,
  user: User,
): Promise<User> {
  const publicRole = extractRole(user.publicMetadata);
  const privateRole = extractRole(user.privateMetadata);
  if (publicRole !== "max" && privateRole !== "max") {
    return user;
  }
  try {
    return await client.users.updateUser(user.id, {
      publicMetadata: {
        ...(user.publicMetadata as Record<string, unknown>),
        role: "imu",
        profile: "imu",
      },
      privateMetadata: {
        ...(user.privateMetadata as Record<string, unknown>),
        role: "imu",
        profile: "imu",
      },
    });
  } catch (error) {
    console.warn(
      `[Authz] Legacy IMU metadata normalization skipped for ${user.id}: ${describeBackgroundSyncError(error)}`,
    );
    return user;
  }
}

export async function getDevAuthBypassSession() {
  let host: string | null = null;
  try {
    const requestHeaders = await headers();
    host = requestHeaders.get("host");
  } catch {
    host = null;
  }

  if (!isDevAuthBypassEnabled(host)) {
    return null;
  }

  const bypassRole =
    isLocalhostHost(host) && !process.env["CMM_DEV_AUTH_BYPASS_ROLE"]?.trim()
      ? "super_admin"
      : getDevAuthBypassRole();

  return {
    userId: getDevAuthBypassUserId(),
    role: bypassRole,
    displayName: getDevAuthBypassDisplayName(),
    username: getDevAuthBypassUsername(),
  };
}

async function buildDevBypassIdentity(devBypass: {
  userId: string;
  role: string;
  displayName: string;
  username: string;
}): Promise<UserIdentity> {
  const displayNameMode =
    (await getDisplayNameModeCookieOverride()) ??
    getDisplayNameModeOverride(devBypass.userId) ??
    "full_name";
  const role = resolveProfile({
    metadataRole: devBypass.role,
    isAdmin: devBypass.role === "admin",
    isMax: devBypass.role === "max",
  });

  return {
    userId: devBypass.userId,
    displayName: displayNameMode === "pseudo" ? devBypass.username : devBypass.displayName,
    displayNameMode,
    handle: devBypass.username,
    firstName: null,
    username: devBypass.username,
    email: null,
    currentLevel: 1,
    actorNameOptions: [devBypass.displayName, devBypass.username, devBypass.userId],
    role,
    badges: mapBadgeIdsToBadges([getRoleBadgeId(role), getProfileBadgeId(role)]),
    locationPreference: null,
  };
}

function buildFallbackIdentity(
  userId: string,
  adminUserIds: Set<string>,
  maxUserIds: Set<string>,
): UserIdentity {
  const resolvedRole = resolveProfile({
    metadataRole: null,
    isAdmin: adminUserIds.has(userId),
    isMax: maxUserIds.has(userId),
  });

  return {
    userId,
    displayName: userId,
    displayNameMode: "full_name",
    handle: userId,
    firstName: null,
    username: userId,
    email: null,
    currentLevel: 1,
    actorNameOptions: [userId],
    role: resolvedRole,
    badges: mapBadgeIdsToBadges([
      ...(maxUserIds.has(userId) ? ["max"] : adminUserIds.has(userId) ? ["admin"] : []),
      getRoleBadgeId(resolvedRole),
      getProfileBadgeId(resolvedRole),
    ]),
    locationPreference: null,
  };
}

function hasAnyRole(metadata: ClerkMetadata, roles: string[]): boolean {
  const role = extractRole(metadata);
  return role !== null && roles.includes(role);
}

function resolveIdentityFlags(
  user: User,
  userId: string,
  adminUserIds: Set<string>,
  maxUserIds: Set<string>,
): { isAdmin: boolean; isMax: boolean } {
  const creatorInbox = isCreatorInboxEmail(user.primaryEmailAddress?.emailAddress);
  const metadataSources = [user.publicMetadata, user.privateMetadata];
  return {
    isAdmin:
      adminUserIds.has(userId) ||
      creatorInbox ||
      metadataSources.some((metadata) => hasAnyRole(metadata, ["admin", "max"])),
    isMax:
      maxUserIds.has(userId) ||
      creatorInbox ||
      metadataSources.some((metadata) => hasAnyRole(metadata, ["max"])),
  };
}

function resolveIdentityNames(
  user: User,
  userId: string,
  storedProfile: StoredProfileRow | null,
): {
  firstName: string;
  username: string;
  email: string | null;
  displayNameMode: DisplayNameMode;
  displayName: string;
  handle: string;
  actorNameOptions: string[];
} {
  const { firstName, lastName, username, email } = resolveIdentityNameParts(user, userId);
  const displayNameMode = resolveIdentityDisplayNameMode(userId, storedProfile);
  return {
    firstName,
    username,
    email,
    displayNameMode,
    displayName: resolveIdentityDisplayName(
      firstName,
      lastName,
      username,
      userId,
      displayNameMode,
      storedProfile,
    ),
    handle: resolveIdentityHandle(username, storedProfile),
    actorNameOptions: resolveIdentityActorNameOptions(firstName, username, userId),
  };
}

function resolveIdentityRole(
  user: User,
  isAdmin: boolean,
  isMax: boolean,
): AppProfile {
  const metadataRole = extractRole(user.publicMetadata) ?? extractRole(user.privateMetadata);
  return resolveProfile({
    metadataRole,
    isAdmin,
    isMax,
  });
}

function resolveIdentityBadges(
  user: User,
  isAdmin: boolean,
  isMax: boolean,
  role: AppProfile,
): AccountBadge[] {
  const badgeIds = [
    ...extractBadgeIds(user.publicMetadata),
    ...extractBadgeIds(user.privateMetadata),
    ...(isMax ? ["max"] : isAdmin ? ["admin"] : []),
  ];

  return mapBadgeIdsToBadges([...badgeIds, getRoleBadgeId(role), getProfileBadgeId(role)]);
}

function resolveIdentityLocationPreference(user: User) {
  return (
    extractUserLocationPreferenceFromMetadata(user.unsafeMetadata) ??
    extractUserLocationPreferenceFromMetadata(user.publicMetadata) ??
    extractUserLocationPreferenceFromMetadata(user.privateMetadata)
  );
}

function buildResolvedIdentity(params: {
  userId: string;
  fetchedUser: User;
  currentLevel: number;
  storedProfile: StoredProfileRow | null;
  adminUserIds: Set<string>;
  maxUserIds: Set<string>;
}): UserIdentity {
  const { userId, fetchedUser, currentLevel, storedProfile, adminUserIds, maxUserIds } = params;
  const user = fetchedUser;
  const { isAdmin, isMax } = resolveIdentityFlags(user, userId, adminUserIds, maxUserIds);
  const {
    firstName,
    username,
    email,
    displayNameMode,
    displayName,
    handle,
    actorNameOptions,
  } = resolveIdentityNames(user, userId, storedProfile);
  const resolvedRole = resolveIdentityRole(user, isAdmin, isMax);

  return {
    userId,
    displayName,
    displayNameMode,
    handle,
    firstName: firstName || null,
    username,
    email,
    currentLevel,
    actorNameOptions,
    role: resolvedRole,
    badges: resolveIdentityBadges(user, isAdmin, isMax, resolvedRole),
    locationPreference: resolveIdentityLocationPreference(user),
  };
}

async function buildAuthenticatedIdentity(
  userId: string,
  adminUserIds: Set<string>,
  maxUserIds: Set<string>,
): Promise<UserIdentity | null> {
  try {
    const client = await clerkClient();
    const [fetchedUser, currentLevel, storedProfile] = await Promise.all([
      getClerkUser(client, userId),
      loadUserCurrentLevel(userId),
      loadStoredProfile(userId),
    ]);
    const user = await normalizeLegacyOwnerMetadata(client, fetchedUser);

    syncClerkUserToSupabase(user, { allowServiceRoleFallback: false }).catch((err) => {
      console.warn(`[Authz] Background sync skipped for ${userId}: ${describeBackgroundSyncError(err)}`);
    });

    return buildResolvedIdentity({
      userId,
      fetchedUser: user,
      currentLevel,
      storedProfile,
      adminUserIds,
      maxUserIds,
    });
  } catch (error) {
    console.error("Current user identity resolution failed", error);
    return buildFallbackIdentity(userId, adminUserIds, maxUserIds);
  }
}

export async function getCurrentUserIdentity(
  options?: { userId?: string | null },
): Promise<UserIdentity | null> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    return buildDevBypassIdentity(devBypass);
  }

  const userId =
    options && "userId" in options
      ? options.userId ?? null
      : (await auth()).userId ?? null;
  if (!userId) {
    return null;
  }

  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
  const maxUserIds = parseMaxUserIds(env.CLERK_MAX_USER_IDS, env.CLERK_ADMIN_USER_IDS);
  return buildAuthenticatedIdentity(userId, adminUserIds, maxUserIds);
}

export function pickTraceableActorName(
  identity: UserIdentity | null,
  preferred: string | null | undefined,
): string | undefined {
  if (!identity) {
    return undefined;
  }
  return resolveActorNameFromClerk(identity.actorNameOptions, preferred);
}
