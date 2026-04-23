import type { User } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/authz";
import { resolveProfile } from "@/lib/profiles";

const MAX_HANDLE_LENGTH = 30;

type ProfileRow = {
  id: string;
  handle: string | null;
};

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

/**
 * Syncs a Clerk user profile to the Supabase 'profiles' table.
 * Uses the Admin client to ensure sync happens even if RLS is tight.
 */
export async function syncClerkUserToSupabase(user: User | null) {
  if (!user) return null;

  const supabase = getSupabaseAdminClient();

  const isAdmin = isAdminRole({
    publicMetadata: user.publicMetadata,
    privateMetadata: user.privateMetadata,
  });

  const metadataRole =
    (user.publicMetadata as any)?.role || (user.privateMetadata as any)?.role;
  const profile = resolveProfile({ metadataRole, isAdmin });

  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  const displayName =
    `${firstName} ${lastName}`.trim() || user.username?.trim() || "Membre";

  const rawArrondissement = (user.publicMetadata as any)?.parisArrondissement;
  const parsedArrondissement =
    typeof rawArrondissement === "number"
      ? rawArrondissement
      : typeof rawArrondissement === "string"
        ? parseInt(rawArrondissement, 10)
        : null;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, handle")
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

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name: displayName,
      handle,
      role_label: profile,
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
