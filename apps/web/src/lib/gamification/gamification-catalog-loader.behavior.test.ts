import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildProgressionFacts,
  loadGamificationCatalog,
  type CatalogProgressionInputs,
} from "./gamification-catalog-loader";

const countersMock = vi.hoisted(() => vi.fn());
const cleanZonesMock = vi.hoisted(() => vi.fn());
const learningMock = vi.hoisted(() => vi.fn());
const balanceMock = vi.hoisted(() => vi.fn());
const feedbackMock = vi.hoisted(() => vi.fn());
const referralMock = vi.hoisted(() => vi.fn());
const identityMock = vi.hoisted(() => vi.fn());
const moderationAccessMock = vi.hoisted(() => vi.fn());
const moderationCasesMock = vi.hoisted(() => vi.fn());
const regularityMock = vi.hoisted(() => vi.fn());

vi.mock("./counters", () => ({ loadGamificationUserCounters: countersMock }));
vi.mock("./badges/listing", () => ({ loadCleanZoneSourcesForUser: cleanZonesMock }));
vi.mock("./quiz-learning-progression", () => ({ loadQuizLearningProgression: learningMock }));
vi.mock("./action-balance", () => ({ loadActionBalanceSummary: balanceMock }));
vi.mock("./gamification-feedback-facts", async () => {
  const actual = await vi.importActual<typeof import("./gamification-feedback-facts")>("./gamification-feedback-facts");
  return { ...actual, loadProductFeedbackFacts: feedbackMock };
});
vi.mock("./referrals/referrals", () => ({ loadReferralSummary: referralMock }));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: identityMock }));
vi.mock("./moderation-progression", () => ({
  canViewModerationProgression: moderationAccessMock,
  loadResolvedModerationCasesForUser: moderationCasesMock,
}));
vi.mock("./monthly-regularity", async () => {
  const actual = await vi.importActual<typeof import("./monthly-regularity")>("./monthly-regularity");
  return { ...actual, computeMonthlyRegularitySummary: regularityMock };
});

function createSupabase(rows: Array<{ action_id?: string | null }>, error: { message: string } | null = null) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.limit.mockResolvedValue({ data: rows, error });
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient;
}

function baseInputs(): CatalogProgressionInputs {
  return {
    counters: {
      participationCount: 2,
      completeActionsCount: 3,
      visitedPlacesCount: 4,
      eligibleFormsCount: 1,
      approvedActionsCount: 3,
    },
    cleanZoneSources: [{ sourceId: "zone-1", sourceTable: "clean_zones" }],
    learning: { totalCorrectAnswers: 2, tiers: [{ id: "quiz-1", label: "Quiz", threshold: 1 }] },
    regularity: { activeMonthsTotal: 2 },
    balance: { balancedCycles: 1, totalValidated: 2 },
    cartographyCount: 5,
    productFeedbackCount: 0,
  } as unknown as CatalogProgressionInputs;
}

beforeEach(() => {
  vi.clearAllMocks();
  countersMock.mockResolvedValue(baseInputs().counters);
  cleanZonesMock.mockResolvedValue(baseInputs().cleanZoneSources);
  learningMock.mockResolvedValue(baseInputs().learning);
  balanceMock.mockResolvedValue(baseInputs().balance);
  feedbackMock.mockResolvedValue({ count: 0, facts: [] });
  referralMock.mockResolvedValue({
    referralCode: null,
    inviteUrl: null,
    invitedUsersCount: 0,
    invitedBy: null,
    badgeUnlocked: false,
    referralAwardedXp: 0,
  });
  identityMock.mockResolvedValue(null);
  moderationAccessMock.mockReturnValue(false);
  moderationCasesMock.mockResolvedValue([]);
  regularityMock.mockReturnValue(baseInputs().regularity);
});

describe("gamification catalog loader behavior", () => {
  it("builds all CURRENT progression facts at zero and non-zero boundaries", () => {
    const zero = buildProgressionFacts({
      ...baseInputs(),
      cleanZoneSources: [],
      productFeedbackCount: undefined,
      counters: { ...baseInputs().counters, participationCount: 0, completeActionsCount: 0, visitedPlacesCount: 0 },
      learning: { totalCorrectAnswers: 0, tiers: [] } as never,
      regularity: { activeMonthsTotal: 0 } as never,
      balance: { balancedCycles: 0, totalValidated: 0 } as never,
      cartographyCount: 0,
    });
    expect(Object.keys(zero)).toEqual(expect.arrayContaining([
      "participation", "organisation", "exploration", "clean_zones", "regularity", "versatility", "learning", "cartography", "product_feedback",
    ]));
    expect(zero.product_feedback.currentValue).toBe(0);
    expect(zero.product_feedback.started).toBe(false);

    const positive = buildProgressionFacts(baseInputs());
    expect(positive.participation.started).toBe(true);
    expect(positive.learning.currentValue).toBe(2);
    expect(positive.cartography.continuationTitle?.(10)).toBe("Cartographe 10");
    expect(positive.product_feedback.continuationTitle?.(5)).toBe("Retour accepté 5");
  });

  it("loads a private catalog, deduplicates geometry and excludes unauthorized moderation", async () => {
    const catalog = await loadGamificationCatalog(createSupabase([
      { action_id: "action-1" },
      { action_id: "action-1" },
      { action_id: null },
    ]), "user-1", {
      actionRows: [],
      progressionEvents: Promise.resolve([
        { event_type: "unknown", status_phase: "validated", source_id: "x", source_table: "x" },
        { event_type: "action_declare_validation", status_phase: "validated", source_id: "a", source_table: "actions", xp_awarded: 2, occurred_on: null, metadata: null },
      ]) as never,
      rulesMigrationState: { currentAppliedRulesRevision: 2, lastAcknowledgedRulesRevision: 1 },
    });

    expect(catalog.some((item) => item.id === "moderation")).toBe(false);
    expect(catalog.find((item) => item.id === "cartography")).toMatchObject({ state: "in_progress" });
    expect(catalog.every((item) => item.isNewSinceLastRulesMigration === true || item.isNewSinceLastRulesMigration === false)).toBe(true);
  });

  it("adds moderation only after the authorization predicate succeeds and surfaces geometry failures", async () => {
    moderationAccessMock.mockReturnValue(true);
    moderationCasesMock.mockResolvedValue([{ id: "case-1" }, { id: "case-2" }]);
    const catalog = await loadGamificationCatalog(createSupabase([]), "moderator-1", {
      actionRows: [],
      progressionEvents: Promise.resolve([]),
      rulesMigrationState: { currentAppliedRulesRevision: 1, lastAcknowledgedRulesRevision: 1 },
    });
    expect(catalog.find((item) => item.id === "moderation")).toMatchObject({ state: "in_progress" });
    expect(moderationCasesMock).toHaveBeenCalledWith(expect.anything(), "moderator-1");

    await expect(loadGamificationCatalog(createSupabase([], { message: "geometry unavailable" }), "user-1", {
      actionRows: [],
      progressionEvents: Promise.resolve([]),
      rulesMigrationState: { currentAppliedRulesRevision: 1, lastAcknowledgedRulesRevision: 1 },
    })).rejects.toThrow("geometry unavailable");
  });
});
