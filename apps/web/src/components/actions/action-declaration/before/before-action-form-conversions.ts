import {
  applyPreparationDataToForm,
  createInitialFormState,
  normalizeParticipantAccounts,
  parseOrganizerAccounts,
} from "../payload";
import { loadDraftSnapshot } from "../draft-storage";
import { fetchActionById } from "@/lib/actions/http";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import type { FormState } from "../model";
import { sanitizePreActionForm } from "./model";

export function createInitialBeforeActionForm(
  actorName: string,
  recordType: "action",
): FormState {
  return {
    ...createInitialFormState(actorName, recordType),
    interventionMode: createActionInterventionMode(),
    volunteersCount: "",
    childrenCount: "",
    adultCount: "",
    retiredCount: "",
  };
}

export function buildBeforeActionFormFromAction({
  action,
  resolvedDefaultActorName,
  initialRecordType,
}: {
  action: Awaited<ReturnType<typeof fetchActionById>>;
  resolvedDefaultActorName: string;
  initialRecordType: "action";
}): FormState {
  const hydrated = sanitizePreActionForm(
    applyPreparationDataToForm(
      createInitialBeforeActionForm(resolvedDefaultActorName, initialRecordType),
      action.preparationData,
    ),
  );
  const routeTopology = resolveActionRouteTopology({
    topology: action.preparationData?.routeTopology,
    arrivalLocationLabel: action.arrivalLocationLabel ?? hydrated.arrivalLocationLabel,
    recordType: "action",
  });
  return {
    ...hydrated,
    ...buildBeforeActionIdentityFields(action, hydrated),
    ...buildBeforeActionLocationFields(action, hydrated, routeTopology),
    ...buildBeforeActionTimingFields(action, hydrated),
  };
}

type BeforeActionIdentityFields = Pick<
  FormState,
  | "actorName"
  | "associationName"
  | "organizerType"
  | "organizerId"
  | "organizerName"
  | "actionContext"
  | "schoolContextConfirmed"
  | "organizerAccounts"
  | "participantAccounts"
  | "groupJoinEnabled"
  | "accessMode"
>;

function buildBeforeActionIdentityFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
): BeforeActionIdentityFields {
  return {
    actorName: action.actorName ?? hydrated.actorName,
    associationName: action.associationName ?? hydrated.associationName,
    organizerType: action.organizerType ?? hydrated.organizerType,
    organizerId: action.organizerId ?? hydrated.organizerId,
    organizerName:
      action.organizerName ??
      (action.organizerType === "spontaneous"
        ? hydrated.organizerName
        : action.associationName ?? hydrated.organizerName),
    actionContext: action.actionContext ?? hydrated.actionContext,
    schoolContextConfirmed: action.schoolContextConfirmed ?? hydrated.schoolContextConfirmed,
    organizerAccounts: parseOrganizerAccounts(
      action.organizerAccounts?.join(", ") ?? hydrated.organizerAccounts,
    ).join(", "),
    groupJoinEnabled: action.groupJoinEnabled,
    accessMode: action.accessMode ?? "public",
    participantAccounts: normalizeParticipantAccounts(action.participantAccounts),
  };
}

function buildBeforeActionLocationFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
  routeTopology: FormState["routeTopology"],
): Pick<
  FormState,
  | "actionDate"
  | "locationLabel"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeTopology"
  | "latitude"
  | "longitude"
> {
  return {
    actionDate: action.actionDate,
    locationLabel: action.locationLabel,
    departureLocationLabel: action.departureLocationLabel ?? hydrated.departureLocationLabel,
    arrivalLocationLabel: routeTopology === "point_to_point" ? action.arrivalLocationLabel ?? hydrated.arrivalLocationLabel : "",
    routeTopology,
    latitude: typeof action.latitude === "number" && Number.isFinite(action.latitude) ? String(action.latitude) : hydrated.latitude,
    longitude: typeof action.longitude === "number" && Number.isFinite(action.longitude) ? String(action.longitude) : hydrated.longitude,
  };
}

function buildBeforeActionTimingFields(
  action: Awaited<ReturnType<typeof fetchActionById>>,
  hydrated: FormState,
): Pick<FormState, "eventStartTime" | "eventEndTime" | "volunteersCount" | "durationMinutes"> {
  return {
    eventStartTime: action.eventStartTime ?? hydrated.eventStartTime,
    eventEndTime: action.eventEndTime ?? hydrated.eventEndTime,
    volunteersCount: typeof action.preparationData?.volunteersExpected === "number" ? String(action.preparationData.volunteersExpected) : "",
    durationMinutes: resolveActionDurationInput(action),
  };
}

function resolveActionDurationInput(
  action: Awaited<ReturnType<typeof fetchActionById>>,
): string {
  if (action.preparationData?.durationMinutesDeclared === true) {
    return String(action.durationMinutes);
  }
  if (typeof action.preparationData?.estimatedDurationMinutes === "number") {
    return String(action.preparationData.estimatedDurationMinutes);
  }
  return action.durationMinutes > 0 ? String(action.durationMinutes) : "";
}

export function buildBeforeActionFallbackForm(
  actorNameOptions: string[],
  defaultActorName: string,
  initialRecordType: "action",
): FormState {
  return sanitizePreActionForm(
    createInitialBeforeActionForm(
      actorNameOptions.includes(defaultActorName) ? defaultActorName : actorNameOptions[0] ?? defaultActorName,
      initialRecordType,
    ),
  );
}

export function buildBeforeActionInitialForm(
  actorNameOptions: string[],
  defaultActorName: string,
  initialRecordType: "action",
  actionId: string | null | undefined = null,
): FormState {
  const fallback = buildBeforeActionFallbackForm(actorNameOptions, defaultActorName, initialRecordType);
  const snapshot = loadDraftSnapshot(fallback, initialRecordType, actionId ?? null);
  return sanitizePreActionForm(snapshot?.form ?? fallback);
}
