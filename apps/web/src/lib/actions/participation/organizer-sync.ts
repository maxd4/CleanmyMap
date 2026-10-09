import {
  loadActionOrganizerRowsForAction,
  resolveActionOrganizers,
  type ActionAccountResolutionParams,
  type ActionOrganizerResolution,
  uniqueTokens,
} from "./organizers";

export async function syncActionOrganizers(
  params: ActionAccountResolutionParams & {
    actionId: string;
    organizerAccounts?: string[] | null;
  },
): Promise<ActionOrganizerResolution> {
  const requestedAccounts = uniqueTokens(params.organizerAccounts ?? []);
  const resolution = await resolveActionOrganizers({
    supabase: params.supabase,
    creator: params.creator,
    organizerAccounts: requestedAccounts,
  });
  if (resolution.unresolvedTokens.length > 0) {
    return resolution;
  }

  const currentRows = await loadActionOrganizerRowsForAction(
    params.supabase,
    params.actionId,
  );
  const nextOrganizerIds = new Set(
    resolution.organizers.map((organizer) => organizer.userId),
  );
  const currentPrimaryId = currentRows.find(
    (row) => row.is_primary && nextOrganizerIds.has(row.organizer_clerk_id.trim()),
  )?.organizer_clerk_id.trim();
  const primaryId = currentPrimaryId ?? resolution.organizers[0]?.userId;
  const nextOrganizers = resolution.organizers.map((organizer) => ({
    ...organizer,
    isPrimary: organizer.userId === primaryId,
  }));

  const replacement = await params.supabase.rpc("replace_action_organizers", {
    p_action_id: params.actionId,
    p_organizers: nextOrganizers.map((organizer) => ({
      organizer_clerk_id: organizer.userId,
      organizer_label: organizer.displayName,
      organizer_handle: organizer.handle,
      is_primary: organizer.isPrimary,
    })),
  });
  if (replacement.error) {
    throw new Error(replacement.error.message);
  }

  return { ...resolution, organizers: nextOrganizers };
}
