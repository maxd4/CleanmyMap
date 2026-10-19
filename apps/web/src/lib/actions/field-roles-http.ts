import { canManageAction, canManageActionsGlobally } from "./permissions";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadActionById } from "./store";
import { loadActionOrganizerRowsForAction } from "./participation/organizers";
import { readActionRegistrationRecord } from "./participation/registration-records";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function resolveActionFieldRoleAccess(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [action, identity, organizerRows] = await Promise.all([
    loadActionById(supabase, actionId),
    getCurrentUserIdentity({ userId }),
    loadActionOrganizerRowsForAction(supabase, actionId),
  ]);
  if (!action) return { ok: false as const, status: 404 as const, supabase };

  const organizerIds = organizerRows.map((row) => row.organizer_clerk_id.trim()).filter(Boolean);
  const manager = canManageAction(
    { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
    { createdByClerkId: action.created_by_clerk_id, actionPhase: action.action_phase, status: action.status },
    organizerIds,
  );
  const registration = manager ? null : await readActionRegistrationRecord(supabase, { actionId, userId });
  const confirmedVolunteer = registration?.registration_status === "confirmed";
  if (!manager && !confirmedVolunteer) {
    return { ok: false as const, status: 403 as const, supabase, action };
  }

  return {
    ok: true as const,
    supabase,
    action,
    identity,
    organizerRows,
    isManager: manager,
    isGlobalAdmin: canManageActionsGlobally({ activeRole: identity?.activeRole ?? null }),
    isCreator: action.created_by_clerk_id === userId,
    isPrimary: organizerRows.some((row) => row.is_primary && row.organizer_clerk_id.trim() === userId),
    confirmedVolunteer,
  };
}
