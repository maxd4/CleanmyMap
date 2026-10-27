import type { User } from "@clerk/nextjs/server";
import { prepareProfileAvatarUrl } from "@/lib/supabase/profile-avatar-storage";
import { resolveSyncRoleContext } from "./sync-role-context";
import {
  buildCompatibilityProfileMetadata,
  extractProfileMetadata,
  resolveProfileArrondissement,
} from "./sync-profile-metadata";
import {
  resolveDisplayNameForUser,
  resolveDisplayNameModeForUser,
} from "./sync-profile-label";
import { resolveUniqueHandle } from "./sync-handle";
import {
  loadExistingProfile,
  resolveWritableClient,
  upsertSyncedProfile,
} from "./sync-persistence";

export type SyncClerkUserOptions = {
  allowServiceRoleFallback?: boolean;
};

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
  if (!supabase) return null;

  const { role: profile, activeRole } = resolveSyncRoleContext(user);
  const profileMetadata = extractProfileMetadata(user);
  const existingProfile = await loadExistingProfile(supabase, user.id);
  const metadata = buildCompatibilityProfileMetadata(existingProfile, profileMetadata);
  const avatarUrl = await prepareProfileAvatarUrl({
    supabase,
    userId: user.id,
    sourceUrl: user.imageUrl || null,
    existingAvatarUrl: existingProfile?.avatar_url ?? null,
  });
  const handle = await resolveUniqueHandle(supabase, user, existingProfile?.handle ?? null);
  const displayNameMode = resolveDisplayNameModeForUser(user, existingProfile);
  const displayName = resolveDisplayNameForUser(user, displayNameMode, handle);

  return upsertSyncedProfile(supabase, user.id, {
    displayName,
    displayNameMode,
    handle,
    persistedProfile: profile,
    activeRole,
    avatarUrl: avatarUrl ?? user.imageUrl,
    profileMetadata: metadata,
    parisArrondissement: resolveProfileArrondissement(metadata) ?? existingProfile?.paris_arrondissement ?? null,
  });
}
