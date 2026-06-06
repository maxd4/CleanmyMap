import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";

export type JoinableActionItem = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "action_date"
  | "location_label"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
> & {
  participantsCount: number;
  joined: boolean;
  joinedAt: string | null;
  groupJoinEnabled: boolean;
};

export type JoinableActionHistoryItem = Omit<JoinableActionItem, "joined" | "joinedAt"> & {
  joined: true;
  joinedAt: string;
};

type ActionParticipantActionRow = {
  action_id: string;
};

type ActionPreviewRow = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "action_date"
  | "location_label"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
  | "notes"
>;
const ACTION_PREVIEW_COLUMNS =
  "id, created_at, action_date, location_label, volunteers_count, duration_minutes, status, notes";
const ACTION_PARTICIPATION_COLUMNS = "status, notes";

async function loadActionParticipantsForActions(
  supabase: SupabaseClient,
  actionIds: string[],
): Promise<ActionParticipantActionRow[]> {
  if (actionIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from("action_participants")
    .select("action_id")
    .in("action_id", actionIds)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as ActionParticipantActionRow[];
}

export async function loadJoinableActions(
  supabase: SupabaseClient,
  params: {
    limit: number;
    userId: string | null;
    actionId?: string | null;
  },
): Promise<JoinableActionItem[]> {
  const fetchLimit = Math.max(params.limit * 4, params.limit);
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query
      .select(ACTION_PREVIEW_COLUMNS)
      .eq("status", "approved")
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
      query
        .select(ACTION_PREVIEW_COLUMNS)
        .eq("id", params.actionId)
        .eq("status", "approved")
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
    .filter(({ metadata }) => metadata.groupJoinEnabled !== false)
    .slice(0, params.limit);

  if (joinableActions.length === 0) {
    return [];
  }

  const actionIds = joinableActions.map(({ action }) => action.id);
  const [participantRows, joinedRows] = await Promise.all([
    loadActionParticipantsForActions(supabase, actionIds),
    params.userId
      ? supabase
          .from("action_participants")
          .select("action_id, created_at")
          .eq("user_id", params.userId)
          .in("action_id", actionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (params.userId && joinedRows.error) {
    throw new Error(joinedRows.error.message);
  }

  const participantCounts = new Map<string, number>();
  for (const row of participantRows) {
    participantCounts.set(
      row.action_id,
      (participantCounts.get(row.action_id) ?? 0) + 1,
    );
  }

  const joinedByActionId = new Map<string, string>();
  for (const row of (joinedRows.data ?? []) as Array<{
    action_id: string;
    created_at: string;
  }>) {
    joinedByActionId.set(row.action_id, row.created_at);
  }

  return joinableActions.map(({ action, metadata }) => ({
    ...action,
    participantsCount: participantCounts.get(action.id) ?? 0,
    joined: joinedByActionId.has(action.id),
    joinedAt: joinedByActionId.get(action.id) ?? null,
    groupJoinEnabled: metadata.groupJoinEnabled,
  }));
}

export async function loadUserParticipationHistory(
  supabase: SupabaseClient,
  params: {
    userId: string;
    limit: number;
  },
): Promise<JoinableActionHistoryItem[]> {
  if (params.limit <= 0) {
    return [];
  }

  const participationResult = await supabase
    .from("action_participants")
    .select("action_id, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit);

  if (participationResult.error) {
    throw new Error(participationResult.error.message);
  }

  const participationRows = (participationResult.data ?? []) as Array<{
    action_id: string;
    created_at: string;
  }>;

  if (participationRows.length === 0) {
    return [];
  }

  const actionIds = [...new Set(participationRows.map((row) => row.action_id))];
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query.select(ACTION_PREVIEW_COLUMNS).in("id", actionIds),
  );
  const actionById = new Map(
    actions.map((action) => [action.id, action] as const),
  );

  const participantRows = await loadActionParticipantsForActions(supabase, actionIds);

  const participantCounts = new Map<string, number>();
  for (const row of participantRows) {
    participantCounts.set(
      row.action_id,
      (participantCounts.get(row.action_id) ?? 0) + 1,
    );
  }

  return participationRows.flatMap((participation) => {
    const action = actionById.get(participation.action_id);
    if (!action) {
      return [];
    }

    const metadata = extractActionMetadataFromNotes(action.notes);
    return [
      {
        ...action,
        participantsCount: participantCounts.get(action.id) ?? 0,
        joined: true,
        joinedAt: participation.created_at,
        groupJoinEnabled: metadata.groupJoinEnabled,
      } satisfies JoinableActionHistoryItem,
    ];
  });
}

export async function joinActionParticipation(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<{
  alreadyJoined: boolean;
  joinedAt: string;
  participantsCount: number;
}> {
  const actionResult = await runSingleActionQuery<{
    status: "pending" | "approved" | "rejected";
    notes: string | null;
  }>(supabase, (query) => query.select(ACTION_PARTICIPATION_COLUMNS).eq("id", params.actionId).maybeSingle());

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.status !== "approved") {
    const validationError = new Error(
      "L'action doit être validée par un admin avant de rejoindre son formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const actionMetadata = extractActionMetadataFromNotes(actionResult.notes);
  if (actionMetadata.groupJoinEnabled === false) {
    const validationError = new Error(
      "L'organisateur n'a pas ouvert ce formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const existingResult = await supabase
    .from("action_participants")
    .select("created_at")
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  if (existingResult.data) {
    const participantsCountResult = await supabase
      .from("action_participants")
      .select("id", { count: "exact", head: true })
      .eq("action_id", params.actionId);

    if (participantsCountResult.error) {
      throw new Error(participantsCountResult.error.message);
    }

    return {
      alreadyJoined: true,
      joinedAt: existingResult.data.created_at,
      participantsCount: Number(participantsCountResult.count ?? 0),
    };
  }

  const insertedResult = await supabase
    .from("action_participants")
    .insert({
      action_id: params.actionId,
      user_id: params.userId,
    })
    .select("id, created_at")
    .single();

  if (insertedResult.error) {
    if (insertedResult.error.code === "23505") {
      const duplicateResult = await supabase
        .from("action_participants")
        .select("created_at")
        .eq("action_id", params.actionId)
        .eq("user_id", params.userId)
        .maybeSingle();

      if (duplicateResult.error) {
        throw new Error(duplicateResult.error.message);
      }

      const participantsCountResult = await supabase
        .from("action_participants")
        .select("id", { count: "exact", head: true })
        .eq("action_id", params.actionId);

      if (participantsCountResult.error) {
        throw new Error(participantsCountResult.error.message);
      }

      return {
        alreadyJoined: true,
        joinedAt: duplicateResult.data?.created_at ?? new Date().toISOString(),
        participantsCount: Number(participantsCountResult.count ?? 0),
      };
    }

    throw new Error(insertedResult.error.message);
  }

  const participantsCountResult = await supabase
    .from("action_participants")
    .select("id", { count: "exact", head: true })
    .eq("action_id", params.actionId);

  if (participantsCountResult.error) {
    throw new Error(participantsCountResult.error.message);
  }

  return {
    alreadyJoined: false,
    joinedAt: insertedResult.data.created_at,
    participantsCount: Number(participantsCountResult.count ?? 0),
  };
}
