import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { describeUnknownError } from "@/lib/errors/app-errors";
import type { AppProfile, DisplayNameMode } from "@/lib/profiles";
import type { ProfileRow } from "./sync-profile-metadata";

type SyncedProfileRow = Record<string, unknown> & { id: string };

export async function resolveWritableClient(allowServiceRoleFallback: boolean) {
  if (!allowServiceRoleFallback) return null;
  return getSupabaseAdminClient();
}

export async function loadExistingProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name_mode, avatar_url, metadata, paris_arrondissement")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn(`[User Sync] Could not read existing profile for ${userId}: ${describeUnknownError(error)}`);
  }
  return (data as ProfileRow | null) ?? null;
}

export async function upsertSyncedProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  payload: {
    displayName: string;
    displayNameMode: DisplayNameMode;
    handle: string;
    persistedProfile: string;
    activeRole: AppProfile;
    avatarUrl: string | null;
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
        active_role_label: payload.activeRole,
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
    console.warn(`[User Sync] Sync skipped for user ${userId}: ${describeUnknownError(error)}`);
    return null;
  }
  return data ?? null;
}
