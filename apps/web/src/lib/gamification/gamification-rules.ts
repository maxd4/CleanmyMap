import {
  CURRENT_MILESTONES,
} from "./current-milestones";
import { CURRENT_INFINITE_PROGRESSIONS } from "./current-progressions";
import {
  GAMIFICATION_REGISTRY,
  gamificationEventRegistry,
} from "./progression-utils";
import {
  CURRENT_GAMIFICATION_RULES_VERSION,
  type GamificationCategory,
  type GamificationEventRegistration,
  type GamificationXpPolicy,
  type ProgressionEventType,
} from "./progression-types";

export type GamificationAwardPolicy =
  | { kind: "fixed"; amount: number }
  | { kind: "fact"; field: "xpAwarded" }
  | { kind: "none" };

export type GamificationEligibility =
  | { kind: "canonical_fact"; factKey: string }
  | { kind: "never"; reason: string };

export type GamificationRule = {
  mechanicId: string;
  category: GamificationCategory;
  eventType: ProgressionEventType | null;
  progressionId: string | null;
  milestoneId: string | null;
  badgeId: string | null;
  sourceDomain: string;
  xpPolicy: GamificationXpPolicy;
  awardPolicy: GamificationAwardPolicy;
  eligibility: GamificationEligibility;
};

export type GamificationRulesV1 = {
  version: string;
  mechanics: readonly GamificationRule[];
};

const EVENT_TYPES = Object.keys(gamificationEventRegistry()) as ProgressionEventType[];

function currentRuleForEvent(
  eventType: ProgressionEventType,
  registration: GamificationEventRegistration,
): GamificationRule | null {
  if (registration.classification === "non_progression" || registration.classification === "impact_badge") {
    return null;
  }

  if (registration.classification === "progression") {
    const definition = CURRENT_INFINITE_PROGRESSIONS.find(
      (candidate) => candidate.id === registration.progressionId,
    );
    if (!definition) return null;

    return {
      mechanicId: definition.id,
      category: "XP_PROGRESSION",
      eventType,
      progressionId: definition.id,
      milestoneId: null,
      badgeId: null,
      sourceDomain: definition.sourceDomain,
      xpPolicy: definition.xpPolicy,
      awardPolicy: eventType === "action_declare_validation"
        ? { kind: "fact", field: "xpAwarded" }
        : { kind: "fact", field: "xpAwarded" },
      eligibility: { kind: "canonical_fact", factKey: definition.metric },
    };
  }

  const definition = CURRENT_MILESTONES.find(
    (candidate) => candidate.id === registration.milestoneId,
  );
  if (!definition) return null;

  return {
    mechanicId: definition.id,
    category: definition.category,
    eventType,
    progressionId: null,
    milestoneId: definition.id,
    badgeId: definition.badgeId,
    sourceDomain: definition.sourceDomain,
    xpPolicy: definition.xpPolicy,
    awardPolicy: definition.xpAwarded > 0
      ? { kind: "fixed", amount: definition.xpAwarded }
      : { kind: "none" },
    eligibility: { kind: "canonical_fact", factKey: definition.factKey },
  };
}

function buildCurrentRules(): GamificationRulesV1 {
  const eventRules = EVENT_TYPES
    .map((eventType) => currentRuleForEvent(eventType, gamificationEventRegistry()[eventType]))
    .filter((rule): rule is GamificationRule => rule !== null);

  const nonGamifiedRules: GamificationRule[] = GAMIFICATION_REGISTRY
    .filter((mechanic) => mechanic.category === "NON_GAMIFIED")
    .map((mechanic) => ({
      mechanicId: mechanic.id,
      category: "NON_GAMIFIED",
      eventType: null,
      progressionId: null,
      milestoneId: null,
      badgeId: null,
      sourceDomain: mechanic.sourceDomain,
      xpPolicy: mechanic.xpPolicy,
      awardPolicy: { kind: "none" },
      eligibility: { kind: "never", reason: mechanic.description },
    }));

  return {
    version: CURRENT_GAMIFICATION_RULES_VERSION,
    mechanics: [...eventRules, ...nonGamifiedRules],
  };
}

/** The only CURRENT ruleset used by reconstruction and reconciliation. */
export const GAMIFICATION_RULES_V1 = buildCurrentRules();

/** Explicit versioned name for callers that need to pin a ruleset in tests. */
export const GamificationRulesV1 = GAMIFICATION_RULES_V1;
