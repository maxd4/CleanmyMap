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
  type ActionParticipantRecordRow,
  type ActionPreviewRow,
} from "./group-participation.helpers";
import {
  loadActionParticipantSummaries,
  type ActionParticipantSummary,
} from "./participant-summaries";
import type {
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "./group-participation-contract";

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

export async function loadUserParticipationHistory(
  supabase: SupabaseClient,
  params: {
    userId: string;
    limit: number;
  },
): Promise<JoinableActionHistoryItem[]> {
  try {
    if (params.limit <= 0) {
      return [];
    }

    const participationResult = await supabase
      .from("action_participants")
      .select("action_id, created_at, joined_at, updated_at, participation_status, participation_source")
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false })
      .order("joined_at", { ascending: false })
      .limit(params.limit);

    if (participationResult.error) {
      throw new Error(participationResult.error.message);
    }

    const participationRows = (participationResult.data ?? []) as ActionParticipantRecordRow[];

    if (participationRows.length === 0) {
      return [];
    }

    const actionIds = [...new Set(participationRows.map((row) => row.action_id))];
    const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
      query.select(ACTION_PREVIEW_COLUMNS).in("id", actionIds),
    );
    const actionById = new Map(actions.map((action) => [action.id, action] as const));

    const participantCounts = new Map<string, number>();
    const participantSummaryByActionId = new Map<string, ActionParticipantSummary>();
    const participantSummaries = await loadActionParticipantSummaries(supabase, {
      actionIds,
      userId: params.userId,
    });
    for (const summary of participantSummaries) {
      participantCounts.set(summary.actionId, summary.activeCount);
      participantSummaryByActionId.set(summary.actionId, summary);
    }

    return participationRows.flatMap((participation) => {
      const action = actionById.get(participation.action_id);
      if (!action) {
        return [];
      }

      const metadata = extractActionMetadataFromNotes(action.notes);
      const joined =
        participation.participation_status === ACTIVE_PARTICIPATION_STATUS;
      const awaitingApproval =
        participation.participation_status === PENDING_PARTICIPATION_STATUS;
      return [
        {
          ...action,
          actionPhase: action.action_phase ?? "post_action_complete",
          participantsCount: participantCounts.get(action.id) ?? 0,
          joined,
          awaitingApproval,
          joinedAt: resolveJoinedAt(participation),
          participationStatus: participation.participation_status,
          participationSource: participation.participation_source,
          participationUpdatedAt: resolveParticipationUpdatedAt(participation),
          groupJoinEnabled: metadata.groupJoinEnabled,
          pendingRequestsCount: Math.max(
            0,
            (participantSummaryByActionId.get(action.id)?.totalCount ?? 0) -
              (participantCounts.get(action.id) ?? 0),
          ),
        } satisfies JoinableActionHistoryItem,
      ];
    });
  } catch (error) {
    console.warn("[group-participation] unable to load participation history", {
      userId: params.userId,
      limit: params.limit,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
