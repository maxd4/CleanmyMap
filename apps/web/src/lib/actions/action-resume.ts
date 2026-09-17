import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import {
  canManageAction,
  type ActionPermissionIdentity,
} from "@/lib/actions/permissions";
import {
  loadActionById,
  loadActionResumeRowById,
  type ActionResumeRow,
} from "@/lib/actions/store";
import { isPublicActionReferenceAvailable } from "@/lib/chat/action-sharing";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionPhase } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ResumeIdentity = ActionPermissionIdentity;

export type ActionResumePhaseParams = {
  actionId: string;
  userId: string | null;
  identity: ResumeIdentity | null;
};

function normalizedActionId(actionId: string): string | null {
  const normalized = actionId.trim();
  return normalized.length > 0 ? normalized : null;
}

function phaseFromRlsRow(
  row: ActionResumeRow | null,
  isAnonymous: boolean,
): ActionPhase | null {
  if (!row) return null;

  // Anonymous RLS is intentionally limited to the public action contract.
  // Keep this defense here as well as in the database policy so a future
  // public projection cannot accidentally turn into a phase oracle.
  if (isAnonymous && !isPublicActionReferenceAvailable(row)) {
    return null;
  }

  return row.action_phase ?? null;
}

async function loadAuthorizedResumePhase(
  supabase: SupabaseClient,
  actionId: string,
  identity: ResumeIdentity,
): Promise<ActionPhase | null> {
  const action = await loadActionById(supabase, actionId).catch(() => null);
  if (!action) return null;

  // Public actions remain readable to an authenticated visitor even when the
  // Clerk token is temporarily unavailable and the explicit resolver is used.
  if (isPublicActionReferenceAvailable(action)) {
    return action.action_phase ?? null;
  }

  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
    supabase,
    actionId,
  ).catch(() => []);
  return canManageAction(identity, action, organizerIds)
    ? action.action_phase ?? null
    : null;
}

/**
 * Resolves only the phase needed to choose the initial action tab.
 *
 * Anonymous requests use the anon/RLS client and the public projection only.
 * Authenticated requests prefer Clerk/RLS. The service-role fallback is
 * restricted to authenticated users and rechecks the existing action
 * management capability before returning a private phase.
 */
export async function resolveActionResumePhase({
  actionId,
  userId,
  identity,
}: ActionResumePhaseParams): Promise<ActionPhase | null> {
  const normalizedId = normalizedActionId(actionId);
  if (!normalizedId) return null;

  if (!userId) {
    const publicClient = getSupabaseServerClient(false);
    const publicRow = await loadActionResumeRowById(publicClient, normalizedId).catch(
      () => null,
    );
    return phaseFromRlsRow(publicRow, true);
  }

  const rlsClient = await getSupabaseClerkRlsClient().catch(() => null);
  if (rlsClient) {
    const rlsRow = await loadActionResumeRowById(rlsClient, normalizedId).catch(
      () => null,
    );
    const rlsPhase = phaseFromRlsRow(rlsRow, false);
    if (rlsRow) return rlsPhase;
  }

  const permissionIdentity: ResumeIdentity = {
    userId,
    role: identity?.role ?? null,
    activeRole: identity?.activeRole ?? null,
  };
  return loadAuthorizedResumePhase(
    getSupabaseServerClient(true),
    normalizedId,
    permissionIdentity,
  );
}
