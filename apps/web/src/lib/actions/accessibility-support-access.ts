import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageAction } from "./permissions";
import { loadCanonicalActionOrganizerIdsForAction } from "./participation/organizers";
import { loadActionById } from "./store";
import { getCurrentUserIdentity } from "@/lib/authz";

export async function resolveAccessibilitySupportOrganizerAccess(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
) {
  const action = await loadActionById(supabase, params.actionId);
  if (!action) return { action: null, isOrganizer: false };
  const identity = await getCurrentUserIdentity({ userId: params.userId });
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, params.actionId);
  return {
    action,
    isOrganizer: canManageAction(
      { userId: params.userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
      { createdByClerkId: action.created_by_clerk_id },
      organizerIds,
    ),
  };
}
