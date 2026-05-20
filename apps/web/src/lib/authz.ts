import { auth, clerkClient, type User } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { env } from "./env";
import {
  resolveProfile,
  type AppProfile,
  type AppRoleLabel,
  type DisplayNameMode,
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
} from "./profiles";
import {
  getEffectiveAccessForSessionRole,
  type EffectiveAccess,
} from "./domain-language";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncClerkUserToSupabase } from "@/lib/auth/sync";
import { isCreatorInboxEmail } from "@/lib/auth/privileged-identities";
import {
  getDisplayNameModeCookieOverride,
  getDisplayNameModeOverride,
} from "@/lib/account/display-name-mode-store";
import {
  getDevAuthBypassDisplayName,
  getDevAuthBypassRole,
  getDevAuthBypassUserId,
  getDevAuthBypassUsername,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-auth";

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

export type AccountBadge = {
  id: string;
  label: string;
  icon: string;
};

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
};

const BADGE_CATALOG: Record<string, AccountBadge> = {
  admin: { id: "admin", label: "Administrateur", icon: "shield" },
  role_admin: { id: "role_admin", label: "Administration", icon: "crown" },
  role_benevole: { id: "role_benevole", label: "Bénévole", icon: "users" },
  role_coordinateur: {
    id: "role_coordinateur",
    label: "Coordination",
    icon: "target",
  },
  role_scientifique: {
    id: "role_scientifique",
    label: "Scientifique",
    icon: "sparkles",
  },
  role_elu: { id: "role_elu", label: "Autorité locale", icon: "badge-check" },
  role_max: { id: "role_max", label: "IMU", icon: "shield-check" },
  profile_admin: {
    id: "profile_admin",
    label: "Profil administration",
    icon: "shield",
  },
  profile_benevole: {
    id: "profile_benevole",
    label: "Profil bénévole",
    icon: "users",
  },
  profile_coordinateur: {
    id: "profile_coordinateur",
    label: "Profil coordination",
    icon: "target",
  },
  profile_scientifique: {
    id: "profile_scientifique",
    label: "Profil scientifique",
    icon: "sparkles",
  },
  profile_elu: { id: "profile_elu", label: "Profil autorité locale", icon: "badge-check" },
  profile_max: {
    id: "profile_max",
    label: "Profil IMU",
    icon: "shield-check",
  },
  pioneer: { id: "pioneer", label: "Pionnier", icon: "zap" },
  mentor: { id: "mentor", label: "Mentor", icon: "award" },
  cleanwalk_10: { id: "cleanwalk_10", label: "10 cleanwalks", icon: "medal" },
  cleanwalk_50: { id: "cleanwalk_50", label: "50 cleanwalks", icon: "trophy" },
  impact_100kg: { id: "impact_100kg", label: "100 kg collectes", icon: "droplets" },
};

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
  return typeof roleValue === "string" ? roleValue.trim().toLowerCase() : null;
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

