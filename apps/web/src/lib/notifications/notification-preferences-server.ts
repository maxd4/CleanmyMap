import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function loadNotificationPreferences(userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [{ data: preferences, error: preferencesError }, { data: mutes, error: mutesError }] = await Promise.all([
    supabase.from("notification_preferences")
      .select("informational_enabled, action_reminders_enabled")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("notification_information_mutes")
      .select("action_id")
      .eq("user_id", userId),
  ]);
  if (preferencesError) throw preferencesError;
  if (mutesError) throw mutesError;
  return {
    informationalEnabled: preferences?.informational_enabled !== false,
    actionRemindersEnabled: preferences?.action_reminders_enabled !== false,
    mutedInformationActionIds: (mutes ?? []).flatMap((mute) =>
      typeof mute.action_id === "string" ? [mute.action_id] : [],
    ),
  };
}
