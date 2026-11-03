import type { SupabaseClient } from "@supabase/supabase-js";
import { logFailure } from "@/lib/logging/failure-log";

export class ProgressionProfileReadError extends Error {
  constructor(cause: unknown) {
    super("La lecture du profil de progression a échoué.", { cause });
    this.name = "ProgressionProfileReadError";
  }
}

export async function loadPreviousLevel(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ level: number; updatedAt: string | null }> {
  try {
    const { data: existingProfile, error } = await supabase
      .from("progression_profiles")
      .select("current_level, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    const profile = existingProfile as { current_level?: number | null; updated_at?: string | null } | null;
    return { level: profile?.current_level ?? 1, updatedAt: profile?.updated_at ?? null };
  } catch (readError) {
    const explicitReadError = readError instanceof ProgressionProfileReadError
      ? readError
      : new ProgressionProfileReadError(readError);
    logFailure("Gamification/LevelUp", "Previous level read failed", explicitReadError, { userId });
    throw explicitReadError;
  }
}

export async function notifyLevelUp(
  supabase: SupabaseClient,
  userId: string,
  previousLevel: number,
  currentLevel: number,
  options: { reconciliationId?: string } = {},
): Promise<void> {
  if (currentLevel <= previousLevel) return;

  try {
    const { error } = await supabase.from("app_notifications").insert({
      user_id: userId,
      type: "system",
      title: "Niveau Supérieur ! 🏆",
      content: `Félicitations ! Vous avez atteint le niveau ${currentLevel}. Votre impact sur CleanMyMap grandit !`,
      payload: {
        kind: "gamification_level_up",
        oldLevel: previousLevel,
        newLevel: currentLevel,
        ...(options.reconciliationId ? { reconciliationId: options.reconciliationId } : {}),
      },
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (notificationError) {
    logFailure("Gamification/LevelUp", "Notification write skipped", notificationError, { userId });
  }
}
