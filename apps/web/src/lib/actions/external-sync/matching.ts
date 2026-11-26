import type {
  ExternalActionEvent,
  ExternalActionFieldConflict,
  ExternalActionSourceId,
} from "./types";

export type CandidateActionRow = {
  id: string;
  organizer_id: string | null;
  action_date: string;
  action_phase: string;
  status: string;
  published_at: string | null;
  location_label: string;
  notes: string | null;
  preparation_data: Record<string, unknown> | null;
  updated_at?: string;
};

export type MatchResult =
  | { kind: "none" }
  | { kind: "unambiguous"; action: CandidateActionRow }
  | { kind: "ambiguous"; candidateIds: string[] };

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readPrepString(prep: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!prep || typeof prep !== "object") return null;
  const val = prep[key];
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

function locationsCompatible(event: ExternalActionEvent, action: CandidateActionRow): boolean {
  const eventLoc = normalizeText(event.meetingPoint ?? event.address ?? event.commune ?? "");
  const actionLoc = normalizeText(action.location_label);
  if (!eventLoc || !actionLoc) return false;
  return eventLoc === actionLoc || actionLoc.includes(eventLoc) || eventLoc.includes(actionLoc);
}

/**
 * Conservative, deterministic matching against existing actions of the same organizer.
 * Never matches on title alone or fuzzy score; requires same organizer, same date,
 * known startTime, compatible location, and corroborating route or cross-reference.
 */
export function findMatchingCandidateActions(
  event: ExternalActionEvent,
  organizerDirectoryId: string,
  candidates: CandidateActionRow[],
  options: { truncated?: boolean } = {},
): MatchResult {
  const sameOrgAndDate = candidates.filter(
    (candidate) =>
      candidate.organizer_id === organizerDirectoryId &&
      candidate.action_date === event.actionDate,
  );
  if (sameOrgAndDate.length === 0) {
    return options.truncated ? { kind: "ambiguous", candidateIds: [] } : { kind: "none" };
  }

  // Without startTime or location, never auto-link; flag potential candidates for review.
  if (!event.startTime || !(event.meetingPoint || event.address || event.commune)) {
    return { kind: "ambiguous", candidateIds: sameOrgAndDate.map((c) => c.id) };
  }

  const eventRoute = normalizeText(event.routeReference ?? "");
  const crossRefs = new Set(event.crossReferences ?? []);

  const corroborated: CandidateActionRow[] = [];
  const plausible: CandidateActionRow[] = [];

  for (const candidate of sameOrgAndDate) {
    const prep = candidate.preparation_data ?? {};
    const candidateStartTime = readPrepString(prep, "meetingTime") ?? readPrepString(prep, "startTime");
    const candidateRoute = normalizeText(readPrepString(prep, "zoneCiblePrevue") ?? readPrepString(prep, "routeReference"));
    const candidateSourceUrl = readPrepString(prep, "externalSourceUrl");

    // Candidate local start time must be known and match exactly; unknown time requires human review.
    const sameTime = Boolean(candidateStartTime && candidateStartTime === event.startTime);
    const sameLocation = locationsCompatible(event, candidate);

    if (sameTime && sameLocation) {
      const hasRouteMatch = Boolean(eventRoute && candidateRoute && eventRoute === candidateRoute);
      const hasCrossRefMatch = Boolean(candidateSourceUrl && crossRefs.has(candidateSourceUrl));
      if (hasRouteMatch || hasCrossRefMatch) {
        corroborated.push(candidate);
      } else {
        plausible.push(candidate);
      }
    } else if (!candidateStartTime || candidateStartTime === event.startTime || sameLocation) {
      plausible.push(candidate);
    }
  }

  if (corroborated.length === 1 && plausible.length === 0 && !options.truncated) {
    return { kind: "unambiguous", action: corroborated[0] };
  }
  const allAmbiguous = [...corroborated, ...plausible];
  if (allAmbiguous.length > 0 || options.truncated) {
    return { kind: "ambiguous", candidateIds: allAmbiguous.map((c) => c.id) };
  }
  return { kind: "none" };
}

export function buildCanonicalLocationLabel(event: ExternalActionEvent): string {
  const parts = [event.meetingPoint, event.commune].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(" — ").slice(0, 240);
  if (event.address?.trim()) return event.address.trim().slice(0, 240);
  return event.title.slice(0, 240);
}

