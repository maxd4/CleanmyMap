import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createInitialSRSState, SRSStats } from "@/lib/gamification/quiz-srs";

const LOCAL_STORAGE_KEY = "cleanmymap_quiz_srs";
const QUIZ_SRS_CACHE_TTL_MS = 60_000;

type QuizSrsCacheEntry = {
  cachedAt: number;
  data: Record<string, SRSStats>;
};

const quizSrsCache = new Map<string, QuizSrsCacheEntry>();

type QuizSrsRow = {
  question_id: string;
  last_seen_at: string | undefined;
  next_review_at: string;
  success_count: number;
  failure_count: number;
  streak: number;
  ease_factor: number;
  mastery_level: number;
};

type QuizSrsTableClient = {
  from(table: "quiz_srs"): {
    select(columns: string): {
      eq(column: "user_id", value: string): {
        in(column: "question_id", values: string[]): Promise<{ data: QuizSrsRow[] | null; error: unknown }>;
      };
    };
    upsert(
      value: {
        user_id: string;
        question_id: string;
        last_seen_at: string | undefined;
        next_review_at: string;
        success_count: number;
        failure_count: number;
        streak: number;
        ease_factor: number;
        mastery_level: number;
      },
      options: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
};

type AccessTokenProvider = () => Promise<string | null>;

function getQuizSrsCacheKey(userId: string, questionIds: string[]): string {
  return `${userId}::${[...questionIds].sort().join("|")}`;
}

function cloneSrsData(data: Record<string, SRSStats>): Record<string, SRSStats> {
  return Object.fromEntries(Object.entries(data).map(([questionId, stats]) => [questionId, { ...stats }]));
}

function seedQuizSrsCache(userId: string, questionIds: string[], data: Record<string, SRSStats>): void {
  quizSrsCache.set(getQuizSrsCacheKey(userId, questionIds), {
    cachedAt: Date.now(),
    data: cloneSrsData(data),
  });
}

function readQuizSrsCache(userId: string, questionIds: string[]): Record<string, SRSStats> | null {
  const entry = quizSrsCache.get(getQuizSrsCacheKey(userId, questionIds));
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt > QUIZ_SRS_CACHE_TTL_MS) {
    quizSrsCache.delete(getQuizSrsCacheKey(userId, questionIds));
    return null;
  }

  return cloneSrsData(entry.data);
}

function updateQuizSrsCache(userId: string, stats: SRSStats): void {
  for (const [cacheKey, entry] of quizSrsCache.entries()) {
    if (!cacheKey.startsWith(`${userId}::`)) {
      continue;
    }

    quizSrsCache.set(cacheKey, {
      cachedAt: Date.now(),
      data: {
        ...cloneSrsData(entry.data),
        [stats.question_id]: { ...stats },
      },
    });
  }
}

/**
 * Charge les données SRS pour une liste de questions
 */
export async function loadQuizSRSData(
  userId: string | null,
  questionIds: string[],
  accessTokenProvider?: AccessTokenProvider,
): Promise<Record<string, SRSStats>> {
  const data: Record<string, SRSStats> = {};

  if (userId) {
    const cached = readQuizSrsCache(userId, questionIds);
    if (cached) {
      return cached;
    }

    const supabase = getSupabaseBrowserClient(accessTokenProvider) as unknown as QuizSrsTableClient;
    const { data: dbData, error } = await supabase
      .from("quiz_srs")
      .select("question_id, last_seen_at, next_review_at, success_count, failure_count, streak, ease_factor, mastery_level")
      .eq("user_id", userId)
      .in("question_id", questionIds);

    if (!error && dbData) {
      dbData.forEach((row) => {
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

    seedQuizSrsCache(userId, questionIds, data);
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
export async function saveQuizSRSState(
  userId: string | null,
  stats: SRSStats,
  accessTokenProvider?: AccessTokenProvider,
): Promise<void> {
  if (userId) {
    const supabase = getSupabaseBrowserClient(accessTokenProvider) as unknown as QuizSrsTableClient;
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
    updateQuizSrsCache(userId, stats);
  } else {
    // LocalStorage fallback
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = local ? JSON.parse(local) : {};
    parsed[stats.question_id] = stats;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  }
}
