import { validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import { resolveActionOrganizers } from "@/lib/actions/participation/organizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
