import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import {
  runActionQuery,
  runSingleActionQuery,
  type ActionQuery,
} from "@/lib/actions/query";
import {
  getActionParisDate,
  isJoinableFuturePreAction,
} from "@/lib/actions/temporal";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTION_PREVIEW_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  buildJoinableItem,
  PENDING_PARTICIPATION_STATUS,
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  getActionTitle,
  type ActionParticipantRecordRow,
  type ActionPreviewRow,
} from "./group-participation.helpers";
import {
  type ActionRegistrationStatusRow,
  resolveRegisteredAt,
  resolveRegistrationUpdatedAt,
} from "./registration-records";
import {
  loadActionParticipantSummaries,
  type ActionParticipantSummary,
} from "./participant-summaries";
import type {
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "./group-participation-contract";
import { usesRegistrationStore } from "./action-phase";
import { loadParticipantImpactAttributions } from "./group-participation-impact-read";
export {
  loadActionParticipantImpactSnapshot,
  type ActionParticipantImpactSnapshot,
} from "./group-participation-impact-read";
import {
  INDIVIDUAL_IMPACT_SELECT,
  toIndividualImpactMeasurement,
  type ActionParticipantImpactAttribution,
} from "./individual-impact";

export function isVisibleInGroupForms(
  action: Pick<
    ActionPreviewRow,
    | "action_date"
    | "event_start_time"
    | "action_phase"
    | "status"
    | "moderation_visibility"
    | "published_at"
  >,
  metadata: { groupJoinEnabled: boolean },
  now = new Date(),
): boolean {
  return isJoinableFuturePreAction(action, metadata, now);
}

function configureJoinableActionQuery(
  query: ActionQuery,
  now: Date,
  actionId?: string | null,
): ActionQuery {
  let nextQuery = query
    .select(ACTION_PREVIEW_COLUMNS)
    .eq("action_phase", "pre_action")
    .eq("moderation_visibility", "visible")
    .in("status", ["approved", "pending"])
    .not("published_at", "is", null)
    .gte("action_date", getActionParisDate(now));

  if (actionId) {
    nextQuery = nextQuery.eq("id", actionId);
  }

  return nextQuery;
}

export async function loadJoinableActions(
  supabase: SupabaseClient,
  params: {
    limit: number;
    userId: string | null;
    actionId?: string | null;
    now?: Date;
  },
): Promise<JoinableActionItem[]> {
  const now = params.now ?? new Date();
  const fetchLimit = Math.max(params.limit * 4, params.limit);
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    configureJoinableActionQuery(query, now)
      .order("action_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
  );
  if (actions.length === 0) {
    return [];
  }

  let orderedActions = actions;
  if (params.actionId) {
    const focusedAction = await runSingleActionQuery<ActionPreviewRow>(supabase, (query) =>
      configureJoinableActionQuery(query, now, params.actionId)
        .maybeSingle(),
    );

    if (focusedAction) {
      orderedActions = [
        focusedAction,
        ...actions.filter((action) => action.id !== params.actionId),
      ].slice(0, fetchLimit);
    }
  }

  const joinableActions = orderedActions
    .map((action) => ({
      action,
      metadata: extractActionMetadataFromNotes(action.notes),
    }))
    .filter(({ action, metadata }) => isVisibleInGroupForms(action, metadata, now))
    .slice(0, params.limit);

  if (joinableActions.length === 0) {
    return [];
  }

  const actionIds = joinableActions.map(({ action }) => action.id);
  const participantSummaries = await loadActionParticipantSummaries(supabase, {
    actionIds,
    userId: params.userId,
  });

  const participantCounts = new Map<string, number>();
  const participantSummaryByActionId = new Map<string, ActionParticipantSummary>();
  for (const summary of participantSummaries) {
    participantCounts.set(summary.actionId, summary.activeCount);
    participantSummaryByActionId.set(summary.actionId, summary);
  }

  return joinableActions.map(({ action, metadata }) =>
    buildJoinableItem(
      action,
      metadata,
      participantCounts.get(action.id) ?? 0,
      participantSummaryByActionId.get(action.id) ?? null,
    ),
  );
}

export type ConfirmedParticipantImpactAttribution = {
  actionId: string;
  actionDate: string;
  userId: string;
  attribution: ActionParticipantImpactAttribution;
};

/**
 * Loads the current user's personal impact from the confirmed participant
 * roster. Children and form counters are intentionally absent from this
 * contract: one confirmed account is one attribution unit.
 */
export async function loadConfirmedParticipantImpactAttributions(
  supabase: SupabaseClient,
  userId: string,
  limit = 6000,
): Promise<ConfirmedParticipantImpactAttribution[]> {
  const participantResult = await supabase
    .from("action_participants")
    .select(`user_id, action_id, participation_status, ${INDIVIDUAL_IMPACT_SELECT}`)
    .eq("user_id", userId)
    .eq("participation_status", ACTIVE_PARTICIPATION_STATUS)
    .limit(limit);
  if (participantResult.error) {
    throw new Error(participantResult.error.message);
  }

  const participantRows = (participantResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const actionIds = [
    ...new Set(
      participantRows
        .map((row) => (typeof row.action_id === "string" ? row.action_id : null))
        .filter((actionId): actionId is string => Boolean(actionId)),
    ),
  ];
  if (actionIds.length === 0) return [];

  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query.select(ACTION_PREVIEW_COLUMNS).in("id", actionIds).limit(limit),
  );
  const actionById = new Map(actions.map((action) => [action.id, action] as const));
  const finalActionIds = actions
    .filter((action) => action.status === "approved" && !usesRegistrationStore(action.action_phase))
    .map((action) => action.id);
  const participantImpactByActionId = await loadParticipantImpactAttributions(
    supabase,
    actionById,
    finalActionIds,
  );

  return participantRows.flatMap((row) => {
    const actionId = typeof row.action_id === "string" ? row.action_id : null;
    const participantUserId = typeof row.user_id === "string" ? row.user_id : null;
    const action = actionId ? actionById.get(actionId) : null;
    const attribution = actionId && participantUserId
      ? participantImpactByActionId.get(actionId)?.get(participantUserId)
      : null;
    if (!actionId || !participantUserId || !action || !attribution) return [];
    return [{ actionId, actionDate: action.action_date, userId: participantUserId, attribution }];
  });
}

type ParticipationHistoryContext = {
  actionIds: string[];
  actionById: Map<string, ActionPreviewRow>;
  registrationRows: ActionRegistrationStatusRow[];
  participationRows: ActionParticipantRecordRow[];
  participantImpactByActionId: Awaited<ReturnType<typeof loadParticipantImpactAttributions>>;
  participantCounts: Map<string, number>;
  participantSummaryByActionId: Map<string, ActionParticipantSummary>;
};

async function loadParticipationHistorySources(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
) {
  const [registrationResult, participationResult] = await Promise.all([
    supabase.from("action_registrations")
      .select("action_id, created_at, registered_at, updated_at, registration_status, registration_source")
      .eq("user_id", params.userId).order("updated_at", { ascending: false })
      .order("registered_at", { ascending: false }).limit(params.limit),
    supabase.from("action_participants")
      .select(`user_id, action_id, created_at, joined_at, updated_at, participation_status, participation_source, ${INDIVIDUAL_IMPACT_SELECT}`)
      .eq("user_id", params.userId).order("updated_at", { ascending: false })
      .order("joined_at", { ascending: false }).limit(params.limit),
  ]);
  if (registrationResult.error) throw new Error(registrationResult.error.message);
  if (participationResult.error) throw new Error(participationResult.error.message);
  return {
    registrationRows: (registrationResult.data ?? []) as ActionRegistrationStatusRow[],
    participationRows: (participationResult.data ?? []) as unknown as ActionParticipantRecordRow[],
  };
}

async function loadParticipationHistoryContext(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<ParticipationHistoryContext | null> {
  const sources = await loadParticipationHistorySources(supabase, params);
  if (sources.registrationRows.length === 0 && sources.participationRows.length === 0) return null;
  const actionIds = [...new Set([
    ...sources.registrationRows.map((row) => row.action_id),
    ...sources.participationRows.map((row) => row.action_id),
  ])];
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query.select(ACTION_PREVIEW_COLUMNS).in("id", actionIds),
  );
  const actionById = new Map(actions.map((action) => [action.id, action] as const));
  const finalActionIds = actionIds.filter((actionId) => {
    const action = actionById.get(actionId);
    return action && !usesRegistrationStore(action.action_phase);
  });
  const participantImpactByActionId = await loadParticipantImpactAttributions(supabase, actionById, finalActionIds);
  const participantCounts = new Map<string, number>();
  const participantSummaryByActionId = new Map<string, ActionParticipantSummary>();
  const summaries = await loadActionParticipantSummaries(supabase, { actionIds, userId: params.userId });
  for (const summary of summaries) {
    participantCounts.set(summary.actionId, summary.activeCount);
    participantSummaryByActionId.set(summary.actionId, summary);
  }
  return { actionIds, actionById, ...sources, participantImpactByActionId, participantCounts, participantSummaryByActionId };
}

function buildActionHistoryItems(
  context: ParticipationHistoryContext,
  actionId: string,
): JoinableActionHistoryItem[] {
  const action = context.actionById.get(actionId);
  if (!action) return [];
  const registrations = context.registrationRows.filter((row) => row.action_id === actionId);
  const participations = context.participationRows.filter((row) => row.action_id === actionId);
  const records = usesRegistrationStore(action.action_phase)
    ? registrations.map((registration) => ({
        status: registration.registration_status, source: registration.registration_source,
        joinedAt: resolveRegisteredAt(registration), updatedAt: resolveRegistrationUpdatedAt(registration),
      }))
    : participations.map((participation) => ({
        status: participation.participation_status, source: participation.participation_source,
        joinedAt: resolveJoinedAt(participation), updatedAt: resolveParticipationUpdatedAt(participation),
        participantId: participation.user_id, individualImpact: toIndividualImpactMeasurement(participation),
      }));
  const metadata = extractActionMetadataFromNotes(action.notes);
  return records.map((record) => {
    const publicAction = { ...action };
    delete publicAction.preparation_data;
    return {
      ...publicAction,
      actionTitle: getActionTitle(action), actionPhase: action.action_phase ?? "post_action_complete",
      participantsCount: context.participantCounts.get(action.id) ?? 0,
      joined: record.status === ACTIVE_PARTICIPATION_STATUS,
      awaitingApproval: record.status === PENDING_PARTICIPATION_STATUS,
      joinedAt: record.joinedAt, participationStatus: record.status, participationSource: record.source,
      participationUpdatedAt: record.updatedAt, groupJoinEnabled: metadata.groupJoinEnabled,
      pendingRequestsCount: Math.max(0, (context.participantSummaryByActionId.get(action.id)?.totalCount ?? 0) - (context.participantCounts.get(action.id) ?? 0)),
      individualImpact: "individualImpact" in record ? record.individualImpact : null,
      personalImpactAttribution: "participantId" in record
        ? context.participantImpactByActionId.get(action.id)?.get(record.participantId) ?? null
        : null,
    } satisfies JoinableActionHistoryItem;
  });
}

function buildParticipationHistory(
  context: ParticipationHistoryContext,
  limit: number,
): JoinableActionHistoryItem[] {
  return context.actionIds.flatMap((actionId) => buildActionHistoryItems(context, actionId))
    .sort((left, right) => (right.participationUpdatedAt ?? "").localeCompare(left.participationUpdatedAt ?? ""))
    .slice(0, limit);
}

export async function loadUserParticipationHistory(
  supabase: SupabaseClient,
  params: { userId: string; limit: number },
): Promise<JoinableActionHistoryItem[]> {
  try {
    if (params.limit <= 0) return [];
    const context = await loadParticipationHistoryContext(supabase, params);
    return context ? buildParticipationHistory(context, params.limit) : [];
  } catch (error) {
    console.warn("[group-participation] unable to load participation history", {
      userId: params.userId,
      limit: params.limit,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
