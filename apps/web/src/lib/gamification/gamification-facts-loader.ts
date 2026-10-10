import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { appendCounterFacts } from "./gamification-counter-facts";
import { loadCleanZoneFacts } from "./gamification-clean-zone-facts";
import { buildActionFacts } from "./gamification-action-facts";
import { buildParticipationReferralFacts } from "./gamification-community-facts";
import { loadGeometryContributionFacts } from "./gamification-geometry-facts";
import { loadModerationFacts } from "./gamification-moderation-facts";
import { buildQuizFacts } from "./gamification-quiz-facts";
import {
  loadActionRowsForUser,
  loadCurrentValidatedActionIdsForUser,
} from "./progression-data";
import { loadGamificationUserCounters } from "./counters";
import { canViewModerationProgression } from "./moderation-progression";
import type {
  GamificationFacts,
  GamificationSourceFact,
} from "./gamification-reconstruction";
import { GAMIFICATION_REGISTRY } from "./progression-utils";

export { buildGeometryContributionFacts } from "./gamification-geometry-facts";

async function loadCurrentGamificationFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationFacts> {
  const [actions, counters, visitedResult, quizResult, participantResult, geometryContributionFacts] = await Promise.all([
    loadActionRowsForUser(supabase, userId),
    loadGamificationUserCounters(supabase, userId),
    supabase.from("user_visited_places").select("place_label, created_at").eq("user_id", userId).limit(10000),
    supabase.from("quiz_type_progress").select("question_type, correct_count, updated_at").eq("user_id", userId).limit(100),
    supabase.from("action_participants").select("action_id, joined_at, updated_at, participation_source").eq("user_id", userId).eq("participation_status", "confirmed").limit(10000),
    loadGeometryContributionFacts(supabase, userId),
  ]);
  if (visitedResult.error) throw new Error(visitedResult.error.message);
  if (quizResult.error) throw new Error(quizResult.error.message);
  if (participantResult.error) throw new Error(participantResult.error.message);

  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, {
    actionRows: actions,
  });
  const actionState = await buildActionFacts(supabase, userId, actions, validatedActionIds);
  const facts: GamificationSourceFact[] = [...actionState.facts, ...geometryContributionFacts];
  const participantRows = (participantResult.data ?? []) as unknown[];
  appendCounterFacts(
    facts,
    userId,
    counters,
    (visitedResult.data ?? []) as unknown[],
    participantRows,
  );
  facts.push(...await loadCleanZoneFacts(supabase, userId));
  const quizState = buildQuizFacts(quizResult.data);
  facts.push(...quizState.facts);
  facts.push(...await buildParticipationReferralFacts(supabase, userId, participantRows));
  facts.push(...await loadModerationFacts(supabase, userId));

  const identity = await getCurrentUserIdentity({ userId }).catch(() => null);
  const moderationApplicable = canViewModerationProgression(identity, userId);
  const applicableMechanicIds = [...new Set(
    GAMIFICATION_REGISTRY
      .filter((mechanic) => mechanic.category !== "NON_GAMIFIED")
      .filter((mechanic) => mechanic.visibility !== "authorized_moderation" || moderationApplicable)
      .map((mechanic) => mechanic.id),
  )].sort();

  return {
    userId,
    sourceFacts: facts,
    progressionCounters: {
      participation: counters.participationCount,
      exploration: counters.visitedPlacesCount,
      clean_zones: facts.filter((fact) => fact.mechanicId === "clean_zones").length,
      organisation: actionState.validatedActions.length,
      regularity: actionState.regularityCount,
      versatility: actionState.balance.balancedCycles,
      learning: quizState.totalCorrectAnswers,
      cartography: geometryContributionFacts.length,
    },
    applicableMechanicIds,
  };
}

export { loadCurrentGamificationFacts };
