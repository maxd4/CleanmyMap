import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { resolveActionOrganizer } from "./organizer-directory-registry";

export async function resolveActionUpdateOrganizer(params: {
  supabase: SupabaseClient;
  body: ActionUpdateInput;
  current: Pick<ActionRow, "organizer_type" | "organizer_id" | "organizer_name" | "actor_name" | "created_by_clerk_id">;
}): Promise<ActionUpdateInput> {
  const { body, current } = params;
  if (body.organizerType === undefined && body.organizerId === undefined && body.organizerName === undefined) {
    return body;
  }
  const resolved = await resolveActionOrganizer({
    supabase: params.supabase,
    organizerType: body.organizerType ?? current.organizer_type ?? "spontaneous",
    organizerId: body.organizerId ?? current.organizer_id,
    organizerName: body.organizerName ?? current.organizer_name,
    actorName: current.actor_name,
    createdByClerkId: current.created_by_clerk_id,
  });
  return {
    ...body,
    organizerType: body.organizerType ?? current.organizer_type,
    organizerId: resolved.organizerId,
    organizerName: resolved.organizerName,
    associationName: resolved.legacyAssociationName,
  };
}
