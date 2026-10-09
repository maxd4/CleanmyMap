import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";

type ModerationNotificationClient = SupabaseClient;

function isDuplicateNotificationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

async function insertModerationNotification(
  supabase: ModerationNotificationClient,
  notification: {
    user_id: string;
    type: "validation";
    title: string;
    content: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("app_notifications").insert(notification);
  if (error && !isDuplicateNotificationError(error)) throw error;
}

export async function notifyActionValidation(
  supabase: ModerationNotificationClient,
  params: { actionId: string; userId: string | null },
): Promise<void> {
  if (!params.userId) {
    return;
  }

  const action = await runSingleActionQuery<{ location_label: string | null }>(
    supabase,
    (query) =>
      query
        .select("location_label")
        .eq("id", params.actionId)
        .maybeSingle(),
  );

  if (!action) {
    return;
  }

  await insertModerationNotification(supabase, {
    user_id: params.userId,
    type: "validation",
    title: "Action Validée !",
    content: `Votre action à ${action.location_label ?? "ce lieu"} a été approuvée. Merci pour votre impact !`,
    payload: {
      entityType: "action",
      id: params.actionId,
      moderationOutcome: "approved",
      eventKey: `moderation:action:${params.actionId}:approved`,
    },
  });
}

export async function notifyActionRejection(
  supabase: ModerationNotificationClient,
  params: { actionId: string; userId: string | null; reason: string | null },
): Promise<void> {
  if (!params.userId) return;

  const action = await runSingleActionQuery<{ location_label: string | null }>(
    supabase,
    (query) =>
      query
        .select("location_label")
        .eq("id", params.actionId)
        .maybeSingle(),
  );
  if (!action) return;

  const reason = params.reason?.trim();
  await insertModerationNotification(supabase, {
    user_id: params.userId,
    type: "validation",
    title: "Action refusée",
    content: `Votre action à ${action.location_label ?? "ce lieu"} a été refusée.${
      reason ? ` Motif : ${reason}` : ""
    }`,
    payload: {
      entityType: "action",
      id: params.actionId,
      moderationOutcome: "rejected",
      eventKey: `moderation:action:${params.actionId}:rejected`,
    },
  });
}

export async function notifySignalementValidation(
  supabase: ModerationNotificationClient,
  params: { spotId: string; userId: string | null },
): Promise<void> {
  if (!params.userId) {
    return;
  }

  const result = await supabase
    .from("trash_spotter_spots")
    .select("label")
    .eq("id", params.spotId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }
  if (!result.data) {
    return;
  }

  await insertModerationNotification(supabase, {
    user_id: params.userId,
    type: "validation",
    title: "Signalement Validé !",
    content: `Votre signalement à ${result.data.label} a été validé.`,
    payload: {
      entityType: "spot",
      id: params.spotId,
      moderationOutcome: "approved",
      eventKey: `moderation:spot:${params.spotId}:approved`,
    },
  });
}
