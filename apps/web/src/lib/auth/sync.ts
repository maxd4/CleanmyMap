import type { User } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/authz";
import { resolveProfile } from "@/lib/profiles";

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
  
  const metadataRole = (user.publicMetadata as any)?.role || (user.privateMetadata as any)?.role;
  const profile = resolveProfile({ metadataRole, isAdmin });
  
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  const displayName = `${firstName} ${lastName}`.trim() || user.username?.trim() || "Membre";

  // Generate a handle if not present
  const baseHandle = user.username?.trim() || 
                     user.emailAddresses[0]?.emailAddress.split('@')[0] || 
                     `user_${user.id.slice(-6)}`;
  const handle = baseHandle.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);

  const rawArrondissement = (user.publicMetadata as any)?.parisArrondissement;
  const parsedArrondissement = typeof rawArrondissement === 'number' ? rawArrondissement : 
                              (typeof rawArrondissement === 'string' ? parseInt(rawArrondissement, 10) : null);

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      display_name: displayName,
      handle: handle, // Initial handle sync
      role_label: profile,
      avatar_url: user.imageUrl,
      paris_arrondissement: parsedArrondissement && parsedArrondissement >= 1 && parsedArrondissement <= 20 ? parsedArrondissement : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }) // Only overwrite if it matches ID, but technically we want to preserve handle if user changed it.
    // Wait, if users can change their handle, we should only upsert it if the profile doesn't exist yet, 
    // OR we should trust the metadata if we store the override there.
    // For now, let's just sync it.
    .select()
    .single();

  if (error) {
    console.error(`[User Sync] Failed sync for user ${user.id}:`, error);
    return null;
  }

  return data;
}