function mapBadgeIdsToBadges(ids: string[]): AccountBadge[] {
  const deduped = Array.from(new Set(ids));
  return deduped
    .map(
      (id) =>
        BADGE_CATALOG[id] ?? { id, label: id.replace(/_/g, " "), icon: "BAD" },
    )
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

async function loadUserCurrentLevel(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseServerClient();
    const result = await supabase
      .from("progression_profiles")
      .select("current_level")
      .eq("user_id", userId)
      .maybeSingle();

    if (result.error) {
      return 1;
    }

    const level = Number(
      (result.data as { current_level?: unknown } | null)?.current_level ?? 1,
    );
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

async function loadStoredProfile(userId: string): Promise<StoredProfileRow | null> {
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

function extractDisplayNameModeFromMetadata(metadata: ClerkMetadata): DisplayNameMode | null {
  if (!metadata) {
    return null;
  }

  const rawValue =
    metadata["display_name_mode"] ??
    metadata["displayNameMode"];

  return typeof rawValue === "string" ? normalizeDisplayNameMode(rawValue) : null;
}

export function getRoleBadgeId(profile: AppProfile): string {
  return `role_${profile}`;
}

export function getProfileBadgeId(profile: AppProfile): string {
  return `profile_${profile}`;
}

export function getRoleBadge(profile: AppProfile): AccountBadge {
  return mapBadgeIdsToBadges([getRoleBadgeId(profile)])[0];
}

export function getProfileBadge(profile: AppProfile): AccountBadge {
  return mapBadgeIdsToBadges([getProfileBadgeId(profile)])[0];
}

function buildActorNameOptions(
  firstName: string | null,
  username: string,
  userId: string,
): string[] {
  const candidates = [firstName ?? "", username, userId]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(candidates));
}

function resolveActorNameFromClerk(
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
  if (
    preferredCandidate.length > 0 &&
    normalizedOptions.includes(preferredCandidate)
  ) {
    return preferredCandidate;
  }

  return normalizedOptions[0];
}

async function getClerkUser(
  client: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
): Promise<User> {
  try {
    return await client.users.getUser(userId);
  } catch (error) {
    const msg =
      error instanceof Error && error.message
        ? error.message
        : `Clerk getUser failed for ${userId}`;
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

async function normalizeLegacyOwnerMetadata(
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

export async function getCurrentUserIdentity(): Promise<UserIdentity | null> {
  const devBypass = await getDevAuthBypassSession();
  if (devBypass) {
    const displayNameMode =
      (await getDisplayNameModeCookieOverride()) ??
      getDisplayNameModeOverride(devBypass.userId) ?? "full_name";
    const role = resolveProfile({
      metadataRole: devBypass.role,
      isAdmin: devBypass.role === "admin",
      isMax: devBypass.role === "max",
    });
    return {
      userId: devBypass.userId,
      displayName:
        displayNameMode === "pseudo"
          ? devBypass.username
          : devBypass.displayName,
      displayNameMode,
      handle: devBypass.username,
      firstName: null,
      username: devBypass.username,
      email: null,
      currentLevel: 1,
      actorNameOptions: [devBypass.displayName, devBypass.username, devBypass.userId],
      role,
      badges: mapBadgeIdsToBadges([
        getRoleBadgeId(role),
        getProfileBadgeId(role),
      ]),
    };
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
  const maxUserIds = parseMaxUserIds(
    env.CLERK_MAX_USER_IDS,
    env.CLERK_ADMIN_USER_IDS,
  );

  try {
    const client = await clerkClient();
    const [fetchedUser, currentLevel, storedProfile] = await Promise.all([
      getClerkUser(client, userId),
      loadUserCurrentLevel(userId),
      loadStoredProfile(userId),
    ]);
    const user = await normalizeLegacyOwnerMetadata(client, fetchedUser);

    // Passive sync: avoid blocking UI but ensure data consistency
    syncClerkUserToSupabase(user, { allowServiceRoleFallback: false }).catch((err) => {
      console.warn(
        `[Authz] Background sync skipped for ${userId}: ${describeBackgroundSyncError(err)}`,
      );
    });

    const isAdmin =
      adminUserIds.has(userId) ||
      isAdminRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      });
    const isMax =
      maxUserIds.has(userId) ||
      isCreatorInboxEmail(fetchedUser.primaryEmailAddress?.emailAddress) ||
      isMaxRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      });

    const badgeIds = [
      ...extractBadgeIds(user.publicMetadata),
      ...extractBadgeIds(user.privateMetadata),
      ...(isMax ? ["max"] : isAdmin ? ["admin"] : []),
    ];

    const firstName = user.firstName?.trim() || "";
    const lastName = user.lastName?.trim() || "";
    const username =
      user.username?.trim() ||
      user.primaryEmailAddress?.emailAddress?.trim() ||
      user.primaryPhoneNumber?.phoneNumber?.trim() ||
      userId;
    const email = user.primaryEmailAddress?.emailAddress?.trim() || null;
    const displayNameMode =
      getDisplayNameModeOverride(userId) ??
      extractDisplayNameModeFromMetadata(user.unsafeMetadata) ??
      extractDisplayNameModeFromMetadata(user.publicMetadata) ??
      extractDisplayNameModeFromMetadata(user.privateMetadata) ??
      normalizeDisplayNameMode(storedProfile?.display_name_mode);
    const displayName = 
      resolveAccountDisplayName({
        firstName,
        lastName,
        username,
        userId,
        mode: displayNameMode,
      }) || storedProfile?.display_name?.trim() || username;
    const handle = storedProfile?.handle?.trim() || username;

    const actorNameOptions = buildActorNameOptions(
      firstName || null,
      username,
      userId,
    );

    const metadataRole =
      extractRole(user.publicMetadata) ?? extractRole(user.privateMetadata);

    const resolvedRole = resolveProfile({ metadataRole, isAdmin, isMax });

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
      badges: mapBadgeIdsToBadges([
        ...badgeIds,
        getRoleBadgeId(resolvedRole),
        getProfileBadgeId(resolvedRole),
      ]),
    };
  } catch (error) {
    console.error("Current user identity resolution failed", error);
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
    };
  }
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

async function getDevAuthBypassSession() {
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

  return {
    userId: getDevAuthBypassUserId(),
    role: getDevAuthBypassRole(),
    displayName: getDevAuthBypassDisplayName(),
    username: getDevAuthBypassUsername(),
  };
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