export function buildSourceSnapshotPayload(event: ExternalActionEvent): Record<string, unknown> {
  return {
    source: event.source,
    externalId: event.externalId,
    externalUrl: event.externalUrl,
    actionTitle: event.title,
    actionDate: event.actionDate,
    startTime: event.startTime ?? null,
    endTime: event.endTime ?? null,
    locationLabel: buildCanonicalLocationLabel(event),
    commune: event.commune ?? null,
    meetingPoint: event.meetingPoint ?? null,
    address: event.address ?? null,
    routeReference: event.routeReference ?? null,
    registrationUrl: event.registrationUrl ?? null,
    externalStatus: event.externalStatus,
    sourceRevision: event.sourceRevision ?? null,
    observedAt: event.observedAt,
  };
}

/**
 * Merges external updates onto an unpublished pre_action while preserving local edits.
 * J'agis pour la nature is preferred for schedule/meeting point when both sources are linked;
 * Fondation de la Mer fills missing fields without overwriting local or preferred values.
 */
export function computeExternalActionFieldMerge(params: {
  source: ExternalActionSourceId;
  incoming: ExternalActionEvent;
  previousSnapshot: Record<string, unknown> | null;
  currentAction: CandidateActionRow;
  hasPreferredJagisLink?: boolean;
}): {
  actionUpdates: Partial<{
    action_date: string;
    location_label: string;
    preparation_data: Record<string, unknown>;
  }>;
  conflicts: ExternalActionFieldConflict[];
  hasChanges: boolean;
} {
  const { source, incoming, previousSnapshot, currentAction, hasPreferredJagisLink } = params;
  const prep = { ...(currentAction.preparation_data ?? {}) };
  const prev = previousSnapshot ?? {};
  const conflicts: ExternalActionFieldConflict[] = [];
  const actionUpdates: Partial<{
    action_date: string;
    location_label: string;
    preparation_data: Record<string, unknown>;
  }> = {};
  let prepChanged = false;

  const isSecondaryMer = source === "fondation_de_la_mer" && Boolean(hasPreferredJagisLink);

  const checkField = (
    field: ExternalActionFieldConflict["field"],
    currentVal: string | null,
    prevVal: string | null,
    nextVal: string | null,
    apply: (val: string) => void,
    skipOverwriteIfSecondary = false,
  ) => {
    if (!nextVal || currentVal === nextVal) return;
    if (skipOverwriteIfSecondary && currentVal) return;

    const locallyModified = prevVal !== null && currentVal !== null && currentVal !== prevVal;
    const locallyEnriched = prevVal === null && currentVal !== null;

    if (locallyModified || locallyEnriched) {
      conflicts.push({
        field,
        localValue: currentVal,
        previousSyncedValue: prevVal,
        incomingValue: nextVal,
        source,
      });
      return;
    }

    apply(nextVal);
  };

  checkField(
    "actionDate",
    currentAction.action_date,
    typeof prev.actionDate === "string" ? prev.actionDate : null,
    incoming.actionDate,
    (val) => {
      actionUpdates.action_date = val;
    },
    isSecondaryMer,
  );

  checkField(
    "locationLabel",
    currentAction.location_label,
    typeof prev.locationLabel === "string" ? prev.locationLabel : null,
    buildCanonicalLocationLabel(incoming),
    (val) => {
      actionUpdates.location_label = val;
    },
    isSecondaryMer,
  );

  checkField(
    "actionTitle",
    readPrepString(prep, "actionTitle"),
    typeof prev.actionTitle === "string" ? prev.actionTitle : null,
    incoming.title,
    (val) => {
      prep.actionTitle = val;
      prepChanged = true;
    },
  );

  checkField(
    "startTime",
    readPrepString(prep, "meetingTime") ?? readPrepString(prep, "startTime"),
    typeof prev.startTime === "string" ? prev.startTime : null,
    incoming.startTime ?? null,
    (val) => {
      prep.meetingTime = val;
      prepChanged = true;
    },
    isSecondaryMer,
  );

  if (prepChanged) {
    actionUpdates.preparation_data = prep;
  }

  return {
    actionUpdates,
    conflicts,
    hasChanges:
      actionUpdates.action_date !== undefined ||
      actionUpdates.location_label !== undefined ||
      prepChanged,
  };
}
