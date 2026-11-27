import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "./gamification-types";

const authState = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  userId: "user-A" as string | null,
}));

const swrStore = vi.hoisted(() => new Map<string, { data?: MeResponse; isLoading: boolean; error?: unknown }>());

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => authState,
}));

vi.mock("@/components/sections/rubriques/shared", () => ({
  SectionShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: "fr",
    theme: "light",
    displayMode: "calme",
    setDisplayMode: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("./gamification-panels", () => ({
  CelebrationsPanel: () => <div />,
  EngagementPanel: () => <div />,
  RecognitionPanel: () => <div />,
}));

vi.mock("./gamification-catalog-panel", () => ({ GamificationCatalogPanel: () => <div /> }));
vi.mock("./gamification-rules-migration-notice", () => ({ GamificationRulesMigrationNotice: () => <div /> }));
vi.mock("./gamification-reconciliation-notice", () => ({ GamificationReconciliationNotice: () => <div /> }));
vi.mock("./gamification-impact-panel", () => ({ GamificationImpactPanel: () => <div /> }));
vi.mock("./gamification-level-progress-panel", () => ({ GamificationLevelProgressPanel: () => <div /> }));
vi.mock("./gamification-spogomi-collection", () => ({ GamificationSpogomiCollection: () => <div /> }));
vi.mock("./territorial-legends-panel", () => ({ TerritorialLegendsPanel: () => <div /> }));
vi.mock("./gamification-brigade-verte-panel", () => ({ GamificationBrigadeVertePanel: () => <div /> }));

vi.mock("swr", () => ({
  default: (key: unknown) => {
    if (!key) return { data: undefined, isLoading: false, error: undefined, mutate: vi.fn() };
    const serialized = JSON.stringify(key);
    return {
      ...(swrStore.get(serialized) ?? { data: undefined, isLoading: true, error: undefined }),
      mutate: vi.fn(),
    };
  },
}));

import { GamificationSection } from "./index";

function makeMeResponse(userId: string, receiptId: string): MeResponse {
  return {
    status: "ok",
    progression: {
      userId,
      xpTotal: userId === "user-A" ? 10 : 2,
      xpValidated: userId === "user-A" ? 10 : 2,
      xpPending: 0,
      currentLevel: 1,
      potentialLevel: 1,
      nextLevel: { level: 2, xpRequired: 5, xpRemaining: 3, frozen: false, requirements: { missing: [], satisfied: [] } },
      badges: [],
      badgeCatalog: [],
      summary: { progressions: [], milestones: [], terrainSpecializations: [] },
      engagementStatus: {},
      impact: {},
      impactMethodology: {},
      dynamicRanking: {},
      monthlyMilestone: {},
      recognition: {},
      annualRecognition: {},
      yearToDateImpact: {},
      history: { timeline: [], mapPoints: [] },
    } as unknown as MeResponse["progression"],
    reconciliation: null,
    reconciliationTarget: null,
    reconciliationHistory: [
      {
        notificationId: receiptId,
        createdAt: "2026-11-01T10:00:00.000Z",
        seenAt: null,
        acknowledgedAt: null,
        receipt: {
          reconciliationId: receiptId,
          userId,
          occurredAt: "2026-11-01T10:00:00.000Z",
          previousRulesVersion: "v1",
          currentRulesVersion: "v2",
          previousRulesRevision: 1,
          currentRulesRevision: 2,
          xp: { before: 10, after: 10, delta: 0, gained: 0, removed: 0 },
          level: { before: 1, after: 1, changed: false, direction: "same" },
          progressions: { added: [], removed: [], changed: [] },
          badges: { unlocked: [], removed: [], upgraded: [], downgraded: [] },
          milestones: { unlocked: [], removed: [] },
          eventChanges: { addedCount: 0, updatedCount: 0, removedCount: 0 },
          catalogChanges: { newProgressionIds: [], newMilestoneIds: [], retiredMechanicIds: [] },
          reasonCategory: "data_correction",
          hasUserVisibleChanges: false,
        },
      },
    ],
  };
}

describe("GamificationSection session isolation", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalSelf = globalThis.self;

  beforeEach(() => {
    swrStore.clear();
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = "user-A";
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
      HTMLElement: class HTMLElement {},
      self: globalThis,
      window: {
        location: { hash: "", pathname: "/sections/gamification", search: "" },
        history: { state: null, replaceState: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        requestAnimationFrame: () => 0,
        cancelAnimationFrame: () => {},
      },
      document: {
        body: { style: { overflow: "" } },
        activeElement: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getElementById: () => null,
      },
    });
  });

  afterEach(() => {
    Object.assign(globalThis, {
      window: originalWindow,
      document: originalDocument,
      self: originalSelf,
    });
  });

  it("resets local receipt state on account switch/sign-out and ignores late user-A data", () => {
    swrStore.set(JSON.stringify(["gamification-me", "user-A", null]), {
      data: makeMeResponse("user-A", "receipt-A"),
      isLoading: false,
    });

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<GamificationSection />);
    });

    // Open receipt-A in GamificationReconciliationHistory
    const openBtn = renderer.root
      .findAllByType("button")
      .find((b) => String(b.props.children).includes("Détails") || String(b.props.children).includes("Voir"));
    if (openBtn) {
      act(() => {
        (openBtn.props.onClick as () => void)();
      });
    }

    // Switch to user-B (still loading, and user-A late response arrives in swrStore)
    authState.userId = "user-B";
    swrStore.set(JSON.stringify(["gamification-me", "user-B", null]), {
      data: undefined,
      isLoading: true,
    });
    act(() => {
      renderer.update(<GamificationSection />);
    });

    // Neither receipt-A nor user-A data may be present on user-B's mounted subtree
    const serializedTree = JSON.stringify(renderer.toJSON());
    expect(serializedTree).not.toContain("receipt-A");

    // Sign out -> anonymous
    authState.isSignedIn = false;
    authState.userId = null;
    act(() => {
      renderer.update(<GamificationSection />);
    });
    expect(JSON.stringify(renderer.toJSON())).not.toContain("receipt-A");

    act(() => {
      renderer.unmount();
    });
  });
});
