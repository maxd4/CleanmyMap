import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createInitialSRSState, SRSStats } from "@/lib/gamification/quiz-srs";

const LOCAL_STORAGE_KEY = "cleanmymap_quiz_srs";

/**
 * Charge les données SRS pour une liste de questions
 */
export async function loadQuizSRSData(userId: string | null, questionIds: string[]): Promise<Record<string, SRSStats>> {
  const data: Record<string, SRSStats> = {};

  if (userId) {
    const supabase = getSupabaseBrowserClient();
    const { data: dbData, error } = await supabase
      .from("quiz_srs")
      .select("*")
      .eq("user_id", userId)
      .in("question_id", questionIds);

    if (!error && dbData) {
      dbData.forEach((row: any) => {
        data[row.question_id] = {
          question_id: row.question_id,
          last_seen_at: row.last_seen_at,
          next_review_at: row.next_review_at,
          success_count: row.success_count,
          failure_count: row.failure_count,
          streak: row.streak,
          ease_factor: row.ease_factor,
          mastery_level: row.mastery_level,
        };
      });
    }
  } else {
    // LocalStorage fallback
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      questionIds.forEach(id => {
        if (parsed[id]) data[id] = parsed[id];
      });
    }
  }

  // Initialisation pour les questions sans état
  questionIds.forEach(id => {
    if (!data[id]) {
      data[id] = createInitialSRSState(id);
    }
  });

  return data;
}

/**
 * Sauvegarde l'état SRS d'une question
 */
export async function saveQuizSRSState(userId: string | null, stats: SRSStats): Promise<void> {
  if (userId) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("quiz_srs")
      .upsert({
        user_id: userId,
        question_id: stats.question_id,
        last_seen_at: stats.last_seen_at,
        next_review_at: stats.next_review_at,
        success_count: stats.success_count,
        failure_count: stats.failure_count,
        streak: stats.streak,
        ease_factor: stats.ease_factor,
        mastery_level: stats.mastery_level,
      }, { onConflict: "user_id,question_id" });
    
    if (error) console.error("[QuizSRS] Error saving to DB:", error);
  } else {
    // LocalStorage fallback
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = local ? JSON.parse(local) : {};
    parsed[stats.question_id] = stats;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  }
}
