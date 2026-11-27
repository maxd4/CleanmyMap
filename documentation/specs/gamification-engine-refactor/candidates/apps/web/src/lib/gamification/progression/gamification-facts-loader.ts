import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompleteGamificationRows } from "./gamification-evidence-pagination";
import { getCurrentUserIdentity } from "@/lib/authz";
import { appendCounterFacts } from "./gamification-counter-facts";
import { loadCleanZoneFacts } from "./gamification-clean-zone-facts";
import { buildActionFacts } from "./gamification-action-facts";
import { buildParticipationReferralFacts } from "./gamification-community-facts";
import { loadProductFeedbackFacts } from "./gamification-feedback-facts";
import { loadGeometryContributionFacts } from "./gamification-geometry-facts";
import { loadModerationFacts } from "./gamification-moderation-facts";
import { buildQuizFacts } from "./gamification-quiz-facts";
import {
  loadActionRowsForUser,
  loadCurrentValidatedActionIdsForUser,
} from "../progression-data";
import { loadGamificationUserCounters } from "./counters";
import { canViewModerationProgression } from "./moderation-progression";
import type {
  GamificationFacts,
  GamificationSourceFact,
} from "./gamification-reconstruction";
import { GAMIFICATION_REGISTRY } from "./gamification-registry";
import { loadSpogomiFirstRefereeFact } from "@/lib/spogomi/gamification-facts";
import {
  buildTerrainSpecializationFacts,
} from "./terrain-specializations";
import { loadTerrainSpecializationEvidence } from "./terrain-specialization-evidence";
import { loadTerritorialLegendAwardFacts } from "../territorial-legends/award-facts";

export { buildGeometryContributionFacts } from "./gamification-geometry-facts";

async function loadCurrentGamificationInputs(
  supabase: SupabaseClient,
  userId: string,
) {
  const [actions, counters, visitedResult, quizResult, participantResult, geometryContributionFacts, productFeedback, terrainSpecializationEvidence, territorialLegendAwardFacts] = await Promise.all([
    loadActionRowsForUser(supabase, userId, { complete: true }),
    loadGamificationUserCounters(supabase, userId),
    loadCompleteGamificationRows("user_visited_places", (from, to) =>
      supabase.from("user_visited_places").select("id, place_label, created_at", { count: "exact" }).eq("user_id", userId).order("id", { ascending: true }).range(from, to)),
    loadCompleteGamificationRows("quiz_type_progress", (from, to) =>
      supabase.from("quiz_type_progress").select("id, question_type, correct_count, updated_at", { count: "exact" }).eq("user_id", userId).order("id", { ascending: true }).range(from, to)),
    loadCompleteGamificationRows("action_participants", (from, to) =>
      supabase.from("action_participants").select("id, action_id, joined_at, updated_at, participation_source", { count: "exact" }).eq("user_id", userId).eq("participation_status", "confirmed").order("id", { ascending: true }).range(from, to)),
    loadGeometryContributionFacts(supabase, userId),
    loadProductFeedbackFacts(supabase, userId),
    loadTerrainSpecializationEvidence(supabase, userId, { complete: true }),
    loadTerritorialLegendAwardFacts(supabase, userId),
  ]);
  return {
    actions,
    counters,
    visitedResult,
    quizResult,
    participantResult,
    geometryContributionFacts,
    productFeedback,
    terrainSpecializationEvidence,
    territorialLegendAwardFacts,
  };
}

async function loadCurrentGamificationFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationFacts> {
  const {
    actions,
    counters,
    visitedResult,
    quizResult,
    participantResult,
    geometryContributionFacts,
    productFeedback,
    terrainSpecializationEvidence,
    territorialLegendAwardFacts,
  } = await loadCurrentGamificationInputs(supabase, userId);

  const { facts, actionState, quizState } =
    await buildCurrentGamificationFactState(supabase, userId, {
      actions,
      counters,
      visitedResult,
      quizResult,
      participantResult,
      geometryContributionFacts,
      productFeedback,
      terrainSpecializationEvidence,
      territorialLegendAwardFacts,
    });

  const identity = await getCurrentUserIdentity({ userId }).catch(() => null);
  const moderationApplicable = canViewModerationProgression(identity, userId);
  const applicableMechanicIds = [...new Set(
    GAMIFICATION_REGISTRY
      .filter((mechanic) => mechanic.category !== "NON_GAMIFIED")
      .filter((mechanic) => mechanic.visibility !== "authorized_moderation" || moderationApplicable)
      .map((mechanic) => mechanic.id),
  )].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

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
      product_feedback: productFeedback.count,
    },
    applicableMechanicIds,
  };
}

async function buildCurrentGamificationFactState(
  supabase: SupabaseClient,
  userId: string,
  inputs: Awaited<ReturnType<typeof loadCurrentGamificationInputs>>,
) {
  const {
    actions,
    counters,
    visitedResult,
    quizResult,
    participantResult,
    geometryContributionFacts,
    productFeedback,
    terrainSpecializationEvidence,
    territorialLegendAwardFacts,
  } = inputs;
  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, {
    actionRows: actions,
  });
  const actionState = await buildActionFacts(supabase, userId, actions, validatedActionIds);
  const facts: GamificationSourceFact[] = [
    ...actionState.facts,
    ...geometryContributionFacts,
    ...productFeedback.facts,
    ...buildTerrainSpecializationFacts(userId, terrainSpecializationEvidence),
    ...territorialLegendAwardFacts,
  ];
  const spogomiFirstReferee = await loadSpogomiFirstRefereeFact(supabase, userId);
  if (spogomiFirstReferee) facts.push(spogomiFirstReferee);
  const participantRows = participantResult as unknown[];
  appendCounterFacts(facts, userId, counters, visitedResult as unknown[], participantRows);
  facts.push(...await loadCleanZoneFacts(supabase, userId));
  const quizState = buildQuizFacts(quizResult);
  facts.push(...quizState.facts);
  facts.push(...await buildParticipationReferralFacts(supabase, userId, participantRows));
  facts.push(...await loadModerationFacts(supabase, userId));
  return { facts, actionState, quizState };
}

export { loadCurrentGamificationFacts };
