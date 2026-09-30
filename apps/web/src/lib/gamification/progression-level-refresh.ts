import type { SupabaseClient } from "@supabase/supabase-js";
import { logFailure } from "@/lib/logging/failure-log";

export async function loadPreviousLevel(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { data: existingProfile, error } = await supabase
      .from("progression_profiles")
      .select("current_level")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (existingProfile as { current_level?: number | null } | null)?.current_level ?? 1;
  } catch (readError) {
    logFailure("Gamification/LevelUp", "Previous level read failed", readError, { userId });
    return 1;
  }
}

export async function notifyLevelUp(
  supabase: SupabaseClient,
  userId: string,
  previousLevel: number,
  currentLevel: number,
): Promise<void> {
  if (currentLevel <= previousLevel) return;

  try {
    const { error } = await supabase.from("app_notifications").insert({
      user_id: userId,
      type: "system",
      title: "Niveau Supérieur ! 🏆",
      content: `Félicitations ! Vous avez atteint le niveau ${currentLevel}. Votre impact sur CleanMyMap grandit !`,
      payload: { oldLevel: previousLevel, newLevel: currentLevel },
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (notificationError) {
    logFailure("Gamification/LevelUp", "Notification write skipped", notificationError, { userId });
  }
}
