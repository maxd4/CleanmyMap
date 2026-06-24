import type { User } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminRole, isMaxRole } from "@/lib/authz";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
  resolveProfile,
  type DisplayNameMode,
} from "@/lib/profiles";
import { isCreatorInboxEmail } from "@/lib/auth/privileged-identities";
import { getDisplayNameModeOverride } from "@/lib/account/display-name-mode-store";
import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";

const MAX_HANDLE_LENGTH = 30;

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name_mode: string | null;
};

type ProfileMetadata = Record<string, unknown> | null;
type MetadataSource = Record<string, unknown> | null | undefined;
type SyncRoleContext = {
  metadataRole: string | null;
  isAdmin: boolean;
  isMax: boolean;
};
type SyncedProfileRow = Record<string, unknown> & { id: string };

function readMetadataValue(
  metadata: MetadataSource,
  key: string,
): unknown {
  return metadata?.[key];
}

function readMetadataString(
  metadata: MetadataSource,
  key: string,
): string | null {
  const value = readMetadataValue(metadata, key);
  return typeof value === "string" ? value : null;
}

function extractDisplayNameModeFromMetadata(
  metadata: MetadataSource,
): DisplayNameMode | null {
  const rawValue =
    readMetadataString(metadata, "display_name_mode") ??
    readMetadataString(metadata, "displayNameMode");

  return rawValue ? normalizeDisplayNameMode(rawValue) : null;
}

function extractProfileMetadataFromSource(
  metadata: MetadataSource,
): ProfileMetadata {
  if (!metadata) {
    return null;
  }

  const keys = [
    "zoneName",
    "zoneDepartment",
    "zoneAreaType",
    "zoneLocationType",
    "parisArrondissement",
    "parisLocationType",
    "profileSetupCompleted",
    "profileSetupVersion",
    "profileSetupSchemaVersion",
  ] as const;

  const extracted: Record<string, unknown> = {};
  for (const key of keys) {
    const value = metadata[key];
    if (value !== undefined) {
      extracted[key] = value;
    }
  }

  return Object.keys(extracted).length > 0 ? extracted : null;
}

function extractProfileMetadata(user: User): Record<string, unknown> {
  const sources = [
    user.unsafeMetadata as MetadataSource,
    user.publicMetadata as MetadataSource,
    user.privateMetadata as MetadataSource,
  ];

  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    const extracted = extractProfileMetadataFromSource(source);
    if (!extracted) continue;
    for (const [key, value] of Object.entries(extracted)) {
      if (merged[key] === undefined) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function resolveSyncRoleContext(
  user: User,
  adminUserIds: Set<string>,
  maxUserIds: Set<string>,
): SyncRoleContext {
  const metadataRole =
    readMetadataString(user.publicMetadata as MetadataSource, "role") ??
    readMetadataString(user.publicMetadata as MetadataSource, "profile") ??
    readMetadataString(user.privateMetadata as MetadataSource, "role") ??
    readMetadataString(user.privateMetadata as MetadataSource, "profile");
  const isAdmin = isAdminRole({
    publicMetadata: user.publicMetadata,
    privateMetadata: user.privateMetadata,
  });
  const isMax =
    isCreatorInboxEmail(user.primaryEmailAddress?.emailAddress) ||
    isMaxRole({
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata,
    }) ||
    (maxUserIds.size > 0 ? maxUserIds.has(user.id) : adminUserIds.has(user.id));

  return { metadataRole, isAdmin, isMax };
}

function resolveProfileArrondissement(
  user: User,
  profileMetadata: Record<string, unknown>,
): number | null {
  const rawArrondissement = readMetadataValue(
    user.publicMetadata as MetadataSource,
    "parisArrondissement",
  );

  const parsedArrondissement =
    typeof rawArrondissement === "number"
      ? rawArrondissement
      : typeof rawArrondissement === "string"
        ? parseInt(rawArrondissement, 10)
        : null;

  const metadataZoneName =
    typeof profileMetadata.zoneName === "string"
      ? profileMetadata.zoneName
      : null;
  const inferredArrondissement = metadataZoneName
    ? extractArrondissementFromLabel(metadataZoneName)
    : null;

  return parsedArrondissement &&
    parsedArrondissement >= 1 &&
    parsedArrondissement <= 20
    ? parsedArrondissement
    : inferredArrondissement;
}

function resolveDisplayNameModeForUser(
  user: User,
  existingProfile: ProfileRow | null,
): DisplayNameMode {
  return (
    getDisplayNameModeOverride(user.id) ??
    extractDisplayNameModeFromMetadata(user.unsafeMetadata as MetadataSource) ??
    extractDisplayNameModeFromMetadata(user.publicMetadata as MetadataSource) ??
    extractDisplayNameModeFromMetadata(user.privateMetadata as MetadataSource) ??
    normalizeDisplayNameMode(existingProfile?.display_name_mode)
  );
}

function resolvePersistedProfileLabel(profile: string): string {
  return profile === "max" ? "imu" : profile;
}

function resolveDisplayNameForUser(
  user: User,
  displayNameMode: DisplayNameMode,
): string {
  return resolveAccountDisplayName({
    firstName: user.firstName?.trim() ?? "",
    lastName: user.lastName?.trim() ?? "",
    username: user.username?.trim() || null,
    userId: user.id,
    mode: displayNameMode,
  });
}

async function loadExistingProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name_mode")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.warn(
      `[User Sync] Could not read existing profile for ${userId}: ${describeSyncError(error)}`,
    );
  }

  return data ?? null;
}

