import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionParticipantRow, ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";

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

async function loadActionParticipantsForActions(
  supabase: SupabaseClient,
  actionIds: string[],
): Promise<ActionParticipantRow[]> {
  if (actionIds.length === 0) {
    return [];
  }

  const result = await supabase
    .from("action_participants")
    .select("id, created_at, updated_at, action_id, user_id")
    .in("action_id", actionIds)
    .order("created_at", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as ActionParticipantRow[];
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
  const actionsResult = await supabase
    .from("actions")
    .select(
      "id, created_at, action_date, location_label, volunteers_count, duration_minutes, status, notes",
    )
    .eq("status", "approved")
    .order("action_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (actionsResult.error) {
    throw new Error(actionsResult.error.message);
  }

  const actions = (actionsResult.data ?? []) as ActionPreviewRow[];
  if (actions.length === 0) {
    return [];
  }

  let orderedActions = actions;
  if (params.actionId) {
    const focusedActionResult = await supabase
      .from("actions")
      .select(
        "id, created_at, action_date, location_label, volunteers_count, duration_minutes, status, notes",
      )
      .eq("id", params.actionId)
      .eq("status", "approved")
      .maybeSingle();

    if (focusedActionResult.error) {
      throw new Error(focusedActionResult.error.message);
    }

    if (focusedActionResult.data) {
      orderedActions = [
        focusedActionResult.data as ActionPreviewRow,
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

export async function joinActionParticipation(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<{
  alreadyJoined: boolean;
  joinedAt: string;
  participantsCount: number;
}> {
  const actionResult = await supabase
    .from("actions")
    .select("id, status, notes")
    .eq("id", params.actionId)
    .maybeSingle();

  if (actionResult.error) {
    throw new Error(actionResult.error.message);
  }

  if (!actionResult.data) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.data.status !== "approved") {
    const validationError = new Error(
      "L'action doit être validée par un admin avant de rejoindre son formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const actionMetadata = extractActionMetadataFromNotes(actionResult.data.notes);
  if (actionMetadata.groupJoinEnabled === false) {
    const validationError = new Error(
      "L'organisateur n'a pas ouvert ce formulaire de groupe.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const existingResult = await supabase
    .from("action_participants")
    .select("id, created_at, action_id, user_id")
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
        .select("id, created_at, action_id, user_id")
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
