import type { SupabaseClient } from "@supabase/supabase-js";
import { DETERMINISTIC_FALLBACK_OCCURRED_ON } from "./gamification-fact-timestamps";
import { sourceFact } from "./gamification-fact-builders";
import type { GamificationSourceFact } from "./gamification-reconstruction";
import { loadResolvedModerationCasesForUser } from "./moderation-progression";

function buildModerationTierFacts(
  userId: string,
  cases: Awaited<ReturnType<typeof loadResolvedModerationCasesForUser>>,
): GamificationSourceFact[] {
  const facts: GamificationSourceFact[] = [];
  for (const [index, resolvedCase] of cases.entries()) {
    for (const threshold of [1, 3, 5, 8, 10, 15, 20].filter((value) => cases.length >= value)) {
      if (index === 0 && threshold === 1 || index === threshold - 1) {
        facts.push(sourceFact({
          mechanicId: "moderation",
          eventType: "moderation_tier_unlock",
          sourceTable: "admin_operations_audit",
          sourceId: `${userId}:moderation-tier:${threshold}`,
          occurredOn: resolvedCase.occurredOn,
          xpAwarded: 1,
          threshold,
        }));
      }
    }
  }
  return facts;
}

function buildModerationOneShotFacts(
  userId: string,
  cases: Awaited<ReturnType<typeof loadResolvedModerationCasesForUser>>,
): GamificationSourceFact[] {
  const facts: GamificationSourceFact[] = [];
  const first = cases[0];
  if (first) {
    facts.push(sourceFact({
      mechanicId: "premiere_moderation",
      eventType: "moderation_first_case",
      sourceTable: "admin_operations_audit",
      sourceId: `${userId}:moderation-first-case`,
      occurredOn: first.occurredOn,
      xpAwarded: 0,
      metadata: { caseId: first.caseId },
    }));
  }
  const participation = cases.find((item) => item.family === "participation");
  if (participation) {
    facts.push(sourceFact({
      mechanicId: "premiere_validation_participation",
      eventType: "moderation_first_participation",
      sourceTable: "admin_operations_audit",
      sourceId: `${userId}:moderation-first-participation`,
      occurredOn: participation.occurredOn,
      xpAwarded: 0,
      metadata: { caseId: participation.caseId },
    }));
  }
  const impact = cases.find((item) => item.operation === "correct_impact");
  if (impact) {
    facts.push(sourceFact({
      mechanicId: "premiere_correction_impact_justifiee",
      eventType: "moderation_first_impact_correction",
      sourceTable: "admin_operations_audit",
      sourceId: `${userId}:moderation-first-impact-correction`,
      occurredOn: impact.occurredOn,
      xpAwarded: 0,
      metadata: { caseId: impact.caseId },
    }));
  }
  const families = new Set(cases.map((item) => item.family));
  if (families.size === 3) {
    facts.push(sourceFact({
      mechanicId: "moderateur_polyvalent",
      eventType: "moderation_multi_family",
      sourceTable: "admin_operations_audit",
      sourceId: `${userId}:moderation-multi-family`,
      occurredOn: first?.occurredOn ?? DETERMINISTIC_FALLBACK_OCCURRED_ON,
      xpAwarded: 1,
      metadata: { families: [...families] },
    }));
  }
  return facts;
}

function buildModerationFacts(
  userId: string,
  cases: Awaited<ReturnType<typeof loadResolvedModerationCasesForUser>>,
): GamificationSourceFact[] {
  return [
    ...buildModerationTierFacts(userId, cases),
    ...buildModerationOneShotFacts(userId, cases),
  ];
}

export async function loadModerationFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationSourceFact[]> {
  try {
    const cases = await loadResolvedModerationCasesForUser(supabase, userId);
    return buildModerationFacts(userId, cases);
  } catch {
    return [];
  }
}
