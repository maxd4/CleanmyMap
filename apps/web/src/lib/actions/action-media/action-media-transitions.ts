import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTION_MEDIA_BUCKET,
  type ActionMediaMimeType,
  type ActionMediaRecord,
  type ActionMediaUploadState,
} from "./action-media-contract";

export type ActionMediaRow = {
  id: string;
  action_id: string;
  created_at: string;
  created_by_clerk_id: string;
  client_upload_id: string;
  storage_bucket: typeof ACTION_MEDIA_BUCKET;
  storage_path: string;
  original_name: string;
  mime_type: ActionMediaMimeType;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  upload_state: ActionMediaUploadState;
};

export type ActionMediaReadyResult = {
  media: ActionMediaRecord;
  alreadyReady: boolean;
};

export type ActionMediaTransitionDependencies = {
  storageError: (message: string) => Error;
  verifyStoredActionMediaObject: (supabase: SupabaseClient, row: ActionMediaRow) => Promise<void>;
  toRecord: (row: ActionMediaRow) => ActionMediaRecord;
};

const ACTION_MEDIA_ALLOWED_TRANSITIONS: Record<ActionMediaUploadState, readonly ActionMediaUploadState[]> = {
  pending: ["pending", "failed", "ready"],
  failed: ["pending", "failed", "ready"],
  ready: ["ready"],
};

function isAllowedActionMediaTransition(
  from: ActionMediaUploadState,
  to: ActionMediaUploadState,
): boolean {
  return ACTION_MEDIA_ALLOWED_TRANSITIONS[from].includes(to);
}

export async function markActionMediaReady(
  supabase: SupabaseClient,
  row: ActionMediaRow,
  dependencies: ActionMediaTransitionDependencies,
): Promise<ActionMediaReadyResult> {
  let candidate = row;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!isAllowedActionMediaTransition(candidate.upload_state, "ready")) {
      throw dependencies.storageError("La transition de la photo est invalide.");
    }
    const updated = await supabase
      .from("action_media")
      .update({ upload_state: "ready", failure_reason: null })
      .eq("id", candidate.id)
      .eq("action_id", candidate.action_id)
      .eq("upload_state", candidate.upload_state)
      .select("*")
      .maybeSingle();
    if (updated.error) throw dependencies.storageError("La photo ne peut pas être marquée comme prête.");
    if (updated.data) {
      return { media: dependencies.toRecord(updated.data as ActionMediaRow), alreadyReady: false };
    }

    const reread = await supabase
      .from("action_media")
      .select("*")
      .eq("id", candidate.id)
      .eq("action_id", candidate.action_id)
      .maybeSingle();
    if (reread.error) throw dependencies.storageError("La photo ne peut pas être relue après une course concurrente.");
    if (!reread.data) throw dependencies.storageError("La photo ne peut pas être marquée comme prête.");
    const latest = reread.data as ActionMediaRow;
    if (latest.upload_state === "ready") {
      await dependencies.verifyStoredActionMediaObject(supabase, latest);
      return { media: dependencies.toRecord(latest), alreadyReady: true };
    }
    if (latest.upload_state === candidate.upload_state) {
      throw dependencies.storageError("La photo ne peut pas être marquée comme prête.");
    }
    candidate = latest;
  }
  throw dependencies.storageError("La photo ne peut pas être marquée comme prête.");
}

export async function markActionMediaFailedIfCurrent(
  supabase: SupabaseClient,
  row: ActionMediaRow,
  failureReason: string,
  dependencies: ActionMediaTransitionDependencies,
): Promise<ActionMediaReadyResult | null> {
  if (!isAllowedActionMediaTransition(row.upload_state, "failed")) {
    throw dependencies.storageError("La transition d'échec de la photo est invalide.");
  }
  const updated = await supabase
    .from("action_media")
    .update({ upload_state: "failed", failure_reason: failureReason })
    .eq("id", row.id)
    .eq("action_id", row.action_id)
    .eq("upload_state", row.upload_state)
    .select("*")
    .maybeSingle();
  if (updated.error) throw dependencies.storageError("L'état d'échec de la photo ne peut pas être enregistré.");
  if (updated.data) return null;

  const reread = await supabase
    .from("action_media")
    .select("*")
    .eq("id", row.id)
    .eq("action_id", row.action_id)
    .maybeSingle();
  if (reread.error) throw dependencies.storageError("La photo ne peut pas être relue après une course concurrente.");
  if (!reread.data) throw dependencies.storageError("La photo n'existe plus.");
  const latest = reread.data as ActionMediaRow;
  if (latest.upload_state === "ready") {
    await dependencies.verifyStoredActionMediaObject(supabase, latest);
    return { media: dependencies.toRecord(latest), alreadyReady: true };
  }
  return null;
}

export async function prepareRetryState(
  supabase: SupabaseClient,
  row: ActionMediaRow,
  dependencies: ActionMediaTransitionDependencies,
): Promise<ActionMediaRow | ActionMediaReadyResult> {
  let candidate = row;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!isAllowedActionMediaTransition(candidate.upload_state, "pending")) {
      throw dependencies.storageError("La transition de retry de la photo est invalide.");
    }
    const pending = await supabase
      .from("action_media")
      .update({ upload_state: "pending", failure_reason: null })
      .eq("id", candidate.id)
      .eq("action_id", candidate.action_id)
      .eq("upload_state", candidate.upload_state)
      .select("*")
      .maybeSingle();
    if (pending.error) throw dependencies.storageError("La nouvelle tentative photo ne peut pas être préparée.");
    if (pending.data) return pending.data as ActionMediaRow;

    const reread = await supabase
      .from("action_media")
      .select("*")
      .eq("id", candidate.id)
      .eq("action_id", candidate.action_id)
      .maybeSingle();
    if (reread.error) throw dependencies.storageError("La photo ne peut pas être relue après une course concurrente.");
    if (!reread.data) throw dependencies.storageError("La nouvelle tentative photo ne peut pas être préparée.");
    const latest = reread.data as ActionMediaRow;
    if (latest.upload_state === "ready") {
      await dependencies.verifyStoredActionMediaObject(supabase, latest);
      return { media: dependencies.toRecord(latest), alreadyReady: true };
    }
    if (latest.upload_state === candidate.upload_state) {
      throw dependencies.storageError("La nouvelle tentative photo ne peut pas être préparée.");
    }
    candidate = latest;
  }
  throw dependencies.storageError("La nouvelle tentative photo ne peut pas être préparée.");
}
