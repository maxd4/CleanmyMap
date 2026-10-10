import { appendEventRefToNotes } from "../../../lib/actions/event-link";
import type { CreateActionPayload } from "../../../lib/actions/types";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";
import { buildOrganizerPayloadFields, resolveOrganizerPayload } from "./organizer-payload";
import type { CreateActionPayloadParams, CreateActionPayloadParts } from "./payload-contract";

export function parseOrganizerAccounts(input: string): string[] {
  return [...new Set(
    input
      .split(/[,;\n]+/)
      .map((token) => token.trim())
      .map((token) => token.replace(/^@+/, ""))
      .filter((token) => token.length > 0),
  )];
}

export function normalizeParticipantAccounts(
  accounts: readonly string[] | null | undefined,
): string[] {
  return [
    ...new Set(
      (accounts ?? [])
        .map((token) => token.trim())
        .map((token) => token.replace(/^@+/, ""))
        .filter((token) => token.length > 0),
    ),
  ];
}

export function resolveCreateActionIdentityParts(
  params: CreateActionPayloadParams,
): Pick<
  CreateActionPayloadParts,
  "isSpontaneousAction" | "organizerName" | "associationName"
> {
  return resolveOrganizerPayload(params.form, params.isEntrepriseMode);
}

export function buildCreateActionPayloadIdentityFields(
  params: CreateActionPayloadParams,
  parts: CreateActionPayloadParts,
): Partial<CreateActionPayload> {
  const { form, declarationMode, linkedEventId } = params;
  const { departureLocationLabel, arrivalLocationLabel, routeTopology, routeLocationLabel } = parts;
  const organizerAccounts = parseOrganizerAccounts(form.organizerAccounts);
  const isFixedArea = normalizeActionInterventionMode(form.interventionMode)?.mode === "fixed_area";

  return {
    actorName: form.actorName.trim() || undefined,
    associationName: parts.associationName,
    ...buildOrganizerPayloadFields(form, parts.organizerName),
    groupJoinEnabled: form.groupJoinEnabled,
    actionPhase: declarationMode === "quick" ? "pre_action" : "post_action_complete",
    actionDate: form.actionDate,
    locationLabel: isFixedArea ? departureLocationLabel || form.locationLabel.trim() : routeLocationLabel,
    departureLocationLabel: departureLocationLabel || undefined,
    arrivalLocationLabel: isFixedArea
      ? undefined
      : form.recordType !== "action" || routeTopology === "point_to_point"
        ? arrivalLocationLabel || undefined
        : undefined,
    ...(isFixedArea ? {} : { routeTopology }),
    routeStyle: "souple",
    routeAdjustmentMessage: form.routeAdjustmentMessage.trim() || undefined,
    recordType: form.recordType,
    notes: appendEventRefToNotes(form.notes.trim() || undefined, linkedEventId),
    organizerAccounts: organizerAccounts.length ? organizerAccounts : undefined,
    participantAccounts: normalizeParticipantAccounts(form.participantAccounts),
    ...(form.placeType ? { placeType: form.placeType } : {}),
    submissionMode: declarationMode,
  };
}
