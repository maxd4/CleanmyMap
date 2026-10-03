import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";

type ModerationNotificationClient = SupabaseClient;

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

  const { error } = await supabase.from("app_notifications").insert({
    user_id: params.userId,
    type: "validation",
    title: "Action Validée !",
    content: `Votre action à ${action.location_label ?? "ce lieu"} a été approuvée. Merci pour votre impact !`,
    payload: { entityType: "action", id: params.actionId },
  });

  if (error) {
    throw error;
  }
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

  const { error } = await supabase.from("app_notifications").insert({
    user_id: params.userId,
    type: "validation",
    title: "Signalement Validé !",
    content: `Votre signalement à ${result.data.label} a été validé.`,
    payload: { entityType: "spot", id: params.spotId },
  });

  if (error) {
    throw error;
  }
}
