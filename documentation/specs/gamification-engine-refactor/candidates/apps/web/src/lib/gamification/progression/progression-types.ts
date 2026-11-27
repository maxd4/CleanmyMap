/** Stable compatibility surface. Definitions belong to their contract modules. */
export {
  CURRENT_GAMIFICATION_RULES_VERSION,
  CURRENT_GAMIFICATION_RULES_REVISION,
  CURRENT_INFINITE_PROGRESSION_IDS,
} from "./gamification-contract-types";

export type {
  ProgressionStatusPhase,
  GamificationCategory,
  GamificationAwardCategory,
  GamificationVisibility,
  GamificationXpPolicy,
  GamificationBadgeStatus,
  GamificationBadgeScale,
  ProgressionEventType,
  CurrentInfiniteProgressionId,
  CurrentMilestoneId,
  GamificationBadgeDefinition,
  CurrentSchoolCollectiveRecognitionId,
  SchoolCollectiveRecognitionDefinition,
  MilestoneDefinition,
  GamificationMechanicDefinition,
  GamificationProgressionDefinition,
  GamificationBadgeReference,
  GamificationProgressionState,
  GamificationMilestoneState,
  GamificationEventRegistration,
} from "./gamification-contract-types";

export type {
  ActionRow,
  ActionTimelineRow,
  SpotRow,
  CommunityEventRow,
  EventRsvpRow,
  EventInsertParams,
} from "./progression-source-types";

export type {
  UserProgressionStats,
  LevelRequirementCondition,
  LevelRequirementAssessment,
} from "./progression-level-types";

export type {
  UserProgressionResponse,
  ContributorRecognitionType,
  ContributorRecognitionCard,
  ContributorRecognitionSummary,
  LeaderboardMetric,
  IndividualLeaderboardItem,
  PublicStructureLeaderboardItem,
  LeaderboardResponseDto,
  PublicLeaderboardItem,
  PublicLeaderboardResponseDto,
  PersonalImpactMetrics,
  PersonalImpactMethodology,
  PersonalTimelineItem,
  PostActionRetentionLoop,
} from "./progression-response-types";
