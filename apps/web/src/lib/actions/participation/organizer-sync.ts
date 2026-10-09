import { insertActionOrganizers } from "../store-participants";
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
  const currentPrimaryId = currentRows.find((row) => row.is_primary)?.organizer_clerk_id.trim();
  const nextOrganizers = resolution.organizers.map((organizer, index) => ({
    ...organizer,
    isPrimary: currentPrimaryId
      ? organizer.userId === currentPrimaryId
      : index === 0,
  }));

  const deleteResult = await params.supabase
    .from("action_organizers")
    .delete()
    .eq("action_id", params.actionId);
  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (nextOrganizers.length > 0) {
    await insertActionOrganizers(params.supabase, params.actionId, nextOrganizers);
  }
  return { ...resolution, organizers: nextOrganizers };
}
