export type ProgressionStatusPhase = "pending" | "validated" | "rejected";

export const CURRENT_GAMIFICATION_RULES_VERSION = "gamification-2026.10-v1" as const;
export const CURRENT_GAMIFICATION_RULES_REVISION = 17 as const;

export type GamificationCategory =
  | "XP_PROGRESSION"
  | "XP_MILESTONE"
  | "BADGE_ONLY"
  | "NON_GAMIFIED";

export type GamificationAwardCategory = Exclude<GamificationCategory, "NON_GAMIFIED">;

export type GamificationVisibility =
  | "current_user"
  | "action_collective"
  | "authorized_moderation"
  | "not_exposed";

export type GamificationXpPolicy =
  | {
      kind: "progression_paliers";
      rule: "common_current_scale";
    }
  | {
      kind: "specialization_thresholds";
      version: string;
      xpPerTier: number;
    }
  | {
      kind: "fixed_one_shot";
      amount: number;
    }
  | {
      kind: "none";
      reason: string;
    };

export type GamificationBadgeStatus = "CURRENT" | "LEGACY";

export type GamificationBadgeScale =
  | "participant"
  | "gem"
  | "exploration"
  | "atmosphere"
  | "learning"
  | "cartography"
  | "one_shot"
  | "collection"
  | "territorial"
  | "mohs"
  | "legacy";

type GamificationBadgeRule =
  | { kind: "infinite_thresholds"; description: string }
  | { kind: "one_shot"; description: string }
  | { kind: "repeatable_collection"; description: string }
  | { kind: "legacy_compatibility"; description: string };

export type ProgressionEventType =
  | "action_declare_pending"
  | "action_declare_validation"
  | "first_trace_utile"
  | "action_loop_completed"
  | "action_mobilizer"
  | "action_participation_recovered"
  | "action_exemplary_data"
  | "action_documented_route"
  | "action_traceable_measurement"
  | "action_documented_sorting"
  | "action_formalities_prepared"
  | "action_monthly_regularity"
  | "action_balance_cycle"
  | "verified_geometry_contribution"
  | "collective_rsvp_yes_pending"
  | "collective_attendance_confirmed"
  | "spot_create_pending"
  | "spot_validation_bonus"
  | "community_ops_update"
  | "community_referral_invite"
  | "route_recommend_use"
  | "infinite_waste_milestone"
  | "infinite_butts_milestone"
  | "new_place_discovered"
  | "new_place_milestone"
  | "quiz_question_type_milestone"
  | "quiz_question_type_balance_milestone"
  | "clean_zone_task"
  | "form_tier_unlock"
  | "form_bonus"
  | "participant_tier_unlock"
  | "explorer_tier_unlock"
  | "sensitive_zone_action"
  | "sensitive_zone_milestone"
  | "moderation_case_resolved"
  | "moderation_tier_unlock"
  | "moderation_first_case"
  | "moderation_first_participation"
  | "moderation_first_impact_correction"
  | "moderation_multi_family"
  | "product_feedback_accepted"
  | "spogomi_first_referee_certified"
  | "terrain_specialization_tier_unlock"
  | "territorial_legend_reward";

export const CURRENT_INFINITE_PROGRESSION_IDS = [
  "participation",
  "organisation",
  "exploration",
  "clean_zones",
  "regularity",
  "versatility",
  "learning",
  "moderation",
  "cartography",
  "product_feedback",
] as const;

export type CurrentInfiniteProgressionId =
  (typeof CURRENT_INFINITE_PROGRESSION_IDS)[number];

export type CurrentMilestoneId =
  | "premiere_trace_utile"
  | "trace_fondatrice"
  | "boucle_bouclee"
  | "mobilisateur"
  | "donnee_exemplaire"
  | "parcours_documente"
  | "mesure_tracable"
  | "tri_documente"
  | "formalites_preparees"
  | "participation_retrouvee"
  | "parrainage_utile"
  | "premiere_moderation"
  | "premiere_validation_participation"
  | "premiere_correction_impact_justifiee"
  | "moderateur_polyvalent"
  | "spogomi_first_referee";

