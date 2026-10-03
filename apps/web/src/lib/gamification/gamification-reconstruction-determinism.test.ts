import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGamificationReconciliationPlan,
  type PersistedGamificationEvent,
} from "./gamification-reconciliation-plan";
import { computeExpectedGamificationState, type GamificationFacts } from "./gamification-reconstruction";

const mocks = vi.hoisted(() => ({
  getCurrentUserIdentity: vi.fn(),
  loadGamificationUserCounters: vi.fn(),
  loadActionRowsForUser: vi.fn(),
  loadCurrentValidatedActionIdsForUser: vi.fn(),
  loadResolvedModerationCasesForUser: vi.fn(),
  canViewModerationProgression: vi.fn(),
  collectEligibleCleanZoneSources: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));

vi.mock("./counters", () => ({
  loadGamificationUserCounters: mocks.loadGamificationUserCounters,
}));

vi.mock("./progression-data", () => ({
  loadActionRowsForUser: mocks.loadActionRowsForUser,
  loadCurrentValidatedActionIdsForUser: mocks.loadCurrentValidatedActionIdsForUser,
}));

vi.mock("./moderation-progression", () => ({
  loadResolvedModerationCasesForUser: mocks.loadResolvedModerationCasesForUser,
  canViewModerationProgression: mocks.canViewModerationProgression,
}));

vi.mock("./clean-zones", () => ({
  collectEligibleCleanZoneSources: mocks.collectEligibleCleanZoneSources,
}));

type QueryResult = { data: unknown[]; error: null };

function createSupabaseMock(): { from: (table: string) => Record<string, (...args: unknown[]) => unknown> } {
  const rowsByTable: Record<string, unknown[]> = {
    user_visited_places: [{ place_label: "Paris", created_at: "2026-01-10T09:00:00.000Z" }],
    quiz_type_progress: [],
    action_participants: [],
    action_geometry_contributions: [],
    trash_spotter_spots: [],
    profiles: [],
  };

  return {
    from: (table) => {
      const result: QueryResult = { data: rowsByTable[table] ?? [], error: null };
      const chain: Record<string, (...args: unknown[]) => unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        order: () => chain,
        limit: () => Promise.resolve(result),
      };
      return chain;
    },
  };
}

const rules = {
  version: "determinism-test",
  rulesRevision: 1,
  mechanics: [{
    mechanicId: "exploration",
    category: "XP_MILESTONE" as const,
    eventType: "new_place_discovered" as const,
    progressionId: null,
    milestoneId: "new_place_discovered",
    badgeId: null,
    sourceDomain: "user_visited_places",
    xpPolicy: { kind: "fixed_one_shot" as const, amount: 1 },
    awardPolicy: { kind: "fixed" as const, amount: 1 },
    eligibility: { kind: "canonical_fact" as const, factKey: "visited_place" },
    thresholds: [],
    introducedInRulesRevision: 1,
  }],
};

function persistedFromFacts(facts: GamificationFacts): PersistedGamificationEvent[] {
  const expected = computeExpectedGamificationState("user-1", facts, rules);
  return expected.events.map((event, index) => ({
    id: index + 1,
    event_type: event.eventType as PersistedGamificationEvent["event_type"],
    source_table: event.sourceTable,
    source_id: event.sourceId,
    status_phase: event.statusPhase,
    weight: event.weight,
    xp_base: event.xpBase,
    xp_awarded: event.xpAwarded,
    occurred_on: event.occurredOn,
    metadata: event.metadata,
  }));
}

describe("gamification reconstruction determinism", () => {
  beforeEach(() => {
    mocks.getCurrentUserIdentity.mockResolvedValue(null);
    mocks.loadGamificationUserCounters.mockResolvedValue({
      approvedActionsCount: 0,
      completeActionsCount: 0,
      visitedPlacesCount: 1,
      eligibleFormsCount: 0,
      participationCount: 0,
    });
    mocks.loadActionRowsForUser.mockResolvedValue([]);
    mocks.loadCurrentValidatedActionIdsForUser.mockResolvedValue(new Set());
    mocks.loadResolvedModerationCasesForUser.mockResolvedValue([]);
    mocks.canViewModerationProgression.mockReturnValue(false);
    mocks.collectEligibleCleanZoneSources.mockReturnValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces the same facts and zero updates when rebuilt on different run dates", async () => {
    const { loadCurrentGamificationFacts } = await import("./gamification-facts-loader");
    const supabase = createSupabaseMock();

    vi.setSystemTime(new Date("2026-09-28T10:00:00.000Z"));
    const factsAtFirstRun = await loadCurrentGamificationFacts(supabase as never, "user-1");
    const persisted = persistedFromFacts(factsAtFirstRun);
    const expectedAtFirstRun = computeExpectedGamificationState("user-1", factsAtFirstRun, rules);
    const planAtFirstRun = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules,
      expected: expectedAtFirstRun,
      persisted,
    });

    vi.setSystemTime(new Date("2027-03-14T10:00:00.000Z"));
    const factsAtSecondRun = await loadCurrentGamificationFacts(supabase as never, "user-1");
    const planAtSecondRun = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules,
      expected: computeExpectedGamificationState("user-1", factsAtSecondRun, rules),
      persisted,
    });

    expect(factsAtSecondRun).toEqual(factsAtFirstRun);
    expect(planAtSecondRun).toEqual(planAtFirstRun);
    expect(planAtFirstRun.eventsToUpdate).toEqual([]);
  });
});
