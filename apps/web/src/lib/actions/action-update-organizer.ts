import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { resolveActionOrganizer } from "./organizer-directory-registry";
import { normalizeActionPreparationData } from "@/lib/route/route-operational";

export async function resolveActionUpdateOrganizer(params: {
  supabase: SupabaseClient;
  body: ActionUpdateInput;
  current: Pick<ActionRow, "organizer_type" | "organizer_id" | "organizer_name" | "actor_name" | "created_by_clerk_id" | "preparation_data">;
  resolvedOrganizerAccountCount?: number;
}): Promise<ActionUpdateInput> {
  const { body, current } = params;
  const identityUnchanged = body.organizerAccounts === undefined
    && (!hasOrganizerFields(body) || organizerFieldsUnchanged(body, current));
  if (identityUnchanged) {
    // Historical actions may have a display-only organizer name without a
    // directory id or provenance. Keep that history when only preparation
    // fields are edited; client-supplied provenance is not an identity proof.
    if (body.preparationData === undefined) return body;
    const currentPreparationData = normalizeActionPreparationData(current.preparation_data ?? {});
    const nextPreparationData = normalizeActionPreparationData(body.preparationData ?? {});
    const preservedFields = { ...nextPreparationData };
    delete preservedFields.organizerReferenceStatus;
    const historicalStatus = (currentPreparationData as { organizerReferenceStatus?: unknown }).organizerReferenceStatus;
    return {
      ...body,
      preparationData: {
        ...preservedFields,
        ...(historicalStatus === undefined ? {} : { organizerReferenceStatus: historicalStatus }),
      } as ActionUpdateInput["preparationData"],
    };
  }
  const organizerType = body.organizerType ?? current.organizer_type ?? "spontaneous";
  const organizerTypeChanged = body.organizerType !== undefined
    && body.organizerType !== current.organizer_type;
  const currentPreparationData = normalizeActionPreparationData(current.preparation_data ?? {});
  const resolved = await resolveActionOrganizer({
    supabase: params.supabase,
    organizerType,
    organizerId: body.organizerId !== undefined
      ? body.organizerId
      : organizerTypeChanged
        ? null
        : current.organizer_id,
    organizerName: body.organizerName !== undefined
      ? body.organizerName
      : organizerTypeChanged
        ? null
        : current.organizer_name,
    actorName: current.actor_name,
    referenceStatus: body.preparationData?.organizerReferenceStatus ?? currentPreparationData.organizerReferenceStatus,
  });
  const nextPreparationData = body.preparationData === undefined
    ? currentPreparationData
    : normalizeActionPreparationData(body.preparationData ?? {});
  const referenceStatus = organizerType === "spontaneous"
    ? (params.resolvedOrganizerAccountCount ?? 0) > 0
      ? "referenced"
      : "declared_unreferenced"
    : resolved.referenceStatus;
  return {
    ...body,
    organizerType: body.organizerType ?? current.organizer_type,
    organizerId: resolved.organizerId,
    organizerName: resolved.organizerName,
    associationName: resolved.legacyAssociationName,
    preparationData: { ...nextPreparationData, organizerReferenceStatus: referenceStatus } as ActionUpdateInput["preparationData"],
  };
}

function hasOrganizerFields(body: ActionUpdateInput): boolean {
  return body.organizerType !== undefined
    || body.organizerId !== undefined
    || body.organizerName !== undefined
    || body.organizerAccounts !== undefined;
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
