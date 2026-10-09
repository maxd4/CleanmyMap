import { validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import { resolveActionOrganizers } from "@/lib/actions/participation/organizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "@/lib/actions/action-update-audit";

export function validateSpontaneousOrganizerPatch(
  current: Pick<ActionRow, "organizer_type">,
  parsed: ActionUpdateInput,
  persistedOrganizerIds: string[],
): Response | null {
  const nextOrganizerType = parsed.organizerType ?? current.organizer_type;
  const organizerAccounts = parsed.organizerAccounts;
  const organizerName = parsed.organizerName?.trim();
  const isExplicitlyUnassignedSpontaneous = nextOrganizerType === "spontaneous"
    && organizerAccounts !== undefined
    && organizerAccounts.length === 0;
  if (nextOrganizerType === "spontaneous" && organizerName
    && organizerName !== SPONTANEOUS_PENDING_ORGANIZER_LABEL
    && (organizerAccounts === undefined || isExplicitlyUnassignedSpontaneous)) {
    return validationErrorResponse({
      organizerAccounts: [
        "Sélectionnez un compte utilisateur comme organisateur ou choisissez « Autre ».",
      ],
    });
  }
  const hasPersistedOrganizer = persistedOrganizerIds.length > 0;
  const hasSelectedOrganizer = organizerAccounts === undefined
    ? hasPersistedOrganizer
    : organizerAccounts.length > 0;
  if (nextOrganizerType === "spontaneous"
    && parsed.actionPhase === "post_action_complete"
    && !hasSelectedOrganizer) {
    return validationErrorResponse({
      organizerAccounts: [
        "Une déclaration finale exige un compte utilisateur organisateur réel.",
      ],
    });
  }
  return null;
}

export async function validatePatchOrganizerAccounts({
  supabase,
  userId,
  identity,
  organizerAccounts,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerAccounts: string[] | undefined;
}): Promise<Response | null> {
  if (!organizerAccounts?.length) return null;
  const resolvedIdentity = identity ?? {
    displayName: userId,
    handle: userId,
    username: userId,
    email: null,
  };
  const organizerResolution = await resolveActionOrganizers({
    supabase,
    creator: {
      userId,
      displayName: resolvedIdentity.displayName?.trim() || userId,
      handle: resolvedIdentity.handle?.trim() || null,
      username: resolvedIdentity.username?.trim() || null,
      email: resolvedIdentity.email?.trim() || null,
    },
    organizerAccounts,
  });
  if (organizerResolution.unresolvedTokens.length === 0) return null;
  return validationErrorResponse({
    organizerAccounts: [
      `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
    ],
  });
}
