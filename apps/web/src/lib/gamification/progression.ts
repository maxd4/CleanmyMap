export type {
  ContributorRecognitionCard,
  ContributorRecognitionSummary,
  ContributorRecognitionType,
  CollectiveLeaderboardItem,
  IndividualLeaderboardItem,
  LevelRequirementAssessment,
  PersonalImpactMetrics,
  PersonalTimelineItem,
  PostActionRetentionLoop,
  ProgressionEventType,
  ProgressionStatusPhase,
  UserProgressionStats,
} from "./progression-types";

export {
  GamificationRulesV1,
  GAMIFICATION_RULES_V1,
} from "./gamification-rules";
export type {
  GamificationAwardPolicy,
  GamificationEligibility,
  GamificationRule,
  GamificationRulesV1 as GamificationRulesV1Contract,
} from "./gamification-rules";
export { computeExpectedGamificationState } from "./gamification-reconstruction";
export type {
  ExpectedGamificationEvent,
  ExpectedGamificationState,
  GamificationFacts,
  GamificationSourceFact,
} from "./gamification-reconstruction";
export {
  reconcileUserGamification,
} from "./gamification-reconciliation";
export { loadCurrentGamificationFacts } from "./gamification-facts-loader";
export type { GamificationReconciliationResult } from "./gamification-reconciliation";
export {
  computeMonthlyRegularityAwards,
  computeMonthlyRegularitySummary,
  MONTHLY_REGULARITY_GEM_GRADES,
} from "./monthly-regularity";

export {
  PROGRESSION_RULES_V2,
  assessLevelRequirements,
  computeCurrentLevel,
  computePotentialLevel,
  minCollectiveEvents,
  minDiversityTypes,
  minVerifiedContributions,
  xpStep,
  xpRequired,
} from "./progression-formulas";

export {
  refreshProgressionProfile,
  syncUserActionProgression,
  trackActionCreated,
  trackActionValidationBonus,
  trackActionRejection,
  trackSpotCreated,
  trackSpotValidationBonus,
  trackCommunityRsvpYes,
  trackCommunityOpsUpdate,
  trackRouteRecommendationUse,
} from "./progression-tracking";

export {
  backfillAllProgression,
} from "./progression-backfill";

export {
  buildReferralInviteUrl,
  claimReferralInviteForUser,
  ensureReferralInviteForUser,
  loadReferralSummary,
} from "./referrals/referrals";

export {
  buildPostActionRetentionLoop,
  getUserProgression,
  getGamificationLeaderboard,
} from "./progression-leaderboard";
