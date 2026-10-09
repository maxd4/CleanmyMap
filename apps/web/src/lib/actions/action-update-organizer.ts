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
  if (!hasOrganizerFields(body)) {
    return body;
  }
  if (organizerFieldsUnchanged(body, current)) {
    // Historical actions may have a display-only organizer name without a
    // directory id. Preserve it when the edit does not change the organizer.
    return body;
  }
  const resolved = await resolveActionOrganizer({
    supabase: params.supabase,
    organizerType: body.organizerType ?? current.organizer_type ?? "spontaneous",
    organizerId: body.organizerId ?? current.organizer_id,
    organizerName: body.organizerName ?? current.organizer_name,
    actorName: current.actor_name,
  });
  return {
    ...body,
    organizerType: body.organizerType ?? current.organizer_type,
    organizerId: resolved.organizerId,
    organizerName: resolved.organizerName,
    associationName: resolved.legacyAssociationName,
  };
}

function hasOrganizerFields(body: ActionUpdateInput): boolean {
  return body.organizerType !== undefined
    || body.organizerId !== undefined
    || body.organizerName !== undefined;
}

function organizerFieldsUnchanged(
  body: ActionUpdateInput,
  current: Pick<ActionRow, "organizer_type" | "organizer_id" | "organizer_name">,
): boolean {
  const typeUnchanged = body.organizerType === undefined || body.organizerType === current.organizer_type;
  const idUnchanged = body.organizerId === undefined
    || (body.organizerId?.trim() || null) === (current.organizer_id?.trim() || null);
  const nameUnchanged = body.organizerName === undefined
    || body.organizerName.trim() === (current.organizer_name ?? "").trim();
  return typeUnchanged && idUnchanged && nameUnchanged;
}
