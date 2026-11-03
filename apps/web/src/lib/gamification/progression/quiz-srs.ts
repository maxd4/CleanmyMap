/**
 * Logique de Répétition Espacée (SRS) - Adaptative
 * Basée sur l'algorithme SM-2
 */

export interface SRSStats {
  question_id: string;
  last_seen_at?: string;
  next_review_at: string;
  success_count: number;
  failure_count: number;
  streak: number;
  ease_factor: number;
  mastery_level: number;
}

export type SRSQuality = 0 | 3 | 5; // 0: Wrong, 3: Hard/Good, 5: Easy/Perfect

export const SRS_CONFIG = {
  MIN_EASE_FACTOR: 1.3,
  DEFAULT_EASE_FACTOR: 2.5,
  INTERVAL_STAGES: [0, 1, 6], // Jours pour les premières étapes
  FAILURE_RETRY_MINUTES: [10, 8, 6, 4],
};

/**
 * Calcule les prochaines statistiques SRS après une réponse
 */
export function computeNextSRSState(
  current: SRSStats,
  quality: SRSQuality,
): SRSStats {
  let { streak, ease_factor, success_count, failure_count } = current;
  let intervalInDays = 0;
  let intervalInMinutes = 0;
  const nextFailureCount = quality >= 3 ? failure_count : failure_count + 1;

  if (quality >= 3) {
    // Succès
    success_count += 1;
    streak += 1;

    if (streak === 1) {
      intervalInDays = SRS_CONFIG.INTERVAL_STAGES[1];
    } else if (streak === 2) {
      intervalInDays = SRS_CONFIG.INTERVAL_STAGES[2];
    } else {
      // Calcul basé sur l'ease factor
      // On récupère le dernier intervalle estimé (diff entre next_review et last_seen)
      const lastInterval = current.last_seen_at 
        ? Math.max(1, Math.ceil((new Date(current.next_review_at).getTime() - new Date(current.last_seen_at).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;
      const recoveryPenalty = Math.min(0.5, failure_count * 0.12);
      const qualityPenalty = quality === 3 ? 0.12 : 0;
      intervalInDays = Math.max(1, Math.ceil(lastInterval * ease_factor * (1 - recoveryPenalty - qualityPenalty)));
    }

    // Ajustement de l'Ease Factor (SM-2 simplified)
    // EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
    // Ici on mappe 3 -> quality 3, 5 -> quality 5
    const q = quality;
    ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  } else {
    // Échec
    failure_count += 1;
    streak = 0;
    intervalInMinutes = SRS_CONFIG.FAILURE_RETRY_MINUTES[
      Math.min(SRS_CONFIG.FAILURE_RETRY_MINUTES.length - 1, nextFailureCount - 1)
    ];
    
    // Pénalité Ease Factor
    ease_factor = Math.max(SRS_CONFIG.MIN_EASE_FACTOR, ease_factor - 0.2);
  }

  // Bornage de l'ease factor
  ease_factor = Math.max(SRS_CONFIG.MIN_EASE_FACTOR, ease_factor);

  const now = new Date();
  const nextReviewDate = new Date(now);
  
  if (intervalInDays > 0) {
    nextReviewDate.setDate(now.getDate() + intervalInDays);
  } else {
    // Si intervalle 0, on programme une reprise très proche dans la session
    nextReviewDate.setMinutes(now.getMinutes() + Math.max(2, intervalInMinutes || 10));
  }

  return {
    ...current,
    last_seen_at: now.toISOString(),
    next_review_at: nextReviewDate.toISOString(),
    success_count,
    failure_count,
    streak,
    ease_factor,
    mastery_level: calculateMasteryLevel(streak, ease_factor, failure_count, success_count)
  };
}

/**
 * Calcul d'un niveau de maîtrise (0 à 5) pour l'UI
 */
function calculateMasteryLevel(
  streak: number,
  ease_factor: number,
  failure_count: number,
  success_count: number,
): number {
  if (streak === 0) return 0;
  if (streak === 1) return 1;
  if (streak === 2) return 2;
  if (failure_count > 0 && success_count <= failure_count) {
    return 3;
  }
  if (streak >= 3 && ease_factor < 2.0) return 3;
  if (streak >= 3 && ease_factor < 2.5) return 4;
  return 5;
}

/**
 * Initialise un état SRS pour une nouvelle question
 */
export function createInitialSRSState(questionId: string): SRSStats {
  return {
    question_id: questionId,
    next_review_at: new Date().toISOString(),
    success_count: 0,
    failure_count: 0,
    streak: 0,
    ease_factor: SRS_CONFIG.DEFAULT_EASE_FACTOR,
    mastery_level: 0
  };
}
