import { subDays } from "date-fns";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  buildEnvironmentalImpactProjectSignals,
  loadEnvironmentalImpactProjectSignals,
  PROJECT_SIGNAL_ROW_LIMIT,
} from "./project-signals";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";

vi.mock("./codex-usage-store", async () => {
  const actual = await vi.importActual<typeof import("./codex-usage-store")>("./codex-usage-store");

  return {
    ...actual,
    listCodexUsageWeeklySnapshots: vi.fn(async () => []),
  };
});

const projectSignalsNow = new Date("2026-05-20T12:00:00.000Z");
const projectSignalsUserId = "user_1";
const projectSignalsOtherUserId = "user_2";

const projectSignalsRows = {
  profiles: [{ id: projectSignalsUserId, created_at: subDays(projectSignalsNow, 100).toISOString() }],
  actions: [
    {
      id: "action-1",
      created_at: subDays(projectSignalsNow, 12).toISOString(),
      created_by_clerk_id: projectSignalsUserId,
      latitude: 48.8566,
      longitude: 2.3522,
      status: "approved",
    },
    {
      id: "action-2",
      created_at: subDays(projectSignalsNow, 42).toISOString(),
      created_by_clerk_id: projectSignalsOtherUserId,
      latitude: null,
      longitude: null,
      status: "pending",
    },
  ],
  spots: [
    {
      created_at: subDays(projectSignalsNow, 20).toISOString(),
      created_by_clerk_id: projectSignalsUserId,
      latitude: 48.85,
      longitude: 2.34,
      status: "validated",
    },
  ],
  funnelEvents: [
    {
      at: subDays(projectSignalsNow, 10).toISOString(),
      user_id: projectSignalsUserId,
      session_id: "session-1",
      meta: {
        source: "route_tracker",
        kind: "pageview",
        pagePath: PROFIL_ROUTE,
      },
      step: "page_view",
      mode: "complete",
    },
    {
      at: subDays(projectSignalsNow, 9).toISOString(),
      user_id: projectSignalsOtherUserId,
      session_id: "session-2",
      meta: {
        source: "route_tracker",
        kind: "pageview",
        pagePath: "/community",
      },
      step: "page_view",
      mode: "complete",
    },
    {
      at: subDays(projectSignalsNow, 8).toISOString(),
      user_id: projectSignalsUserId,
      session_id: "session-1",
      step: "view_new",
      mode: "complete",
    },
    {
      at: subDays(projectSignalsNow, 40).toISOString(),
      user_id: projectSignalsOtherUserId,
      session_id: "session-2",
      step: "view_new",
      mode: "quick",
    },
  ],
  progressionEvents: [
    {
      created_at: subDays(projectSignalsNow, 8).toISOString(),
      user_id: projectSignalsUserId,
      event_type: "spot_created",
      status_phase: "validated",
    },
  ],
  reports: [
    {
      created_at: subDays(projectSignalsNow, 15).toISOString(),
      owner_clerk_id: projectSignalsUserId,
      file_kind: "pdf",
    },
    {
      created_at: subDays(projectSignalsNow, 45).toISOString(),
      owner_clerk_id: projectSignalsOtherUserId,
      file_kind: "csv",
    },
  ],
  trainingExamples: [
    {
      action_id: "action-1",
      created_at: subDays(projectSignalsNow, 9).toISOString(),
      photos: [{ size: 1_500_000 }, { size: 500_000 }],
      status: "labelled",
    },
    {
      action_id: "action-2",
      created_at: subDays(projectSignalsNow, 50).toISOString(),
      photos: [{ size: 2_000_000 }],
      status: "pending_label",
    },
  ],
  serviceEmails: [
    {
      created_at: subDays(projectSignalsNow, 7).toISOString(),
      actor_user_id: projectSignalsUserId,
      recipient_count: 2,
      status: "sent",
    },
    {
      created_at: subDays(projectSignalsNow, 35).toISOString(),
      actor_user_id: projectSignalsOtherUserId,
      recipient_count: 1,
      status: "sent",
    },
  ],
  communityEvents: [
    {
      id: "event-1",
      created_at: subDays(projectSignalsNow, 18).toISOString(),
      organizer_clerk_id: projectSignalsUserId,
      title: "Ramassage",
      event_date: subDays(projectSignalsNow, 12).toISOString(),
      location_label: "Paris 11",
      description: "Test",
    },
  ],
  eventRsvps: [
    {
      event_id: "event-1",
      participant_clerk_id: projectSignalsUserId,
      status: "yes" as const,
      updated_at: subDays(projectSignalsNow, 17).toISOString(),
    },
    {
      event_id: "event-1",
      participant_clerk_id: projectSignalsOtherUserId,
      status: "maybe" as const,
      updated_at: subDays(projectSignalsNow, 16).toISOString(),
    },
  ],
  appNotifications: [
    {
      id: "notif-1",
      user_id: projectSignalsUserId,
      type: "community",
      title: "Nouveau message",
      content: "Un nouvel événement a été créé",
      read_at: null,
      created_at: subDays(projectSignalsNow, 6).toISOString(),
    },
    {
      id: "notif-2",
      user_id: projectSignalsOtherUserId,
      type: "system",
      title: "Mise à jour",
      content: "Test",
      read_at: subDays(projectSignalsNow, 5).toISOString(),
      created_at: subDays(projectSignalsNow, 5).toISOString(),
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(projectSignalsNow);
});

afterEach(() => {
  vi.useRealTimers();
});

it("documents the explicit row cap in the notes", () => {
  const now = new Date();
  const signals = buildEnvironmentalImpactProjectSignals(
    {
      profiles: [],
      actions: [],
      spots: [],
      funnelEvents: [],
      progressionEvents: [],
      reports: [],
      trainingExamples: [],
      serviceEmails: [],
      communityEvents: [],
      eventRsvps: [],
      appNotifications: [],
    },
    {
      generatedAt: now.toISOString(),
      userId: null,
    },
  );

  expect(signals.notes.some((note) => note.includes("plafonnés"))).toBe(true);
  expect(
    signals.notes.some((note) =>
      note.includes(new Intl.NumberFormat("fr-FR").format(PROJECT_SIGNAL_ROW_LIMIT)),
    ),
  ).toBe(true);
});

it("builds project-specific site, user and monthly usage inputs", () => {
    const now = projectSignalsNow;
    const userId = projectSignalsUserId;
    const rows = projectSignalsRows;

    const signals = buildEnvironmentalImpactProjectSignals(rows, {
      generatedAt: now.toISOString(),
      userId,
    });

  expectProjectSignalsRows(signals);
});

function expectProjectSignalsRows(
  signals: ReturnType<typeof buildEnvironmentalImpactProjectSignals>,
): void {
  expectProjectSignalsOverview(signals);
  expectProjectSignalsTraffic(signals);
  expectProjectSignalsCommunity(signals);
  expectProjectSignalsHighlights(signals);
}

function expectProjectSignalsOverview(
  signals: ReturnType<typeof buildEnvironmentalImpactProjectSignals>,
): void {
  expect(signals.launchedAt).toBeDefined();
  expect(signals.accountCreatedAt).toBeDefined();
  expect(signals.siteInput.pageViews).toBe(2);
  expect(signals.userInput.pageViews).toBe(1);
  expect(signals.siteInput.pdfExports).toBe(1);
  expect(signals.userInput.pdfExports).toBe(1);
  expect(signals.siteInput.aiCalls).toBe(2);
  expect(signals.userInput.aiCalls).toBe(1);
  expect(signals.infrastructureInput.usage?.monthlyPageViews).toBe(2);
  expect(signals.infrastructureInput.usage?.monthlyEmailsSent).toBe(2);
  expect(signals.infrastructureInput.usage?.monthlyPdfExports).toBe(1);
  expect(signals.infrastructureInput.usage?.monthlyRealtimeEvents).toBeGreaterThan(0);
  expect(signals.codexUsage?.weekCount).toBe(0);
}

function expectProjectSignalsTraffic(
  signals: ReturnType<typeof buildEnvironmentalImpactProjectSignals>,
): void {
  expect(signals.signalBreakdown?.traffic.pageViewEvents).toBe(2);
  expect(signals.signalBreakdown?.traffic.legacyPageViewEvents).toBe(2);
  expect(signals.signalBreakdown?.traffic.distinctRoutes).toBe(2);
  expect(signals.signalBreakdown?.traffic.topRoutes[0]?.path).toBe("/community");
}

function expectProjectSignalsCommunity(
  signals: ReturnType<typeof buildEnvironmentalImpactProjectSignals>,
): void {
  expect(signals.signalBreakdown?.community.events).toBe(1);
  expect(signals.signalBreakdown?.community.notifications).toBe(2);
  expect(signals.signalBreakdown?.community.unreadNotifications).toBe(1);
  expect(signals.signalBreakdown?.communication.emailsSent).toBe(3);
  expect(signals.signalBreakdown?.communication.pdfExports).toBe(1);
}

function expectProjectSignalsHighlights(
  signals: ReturnType<typeof buildEnvironmentalImpactProjectSignals>,
): void {
  expect(signals.highlights.some((item) => item.label === "Pages vues CleanMyMap")).toBe(true);
  expect(signals.highlights.some((item) => item.label === "Événements communauté")).toBe(true);
  expect(signals.highlights.some((item) => item.label === "Notifications non lues")).toBe(true);
  expect(signals.highlights.some((item) => item.label === "Routes distinctes")).toBe(true);
  expect(signals.notes.some((note) => note.includes("tables opérationnelles CleanMyMap"))).toBe(true);
  expect(signals.notes.some((note) => note.includes("page_view"))).toBe(true);
}

it("loads project signals with deterministic ordering under the cap", async () => {
    const orderingsByTable = new Map<string, Array<{ column: string; ascending?: boolean }>>();
    const { supabase, getProfilesQueryCount } = createProjectSignalsLoadSupabaseMock(orderingsByTable);

    const signals = await loadEnvironmentalImpactProjectSignals(supabase as never, {
      userId: "user-1",
      generatedAt: "2026-05-20T12:00:00.000Z",
    });

    expect(signals.signalBreakdown?.traffic.pageViewEvents).toBe(2);
    expect(getProfilesQueryCount()).toBe(2);
    expect(orderingsByTable.get("profiles-oldest")).toEqual([
      { column: "created_at", ascending: true },
    ]);
    expect(orderingsByTable.get("profiles-current")).toEqual([]);
    expect(orderingsByTable.get("actions")).toEqual([
      { column: "created_at", ascending: false },
      { column: "id", ascending: false },
    ]);
    expect(orderingsByTable.get("funnel_events")).toEqual([
      { column: "at", ascending: false },
      { column: "session_id", ascending: false },
      { column: "step", ascending: false },
      { column: "mode", ascending: false },
      { column: "user_id", ascending: false },
    ]);
});

it("uses GitHub Actions runs as a direct monthly deployment source when available", () => {
  const now = new Date();
  const rows = {
    profiles: [],
    actions: [],
    spots: [],
    funnelEvents: [],
    progressionEvents: [],
    reports: [],
    trainingExamples: [],
    serviceEmails: [],
    communityEvents: [],
    eventRsvps: [],
    appNotifications: [],
  };

  const signals = buildEnvironmentalImpactProjectSignals(
    rows,
    {
      generatedAt: now.toISOString(),
      userId: null,
    },
    [],
    {
      fullName: "maxd4/CleanmyMap",
      htmlUrl: "https://github.com/maxd4/CleanmyMap",
      isPrivate: false,
      defaultBranch: "main",
      workflowRunsCount30d: 27,
      dependabotOpenAlertsCount: 0,
      codeScanningWarningCount: 0,
      actionsQuotaLabel: "Repo public: runners standards gratuits et illimités",
      actionsNotes: [],
      source: "api",
    },
  );

  expect(signals.infrastructureInput.usage?.monthlyDeployments).toBe(27);
  expect(signals.infrastructureInput.metrics?.githubWorkflowRunsCount30d).toBe(27);
  expect(signals.highlights.some((item) => item.label === "GitHub Actions runs")).toBe(true);
  expect(signals.notes.some((note) => note.includes("GitHub Actions runs sur 30 jours: 27"))).toBe(true);
});

type QueryChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (
    onfulfilled?: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
    onrejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

function createProjectSignalsQueryChain(
  orderingsByTable: Map<string, Array<{ column: string; ascending?: boolean }>>,
  table: string,
  rows: Array<Record<string, unknown>>,
): QueryChain {
  const state: {
    orderings: Array<{ column: string; ascending?: boolean }>;
    limitValue: number;
  } = {
    orderings: [],
    limitValue: rows.length,
  };

  const chain = {} as Partial<QueryChain>;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn((column: string, options?: { ascending?: boolean }) => {
    state.orderings.push({ column, ascending: options?.ascending });
    return chain;
  });
  chain.limit = vi.fn((limit: number) => {
    state.limitValue = limit;
    return chain;
  });
  chain.then = ((onfulfilled, onrejected) => {
    orderingsByTable.set(table, [...state.orderings]);
    return Promise.resolve({
      data: rows.slice(0, state.limitValue),
      error: null,
    }).then(onfulfilled, onrejected);
  }) as QueryChain["then"];

  return chain as QueryChain;
}

function createProjectSignalsLoadSupabaseMock(orderingsByTable: Map<string, Array<{ column: string; ascending?: boolean }>>) {
  let profilesQueryCount = 0;
  const emptyTables = new Set([
    "progression_events",
    "reports",
    "training_examples",
    "service_email_events",
    "community_events",
    "event_rsvps",
    "app_notifications",
  ]);

  return {
    supabase: {
      from: vi.fn((table: string) => {
        switch (table) {
          case "profiles":
            profilesQueryCount += 1;
            return profilesQueryCount === 1
              ? createProjectSignalsQueryChain(orderingsByTable, "profiles-oldest", [
                  { created_at: "2026-05-01T12:00:00Z" },
                ])
              : createProjectSignalsQueryChain(orderingsByTable, "profiles-current", [
                  { created_at: "2026-05-02T12:00:00Z" },
                ]);
          case "actions":
            return createProjectSignalsQueryChain(orderingsByTable, table, [
              {
                id: "action-b",
                created_at: "2026-05-03T12:00:00Z",
                created_by_clerk_id: "user-2",
                latitude: null,
                longitude: null,
                status: "approved",
              },
              {
                id: "action-a",
                created_at: "2026-05-03T12:00:00Z",
                created_by_clerk_id: "user-1",
                latitude: 48.85,
                longitude: 2.35,
                status: "approved",
              },
            ]);
          case "spots":
            return createProjectSignalsQueryChain(orderingsByTable, table, [
              {
                created_at: "2026-05-04T12:00:00Z",
                created_by_clerk_id: "user-2",
                latitude: 48.85,
                longitude: 2.35,
                status: "validated",
              },
            ]);
          case "funnel_events":
            return createProjectSignalsQueryChain(orderingsByTable, table, [
              {
                at: "2026-05-05T12:00:00Z",
                user_id: "user-2",
                session_id: "session-b",
                step: "page_view",
                mode: "complete",
                meta: { pagePath: "/b" },
              },
              {
                at: "2026-05-05T12:00:00Z",
                user_id: "user-1",
                session_id: "session-a",
                step: "page_view",
                mode: "complete",
                meta: { pagePath: "/a" },
              },
            ]);
          default:
            if (emptyTables.has(table)) {
              return createProjectSignalsQueryChain(orderingsByTable, table, []);
            }

            throw new Error(`Unexpected table: ${table}`);
        }
      }),
    },
    getProfilesQueryCount: () => profilesQueryCount,
  };
}