async function upsertSyncedProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  payload: {
    displayName: string;
    displayNameMode: DisplayNameMode;
    handle: string;
    persistedProfile: string;
    avatarUrl: string;
    profileMetadata: Record<string, unknown>;
    parisArrondissement: number | null;
  },
): Promise<SyncedProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: payload.displayName,
        display_name_mode: payload.displayNameMode,
        handle: payload.handle,
        role_label: payload.persistedProfile,
        avatar_url: payload.avatarUrl,
        metadata: payload.profileMetadata,
        paris_arrondissement: payload.parisArrondissement,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select()
    .single<SyncedProfileRow>();

  if (error) {
    console.warn(
      `[User Sync] Sync skipped for user ${userId}: ${describeSyncError(error)}`,
    );
    return null;
  }

  return data ?? null;
}

export type SyncClerkUserOptions = {
  allowServiceRoleFallback?: boolean;
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

function normalizeHandleSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.slice(0, MAX_HANDLE_LENGTH);
}

function buildFallbackHandle(userId: string): string {
  return `user_${userId.slice(-6).toLowerCase()}`;
}

async function isHandleAvailable(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  handle: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !data || data.id === userId;
}

async function resolveUniqueHandle(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  user: User,
  existingHandle: string | null,
): Promise<string> {
  const preservedHandle = existingHandle?.trim() ?? "";
  if (preservedHandle.length > 0) {
    return preservedHandle;
  }

  const baseHandleSource =
    user.username?.trim() ||
    user.emailAddresses[0]?.emailAddress.split("@")[0] ||
    buildFallbackHandle(user.id);

  const baseHandle =
    normalizeHandleSegment(baseHandleSource) || buildFallbackHandle(user.id);
  if (await isHandleAvailable(supabase, baseHandle, user.id)) {
    return baseHandle;
  }

  const suffixSource = buildFallbackHandle(user.id).slice("user_".length);
  const compactBase = baseHandle.slice(
    0,
    Math.max(1, MAX_HANDLE_LENGTH - suffixSource.length - 1),
  );
  const fallbackCandidates = [
    `${compactBase}_${suffixSource}`,
    `${compactBase}_${suffixSource}_1`,
    `${compactBase}_${suffixSource}_2`,
  ]
    .map((candidate) => normalizeHandleSegment(candidate))
    .filter((candidate) => candidate.length > 0);

  for (const candidate of fallbackCandidates) {
    if (await isHandleAvailable(supabase, candidate, user.id)) {
      return candidate;
    }
  }

  return normalizeHandleSegment(`${compactBase}_${user.id.slice(-10)}`);
}

function describeSyncError(error: unknown): string {
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

async function resolveWritableClient(allowServiceRoleFallback: boolean) {
  if (!allowServiceRoleFallback) {
    return null;
  }

  return getSupabaseAdminClient();
}

/**
 * Syncs a Clerk user profile to the Supabase 'profiles' table.
 * Prefers the Clerk/RLS client and only falls back to the admin client when explicitly allowed.
 */
export async function syncClerkUserToSupabase(
  user: User | null,
  options: SyncClerkUserOptions = {},
) {
  if (!user) return null;

  const supabase = await resolveWritableClient(options.allowServiceRoleFallback ?? true);
  if (!supabase) {
    return null;
  }
  const adminUserIds = parseUserIds(env.CLERK_ADMIN_USER_IDS);
  const maxUserIds = parseUserIds(env.CLERK_MAX_USER_IDS);
  const { metadataRole, isAdmin, isMax } = resolveSyncRoleContext(
    user,
    adminUserIds,
    maxUserIds,
  );
  const profile = resolveProfile({ metadataRole, isAdmin, isMax });
  const persistedProfile = resolvePersistedProfileLabel(profile);
  const profileMetadata = extractProfileMetadata(user);
  const existingProfile = await loadExistingProfile(supabase, user.id);

  const handle = await resolveUniqueHandle(
    supabase,
    user,
    existingProfile?.handle ?? null,
  );
  const displayNameMode = resolveDisplayNameModeForUser(user, existingProfile);
  const displayName = resolveDisplayNameForUser(user, displayNameMode);

  return upsertSyncedProfile(supabase, user.id, {
    displayName,
    displayNameMode,
    handle,
    persistedProfile,
    avatarUrl: user.imageUrl,
    profileMetadata,
    parisArrondissement: resolveProfileArrondissement(user, profileMetadata),
  });
}