type ImpactBadgeId = "mohs_waste" | "mohs_butts";

interface ProgressionDefinition {
  id: CurrentInfiniteProgressionId;
  category: "XP_PROGRESSION";
  progressionId: CurrentInfiniteProgressionId;
  label: string;
  description: string;
  metric: string;
  metricLabel: string;
  sourceDomain: string;
  xpPolicy: GamificationXpPolicy;
  badgeId: string | null;
  milestoneId: null;
  visibility: GamificationVisibility;
  rulesVersion: string;
  introducedInRulesRevision: number;
  badgeFamily: string;
  scale: GamificationBadgeScale;
  infinite: true;
}

export type GamificationBadgeDefinition = {
  id: string;
  family: string;
  status: GamificationBadgeStatus;
  label: string;
  scale: GamificationBadgeScale;
  metric: string;
  sourceDomain: string;
  visibility: GamificationVisibility;
  progressionId: CurrentInfiniteProgressionId | null;
  subProgressionId?: string;
  rule: GamificationBadgeRule;
  xpPolicy: GamificationXpPolicy;
  aliases: readonly string[];
  legacyLabels?: readonly string[];
  legacyThresholds?: readonly { label: string; minimum: number }[];
};

export type CurrentSchoolCollectiveRecognitionId =
  | "school_first_mission"
  | "school_documented_sorting"
  | "school_field_debrief";

export type SchoolCollectiveRecognitionDefinition = {
  id: CurrentSchoolCollectiveRecognitionId;
  label: string;
  description: string;
  sourceDomain: string;
  factKey: string;
  badgeId: CurrentSchoolCollectiveRecognitionId;
  visibility: "action_collective";
  rulesVersion: string;
  introducedInRulesRevision: number;
  xpAwarded: 0;
  xpPolicy: { kind: "none"; reason: string };
  oneShot: true;
  scope: "action";
};

export interface MilestoneDefinition {
  id: CurrentMilestoneId;
  category: "XP_MILESTONE" | "BADGE_ONLY";
  progressionId: null;
  legacyId?: string;
  label: string;
  description: string;
  sourceDomain: string;
  factKey: string;
  xpAwarded: number;
  xpPolicy: GamificationXpPolicy;
  badgeId: string | null;
  milestoneId: CurrentMilestoneId;
  visibility: GamificationVisibility;
  rulesVersion: string;
  introducedInRulesRevision: number;
  oneShot: true;
}

export type GamificationMechanicDefinition = {
  id: string;
  category: GamificationCategory;
  progressionId: CurrentInfiniteProgressionId | null;
  subProgressionId?: string;
  xpPolicy: GamificationXpPolicy;
  sourceDomain: string;
  badgeId: string | null;
  milestoneId: string | null;
  visibility: GamificationVisibility;
  rulesVersion: string;
  introducedInRulesRevision: number;
  description: string;
};

/** Compatibility name retained for existing progression consumers. */
export type GamificationProgressionDefinition = ProgressionDefinition;

export type GamificationBadgeReference = {
  id: string;
  label: string;
};

export type GamificationProgressionState = ProgressionDefinition & {
  currentValue: number;
  currentBadge: GamificationBadgeReference | null;
  nextBadge: GamificationBadgeReference | null;
  progressPercent: number;
  /** Contribution to the one global XP total; never an independent XP balance. */
  xpContribution: number;
};

export type GamificationMilestoneState = MilestoneDefinition & {
  unlocked: boolean;
  recordedXp: number;
  proofSourceId: string | null;
  achievedAt: string | null;
};

export type GamificationEventRegistration =
  | {
      classification: "progression";
      progressionId: CurrentInfiniteProgressionId;
    }
  | {
      classification: "milestone";
      milestoneId: CurrentMilestoneId;
    }
  | {
      classification: "non_progression";
      reason: string;
    }
  | {
      classification: "impact_badge";
      impactBadgeId: ImpactBadgeId;
    };
