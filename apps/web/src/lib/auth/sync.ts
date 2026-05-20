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

const MAX_HANDLE_LENGTH = 30;

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name_mode: string | null;
};

function extractDisplayNameModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): DisplayNameMode | null {
  if (!metadata) {
    return null;
  }

  const rawValue =
    metadata["display_name_mode"] ??
    metadata["displayNameMode"];

  return typeof rawValue === "string" ? normalizeDisplayNameMode(rawValue) : null;
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
    (maxUserIds.size > 0
      ? maxUserIds.has(user.id)
      : adminUserIds.has(user.id));

  const metadataRole =
    (user.publicMetadata as any)?.role ||
    (user.publicMetadata as any)?.profile ||
    (user.privateMetadata as any)?.role ||
    (user.privateMetadata as any)?.profile;
  const profile = resolveProfile({ metadataRole, isAdmin, isMax });
  const persistedProfile = profile === "max" ? "imu" : profile;

  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";

  const rawArrondissement = (user.publicMetadata as any)?.parisArrondissement;
  const parsedArrondissement =
    typeof rawArrondissement === "number"
      ? rawArrondissement
      : typeof rawArrondissement === "string"
        ? parseInt(rawArrondissement, 10)
        : null;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name_mode")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (existingProfileError) {
    console.warn(
      `[User Sync] Could not read existing profile for ${user.id}: ${describeSyncError(existingProfileError)}`,
    );
  }

  const handle = await resolveUniqueHandle(
    supabase,
    user,
    existingProfile?.handle ?? null,
  );
  const displayNameMode: DisplayNameMode =
    getDisplayNameModeOverride(user.id) ??
    extractDisplayNameModeFromMetadata(user.unsafeMetadata as Record<string, unknown> | null | undefined) ??
    extractDisplayNameModeFromMetadata(user.publicMetadata as Record<string, unknown> | null | undefined) ??
    extractDisplayNameModeFromMetadata(user.privateMetadata as Record<string, unknown> | null | undefined) ??
    normalizeDisplayNameMode(existingProfile?.display_name_mode);
  const displayName = resolveAccountDisplayName({
    firstName,
    lastName,
    username: user.username?.trim() || null,
    userId: user.id,
    mode: displayNameMode,
  });

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name: displayName,
      display_name_mode: displayNameMode,
      handle,
      role_label: persistedProfile,
      avatar_url: user.imageUrl,
      paris_arrondissement:
        parsedArrondissement &&
        parsedArrondissement >= 1 &&
        parsedArrondissement <= 20
          ? parsedArrondissement
          : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.warn(
      `[User Sync] Sync skipped for user ${user.id}: ${describeSyncError(error)}`,
    );
    return null;
  }

  return data;
}
