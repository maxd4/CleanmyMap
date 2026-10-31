import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeActionRetrospectiveDraft,
  type ActionRetrospectiveDraftInput,
  type ActionRetrospectiveEditor,
  type ActionRetrospectivePublic,
} from "./action-retrospective-contract";

type ActionRetrospectiveRpcRow = {
  action_id: unknown;
  thanks_message: unknown;
  worked_well: unknown;
  blockers: unknown;
  improve_next_time: unknown;
  published_at: unknown;
  updated_at: unknown;
  notified_at?: unknown;
};

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid action retrospective ${field}`);
  }
  return value;
}

function parseEditorRow(value: unknown): ActionRetrospectiveEditor {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid action retrospective response");
  }
  const row = value as ActionRetrospectiveRpcRow;
  return {
    thanksMessage: readNullableString(row.thanks_message),
    workedWell: readNullableString(row.worked_well),
    blockers: readNullableString(row.blockers),
    improveNextTime: readNullableString(row.improve_next_time),
    publishedAt: readNullableString(row.published_at),
    updatedAt: readRequiredString(row.updated_at, "updated_at"),
  };
}

function parsePublicRow(value: unknown): ActionRetrospectivePublic {
  const parsed = parseEditorRow(value);
  if (!parsed.publishedAt) {
    throw new Error("Invalid published action retrospective response");
  }
  return parsed as ActionRetrospectivePublic;
}

function firstRpcRow(data: unknown): unknown | null {
  if (!Array.isArray(data)) return null;
  return data[0] ?? null;
}

function throwRpcError(error: { message?: string } | null): never {
  throw new Error(error?.message ?? "Action retrospective operation failed");
}

export async function loadActionRetrospectiveForActor(
  supabase: SupabaseClient,
  actionId: string,
  actorUserId: string,
): Promise<ActionRetrospectiveEditor | null> {
  const result = await supabase.rpc("read_action_retrospective_for_actor", {
    p_action_id: actionId,
    p_actor_user_id: actorUserId,
  });
  if (result.error) throwRpcError(result.error);
  const row = firstRpcRow(result.data);
  return row ? parseEditorRow(row) : null;
}

export async function saveActionRetrospective(
  supabase: SupabaseClient,
  actionId: string,
  actorUserId: string,
  input: ActionRetrospectiveDraftInput,
): Promise<ActionRetrospectiveEditor> {
  const draft = normalizeActionRetrospectiveDraft(input);
  const result = await supabase.rpc("save_action_retrospective", {
    p_action_id: actionId,
    p_actor_user_id: actorUserId,
    p_thanks_message: draft.thanksMessage ?? null,
    p_worked_well: draft.workedWell ?? null,
    p_blockers: draft.blockers ?? null,
    p_improve_next_time: draft.improveNextTime ?? null,
  });
  if (result.error) throwRpcError(result.error);
  const row = firstRpcRow(result.data);
  if (!row) throw new Error("Action retrospective save returned no row");
  return parseEditorRow(row);
}

export async function publishActionRetrospective(
  supabase: SupabaseClient,
  actionId: string,
  actorUserId: string,
): Promise<ActionRetrospectiveEditor> {
  const result = await supabase.rpc("publish_action_retrospective", {
    p_action_id: actionId,
    p_actor_user_id: actorUserId,
  });
  if (result.error) throwRpcError(result.error);
  const row = firstRpcRow(result.data);
  if (!row) throw new Error("Action retrospective publication returned no row");
  return parseEditorRow(row);
}

export async function loadPublicActionRetrospective(
  supabase: SupabaseClient,
  actionId: string,
): Promise<ActionRetrospectivePublic | null> {
  const result = await supabase.rpc("read_public_action_retrospective", {
    p_action_id: actionId,
  });
  if (result.error) throwRpcError(result.error);
  const row = firstRpcRow(result.data);
  return row ? parsePublicRow(row) : null;
}
