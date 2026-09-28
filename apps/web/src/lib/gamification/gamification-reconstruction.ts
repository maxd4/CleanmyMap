import type { GamificationRulesV1, GamificationRule } from "./gamification-rules";
import type { ProgressionStatusPhase } from "./progression-types";

export type GamificationSourceFact = {
  mechanicId: string;
  eventType?: string | null;
  sourceTable: string;
  sourceId: string;
  /** Canonical evidence date, or the facts loader's documented deterministic fallback. */
  occurredOn: string;
  statusPhase?: ProgressionStatusPhase;
  threshold?: number | null;
  xpAwarded?: number;
  eligible?: boolean;
  badgeId?: string | null;
  metadata?: Record<string, unknown>;
};

export type GamificationFacts = {
  userId: string;
  sourceFacts: readonly GamificationSourceFact[];
  progressionCounters?: Readonly<Record<string, number>>;
  /** Applicable CURRENT mechanics, including mechanics with no source fact yet. */
  applicableMechanicIds?: readonly string[];
};

export type ExpectedGamificationEvent = {
  logicalId: string;
  userId: string;
  mechanicId: string;
  eventType: string;
  category: "XP_PROGRESSION" | "XP_MILESTONE" | "BADGE_ONLY";
  progressionId: string | null;
  milestoneId: string | null;
  sourceTable: string;
  sourceId: string;
  statusPhase: ProgressionStatusPhase;
  weight: number;
  xpBase: number;
  xpAwarded: number;
  occurredOn: string;
  threshold: number | null;
  metadata: Record<string, unknown>;
};

export type ExpectedGamificationState = {
  userId: string;
  rulesVersion: string;
  rulesRevision: number;
  events: ExpectedGamificationEvent[];
  expectedMilestones: ExpectedGamificationEvent[];
  expectedBadges: string[];
  progressionCounters: Record<string, number>;
  applicableMechanicIds: string[];
};

function safeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function sourceIdentity(fact: GamificationSourceFact, rule: GamificationRule): string {
  return [
    rule.mechanicId,
    fact.sourceTable,
    fact.sourceId,
    fact.threshold ?? "",
    fact.statusPhase ?? "validated",
  ].join(":");
}

function amountFor(rule: GamificationRule, fact: GamificationSourceFact): number {
  if (rule.awardPolicy.kind === "fixed") return safeAmount(rule.awardPolicy.amount);
  if (rule.awardPolicy.kind === "fact") return safeAmount(fact.xpAwarded);
  return 0;
}

function factMatchesRule(fact: GamificationSourceFact, rule: GamificationRule): boolean {
  if (rule.category === "NON_GAMIFIED" || rule.eventType === null) return false;
  if (fact.mechanicId !== rule.mechanicId) return false;
  if (fact.eventType && fact.eventType !== rule.eventType) return false;
  return fact.eligible !== false;
}

function buildMetadata(
  rules: GamificationRulesV1,
  rule: GamificationRule,
  fact: GamificationSourceFact,
  logicalId: string,
): Record<string, unknown> {
  return {
    ...(fact.metadata ?? {}),
    gamificationEngine: "CURRENT_RECONCILABLE",
    rulesVersion: rules.version,
    rulesRevision: rules.rulesRevision,
    mechanicId: rule.mechanicId,
    introducedInRulesRevision: rule.introducedInRulesRevision,
    progressionId: rule.progressionId,
    milestoneId: rule.milestoneId,
    badgeId: rule.badgeId,
    sourceTable: fact.sourceTable,
    sourceId: fact.sourceId,
    awardKind: rule.category === "BADGE_ONLY" ? "BADGE_ONLY" : rule.category,
    threshold: fact.threshold ?? null,
    logicalId,
  };
}

/**
 * Pure reconstruction. It reads only the supplied canonical facts and never
 * consults or mutates progression_events.
 */
export function computeExpectedGamificationState(
  userId: string,
  facts: GamificationFacts,
  rules: GamificationRulesV1,
): ExpectedGamificationState {
  if (facts.userId !== userId) {
    throw new Error("Gamification facts belong to another user");
  }

  const eventsByIdentity = new Map<string, ExpectedGamificationEvent>();
  const expectedBadges = new Set<string>();
  const progressionCounters: Record<string, number> = {
    ...(facts.progressionCounters ?? {}),
  };
  const applicableMechanicIds = [...new Set(
    facts.applicableMechanicIds ?? rules.mechanics
      .filter((rule) => rule.category !== "NON_GAMIFIED")
      .map((rule) => rule.mechanicId),
  )].sort();

  for (const rule of rules.mechanics) {
    if (rule.category === "NON_GAMIFIED") continue;
    for (const fact of facts.sourceFacts) {
      if (!factMatchesRule(fact, rule)) continue;
      const logicalId = `${userId}:${sourceIdentity(fact, rule)}`;
      const xpAwarded = amountFor(rule, fact);
      const event: ExpectedGamificationEvent = {
        logicalId,
        userId,
        mechanicId: rule.mechanicId,
        eventType: rule.eventType!,
        category: rule.category,
        progressionId: rule.progressionId,
        milestoneId: rule.milestoneId,
        sourceTable: fact.sourceTable,
        sourceId: fact.sourceId,
        statusPhase: fact.statusPhase ?? "validated",
        weight: 1,
        xpBase: xpAwarded,
        xpAwarded,
        occurredOn: fact.occurredOn,
        threshold: fact.threshold ?? null,
        metadata: buildMetadata(rules, rule, fact, logicalId),
      };
      eventsByIdentity.set(logicalId, event);
      if (rule.badgeId) expectedBadges.add(rule.badgeId);
      if (fact.badgeId) expectedBadges.add(fact.badgeId);
    }
  }

  const events = [...eventsByIdentity.values()].sort((left, right) =>
    left.logicalId.localeCompare(right.logicalId),
  );

  return {
    userId,
    rulesVersion: rules.version,
    rulesRevision: rules.rulesRevision,
    events,
    expectedMilestones: events.filter((event) =>
      event.category === "XP_MILESTONE" || event.category === "BADGE_ONLY",
    ),
    expectedBadges: [...expectedBadges].sort(),
    progressionCounters,
    applicableMechanicIds,
  };
}
