import { subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
export { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
import { buildCodexMonthlyUsageEstimate, listCodexUsageWeeklySnapshots } from "./codex-usage-store";
import {
  buildProjectSignalBreakdown,
  buildProjectSignalsHighlights,
  buildScopeInputFromRows,
  clamp,
  countProjectPageViews,
  countTrainingPhotos,
  isWithinWindow,
  orderProjectSignalRows,
  parseDateOrNull,
  PROJECT_SIGNAL_VOLUME_NOTE,
  round6,
  sumTrainingPhotoBytes,
  toMs,
  totalRowsForApiRequests,
  type ActionRow,
  type AppNotificationRow,
  type BaseTimelineRow,
  type CommunityEventRow,
  type EventRsvpRow,
  type FunnelRow,
  type ProfileCreatedAtRow,
  type ProfileRow,
  type ProgressionRow,
  type ProjectSignalRows,
  type ReportRow,
  type ServiceEmailRow,
  type SpotRow,
  type TrainingRow,
} from "./project-signals.calculations";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeInput,
} from "./types";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
function calculateCodexMonthlyUsageInput(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
): {
  codexUsage: EnvironmentalImpactCodexUsageMonthlyEstimate;
  usage: EnvironmentalImpactInfrastructureInput["usage"];
} {
  const codexUsage = buildCodexMonthlyUsageEstimate(snapshots);
  if (codexUsage.weekCount === 0) {
    return {
      codexUsage,
      usage: {
        monthlyCodexSessions: null,
        monthlyCodexConversationTurns: null,
        monthlyCodexToolActions: null,
        monthlyCodexShellCommands: null,
        monthlyCodexFilesTouched: null,
        monthlyCodexTestsRun: null,
        monthlyCodexChangedLines: null,
        monthlyCodexActiveMinutes: null,
      },
    };
  }

  return {
    codexUsage,
    usage: {
      monthlyCodexSessions: codexUsage.monthlyEquivalent.sessionCount,
      monthlyCodexConversationTurns: codexUsage.monthlyEquivalent.conversationCount,
      monthlyCodexToolActions: codexUsage.monthlyEquivalent.toolCallCount,
      monthlyCodexShellCommands: codexUsage.monthlyEquivalent.shellCommandCount,
      monthlyCodexFilesTouched: codexUsage.monthlyEquivalent.fileTouchCount,
      monthlyCodexTestsRun: codexUsage.monthlyEquivalent.testRunCount,
      monthlyCodexChangedLines: codexUsage.monthlyEquivalent.changedLineCount,
      monthlyCodexActiveMinutes: codexUsage.monthlyEquivalent.activeMinutes,
    },
  };
}

function buildProjectSignalRows(
  params: {
    profiles: ProfileRow[];
    actions: ActionRow[];
    spots: SpotRow[];
    funnelEvents: FunnelRow[];
    progressionEvents: ProgressionRow[];
    reports: ReportRow[];
    trainingExamples: TrainingRow[];
    serviceEmails: ServiceEmailRow[];
    communityEvents: CommunityEventRow[];
    eventRsvps: EventRsvpRow[];
    appNotifications: AppNotificationRow[];
  },
  windowFromMs?: number,
  windowUntilMs?: number,
): ProjectSignalRows {
  const filterByWindow = <T extends BaseTimelineRow>(rows: T[]) =>
    rows.filter((row) =>
      windowFromMs === undefined || windowUntilMs === undefined
        ? true
        : isWithinWindow(row.created_at, windowFromMs, windowUntilMs),
    );
  const filterByTimestamp = <T>(rows: T[], toTimestamp: (row: T) => string | null | undefined) =>
    rows.filter((row) =>
      windowFromMs === undefined || windowUntilMs === undefined
        ? true
        : isWithinWindow(toTimestamp(row), windowFromMs, windowUntilMs),
    );

  return {
    profiles: filterByWindow(params.profiles as BaseTimelineRow[]) as ProfileRow[],
    actions: filterByWindow(params.actions),
    spots: filterByWindow(params.spots),
    funnelEvents: params.funnelEvents.filter((row) =>
      windowFromMs === undefined || windowUntilMs === undefined
        ? true
        : isWithinWindow(row.at, windowFromMs, windowUntilMs),
    ),
    progressionEvents: filterByWindow(params.progressionEvents),
    reports: filterByWindow(params.reports),
    trainingExamples: filterByWindow(params.trainingExamples),
    serviceEmails: filterByWindow(params.serviceEmails),
    communityEvents: filterByWindow(params.communityEvents),
    eventRsvps: filterByTimestamp(params.eventRsvps, (row) => row.updated_at),
    appNotifications: filterByWindow(params.appNotifications),
  };
}

async function loadOldestProfileCreatedAt(
  supabase: SupabaseClient,
): Promise<string | null> {
  const result = await supabase
    .from("profiles")
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (result.data ?? [])[0] as ProfileCreatedAtRow | undefined;
  return row?.created_at ?? null;
}

async function loadProfileCreatedAtById(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const result = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .limit(1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (result.data ?? [])[0] as ProfileCreatedAtRow | undefined;
  return row?.created_at ?? null;
}

function findEarliestDate(
  rows: ProjectSignalRows,
  oldestProfileCreatedAt: string | null,
): string | null {
  const timestamps = [
    ...rows.actions.map((row) => toMs(row.created_at)),
    ...rows.spots.map((row) => toMs(row.created_at)),
    ...rows.funnelEvents.map((row) => toMs(row.at)),
    ...rows.progressionEvents.map((row) => toMs(row.created_at)),
    ...rows.reports.map((row) => toMs(row.created_at)),
    ...rows.trainingExamples.map((row) => toMs(row.created_at)),
    ...rows.serviceEmails.map((row) => toMs(row.created_at)),
    ...rows.communityEvents.map((row) => toMs(row.created_at)),
    ...rows.eventRsvps.map((row) => toMs(row.updated_at)),
    ...rows.appNotifications.map((row) => toMs(row.created_at)),
    ...rows.profiles.map((row) => toMs(row.created_at)),
    ...(oldestProfileCreatedAt ? [toMs(oldestProfileCreatedAt)] : []),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.min(...timestamps)).toISOString();
}

function findAccountCreatedAt(
  rows: ProjectSignalRows,
  userId: string,
  accountCreatedAt: string | null,
): string | null {
  if (accountCreatedAt) {
    return accountCreatedAt;
  }

  const profile = rows.profiles.find((entry) => entry.id === userId);
  if (profile) {
    return profile.created_at;
  }

  const userTimestamps = [
    ...rows.actions.filter((row) => row.created_by_clerk_id === userId).map((row) => row.created_at),
    ...rows.spots.filter((row) => row.created_by_clerk_id === userId).map((row) => row.created_at),
    ...rows.funnelEvents.filter((row) => row.user_id === userId).map((row) => row.at),
    ...rows.progressionEvents.filter((row) => row.user_id === userId).map((row) => row.created_at),
    ...rows.reports.filter((row) => row.owner_clerk_id === userId).map((row) => row.created_at),
    ...rows.serviceEmails.filter((row) => row.actor_user_id === userId).map((row) => row.created_at),
    ...rows.communityEvents.filter((row) => row.organizer_clerk_id === userId).map((row) => row.created_at),
    ...rows.eventRsvps.filter((row) => row.participant_clerk_id === userId).map((row) => row.updated_at ?? ""),
    ...rows.appNotifications.filter((row) => row.user_id === userId).map((row) => row.created_at),
  ].filter((value) => Boolean(value));

  if (userTimestamps.length === 0) {
    return null;
  }

  return new Date(
    Math.min(
      ...userTimestamps
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value)),
    ),
  ).toISOString();
}

function calculateAllTimeScopeInput(
  rows: ProjectSignalRows,
  params: {
    userId: string | null;
    accountCreatedAt: string | null;
  },
): EnvironmentalImpactScopeInput {
  const userId = params.userId;
  const actionById = new Map(rows.actions.map((row) => [row.id, row.created_by_clerk_id]));

  const scopedActions = userId
    ? rows.actions.filter((row) => row.created_by_clerk_id === userId)
    : [];
  const scopedSpots = userId
    ? rows.spots.filter((row) => row.created_by_clerk_id === userId)
    : [];
  const scopedFunnel = userId ? rows.funnelEvents.filter((row) => row.user_id === userId) : [];
  const scopedProgression = userId
    ? rows.progressionEvents.filter((row) => row.user_id === userId)
    : [];
  const scopedReports = userId
    ? rows.reports.filter((row) => row.owner_clerk_id === userId)
    : [];
  const scopedEmails = userId ? rows.serviceEmails.filter((row) => row.actor_user_id === userId) : [];
  const scopedTraining = userId
    ? rows.trainingExamples.filter((row) => actionById.get(row.action_id) === userId)
    : [];
  const scopedCommunityEvents = userId
    ? rows.communityEvents.filter((row) => row.organizer_clerk_id === userId)
    : [];
  const scopedEventRsvps = userId
    ? rows.eventRsvps.filter((row) => row.participant_clerk_id === userId)
    : [];
  const scopedNotifications = userId
    ? rows.appNotifications.filter((row) => row.user_id === userId)
    : [];
  const selectedActions = userId ? scopedActions : rows.actions;
  const selectedSpots = userId ? scopedSpots : rows.spots;
  const selectedFunnel = userId ? scopedFunnel : rows.funnelEvents;
  const selectedProgression = userId ? scopedProgression : rows.progressionEvents;
  const selectedReports = userId ? scopedReports : rows.reports;
  const selectedEmails = userId ? scopedEmails : rows.serviceEmails;
  const selectedTraining = userId ? scopedTraining : rows.trainingExamples;
  const selectedCommunityEvents = userId ? scopedCommunityEvents : rows.communityEvents;
  const selectedEventRsvps = userId ? scopedEventRsvps : rows.eventRsvps;
  const selectedNotifications = userId ? scopedNotifications : rows.appNotifications;
  const hasAnySignal =
    selectedActions.length +
      selectedSpots.length +
      selectedFunnel.length +
      selectedProgression.length +
      selectedReports.length +
      selectedEmails.length +
      selectedTraining.length +
      selectedCommunityEvents.length +
      selectedEventRsvps.length +
      selectedNotifications.length >
    0;

  if (!hasAnySignal) {
    return {
      pageViews: null,
      storedImages: null,
      apiRequests: null,
      pdfExports: null,
      maps: null,
      storageGbMonths: null,
      aiCalls: null,
      accountCreatedAt: params.accountCreatedAt ?? null,
      measuredAt: new Date().toISOString(),
    };
  }

  const pageViews = userId
    ? countProjectPageViews(selectedFunnel)
    : countProjectPageViews(rows.funnelEvents);
  const storedImages = selectedTraining.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const apiRequests = userId
    ? scopedActions.length +
      scopedSpots.length +
      scopedFunnel.length +
      scopedProgression.length +
      scopedReports.length +
      scopedTraining.length +
      scopedEmails.length +
      selectedCommunityEvents.length +
      selectedEventRsvps.length +
      selectedNotifications.length
    : totalRowsForApiRequests(rows);
  const pdfExports = userId
    ? scopedReports.filter((row) => row.file_kind === "pdf").length
    : rows.reports.filter((row) => row.file_kind === "pdf").length;
  const maps = selectedActions.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  ).length +
    selectedSpots.filter(
      (row) => row.latitude !== null && row.longitude !== null,
    ).length;
  const aiCalls = userId
    ? scopedTraining.filter((row) => countTrainingPhotos(row.photos) > 0).length
    : rows.trainingExamples.filter((row) => countTrainingPhotos(row.photos) > 0).length;
  const storageGbMonths = round6(
    Math.max(
      0.1,
      (storedImages * 0.0025) +
        (selectedTraining.reduce(
          (acc, row) => acc + sumTrainingPhotoBytes(row.photos),
          0,
        ) /
          1_000_000_000) *
          0.75 +
        (pdfExports * 0.0005) +
        (selectedActions.length * 0.00001) +
        (selectedSpots.length * 0.00001) +
        (selectedCommunityEvents.length * 0.000008) +
        (selectedNotifications.length * 0.000004),
    ),
  );

  return {
    pageViews,
    storedImages,
    apiRequests,
    pdfExports,
    maps,
    storageGbMonths,
    aiCalls,
    accountCreatedAt: params.accountCreatedAt ?? null,
    measuredAt: new Date().toISOString(),
  };
}

function calculateMonthlyUsageInput(rows: ProjectSignalRows): EnvironmentalImpactInfrastructureInput["usage"] {
  const now = new Date();
  const currentWindowFrom = subDays(now, 30).getTime();
  const previousWindowFrom = subDays(now, 60).getTime();
  const currentRows = buildProjectSignalRows(
    rows,
    currentWindowFrom,
    now.getTime(),
  );
  const previousRows = buildProjectSignalRows(
    rows,
    previousWindowFrom,
    currentWindowFrom - 1,
  );

  const currentScope = buildScopeInputFromRows(currentRows, {
    userId: null,
    fromMs: Number.NEGATIVE_INFINITY,
    untilMs: Number.POSITIVE_INFINITY,
  }) as EnvironmentalImpactScopeInput & {
    monthlyPageViews: number;
    monthlyActiveUsers: number;
    monthlySessions: number;
    monthlyEmailsSent: number;
    monthlyPdfExports: number;
    monthlyMapViews: number;
    monthlyAiCalls: number;
    monthlyStorageGbMonths: number;
    monthlyApiRequests: number;
    monthlyAuthEvents: number;
  };
  const previousScope = buildScopeInputFromRows(previousRows, {
    userId: null,
    fromMs: Number.NEGATIVE_INFINITY,
    untilMs: Number.POSITIVE_INFINITY,
  }) as EnvironmentalImpactScopeInput & { monthlyPageViews: number };

  const hasAnyCurrentSignal =
    currentRows.actions.length +
      currentRows.spots.length +
      currentRows.funnelEvents.length +
      currentRows.progressionEvents.length +
      currentRows.reports.length +
      currentRows.trainingExamples.length +
      currentRows.serviceEmails.length +
      currentRows.communityEvents.length +
      currentRows.eventRsvps.length +
      currentRows.appNotifications.length >
    0;

  if (!hasAnyCurrentSignal) {
    return {
      monthlyPageViews: null,
      monthlyActiveUsers: null,
      monthlySessions: null,
      monthlyEmailsSent: null,
      monthlyPdfExports: null,
      monthlyMapViews: null,
      monthlyAiCalls: null,
      monthlyStorageGbMonths: null,
      monthlyApiRequests: null,
      monthlyAuthEvents: null,
      growthRateMonthly: null,
      seasonalityAmplitude: null,
      horizonMonths: 12,
    };
  }

  const growthRateMonthly = clamp(
    ((currentScope.monthlyPageViews - previousScope.monthlyPageViews) /
      Math.max(1, Math.max(previousScope.monthlyPageViews, currentScope.monthlyPageViews))) || 0,
    -0.35,
    0.35,
  );
  const seasonalityAmplitude = clamp(
    Math.abs(currentScope.monthlyPageViews - previousScope.monthlyPageViews) /
      Math.max(1, currentScope.monthlyPageViews + previousScope.monthlyPageViews),
    0.04,
    0.25,
  );

  return {
    monthlyPageViews: currentScope.monthlyPageViews,
    monthlyActiveUsers: currentScope.monthlyActiveUsers,
    monthlySessions: currentScope.monthlySessions,
    monthlyEmailsSent: currentScope.monthlyEmailsSent,
    monthlyPdfExports: currentScope.monthlyPdfExports,
    monthlyMapViews: currentScope.monthlyMapViews,
    monthlyAiCalls: currentScope.monthlyAiCalls,
    monthlyStorageGbMonths: currentScope.monthlyStorageGbMonths,
    monthlyApiRequests: currentScope.monthlyApiRequests,
    monthlyAuthEvents: currentScope.monthlyAuthEvents,
    monthlyRealtimeEvents: Math.max(1, currentScope.monthlyActiveUsers * 8),
    monthlyEgressGb: round6(
      Math.max(
        0.1,
        currentScope.monthlyPageViews * 0.00008 +
          currentScope.monthlyMapViews * 0.0012 +
          currentScope.monthlyStorageGbMonths * 0.12,
      ),
    ),
    monthlyBandwidthGb: round6(
      Math.max(
        0.1,
        currentScope.monthlyPageViews * 0.00011 +
          currentScope.monthlyMapViews * 0.001 +
          currentScope.monthlyPdfExports * 0.002,
      ),
    ),
    monthlyErrorEvents:
      currentScope.monthlyApiRequests > 0
        ? Math.max(0, Math.round(currentScope.monthlyApiRequests * 0.0025))
        : null,
    growthRateMonthly: Number.isFinite(growthRateMonthly) ? growthRateMonthly : null,
    seasonalityAmplitude: Number.isFinite(seasonalityAmplitude) ? seasonalityAmplitude : null,
    horizonMonths: 12,
  };
}

export function buildEnvironmentalImpactProjectSignals(
  rows: ProjectSignalRows,
  params: {
    generatedAt: string;
    userId: string | null;
    oldestProfileCreatedAt?: string | null;
    accountCreatedAt?: string | null;
  },
  codexSnapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[] = [],
  githubRepositoryStats: GitHubRepositoryStats | null = null,
): EnvironmentalImpactProjectSignals {
  const generatedAtDate = parseDateOrNull(params.generatedAt) ?? new Date(params.generatedAt);
  const launchedAt = findEarliestDate(rows, params.oldestProfileCreatedAt ?? null);
  const accountCreatedAt = params.userId
    ? findAccountCreatedAt(rows, params.userId, params.accountCreatedAt ?? null)
    : null;
  const codexUsage = calculateCodexMonthlyUsageInput(codexSnapshots);
  const githubWorkflowRunsCount30d = githubRepositoryStats?.workflowRunsCount30d ?? null;
  const siteInput = calculateAllTimeScopeInput(rows, {
    userId: null,
    accountCreatedAt: null,
  });
  const userInput = calculateAllTimeScopeInput(rows, {
    userId: params.userId,
    accountCreatedAt,
  });

  return {
    generatedAt: generatedAtDate.toISOString(),
    launchedAt,
    accountCreatedAt,
    userId: params.userId,
    periodDays: 30,
    recentWindowDays: 30,
    siteInput,
    userInput,
    codexUsage: codexUsage.codexUsage,
    signalBreakdown: buildProjectSignalBreakdown(rows),
    infrastructureInput: {
      launchedAt,
      referencePeriodMonths: launchedAt
        ? Math.max(1, Math.min(240, Math.ceil((generatedAtDate.getTime() - new Date(launchedAt).getTime()) / (30 * 24 * 60 * 60 * 1000))))
        : 12,
      metrics:
        githubWorkflowRunsCount30d !== null
          ? {
              githubWorkflowRunsCount30d,
            }
          : undefined,
      usage: {
        ...calculateMonthlyUsageInput(rows),
        ...codexUsage.usage,
        ...(githubWorkflowRunsCount30d !== null
          ? { monthlyDeployments: githubWorkflowRunsCount30d }
          : {}),
      },
    },
    highlights: [
      ...buildProjectSignalsHighlights(rows),
      ...(codexUsage.codexUsage.weekCount > 0
        ? [
            {
              label: "Codex CleanMyMap",
              value: codexUsage.codexUsage.estimatedKgCo2eProxy,
              detail: `Journal hebdomadaire sur ${codexUsage.codexUsage.weekCount} semaine${codexUsage.codexUsage.weekCount > 1 ? "s" : ""}.`,
              basis: "recent" as const,
            },
          ]
        : []),
      ...(githubWorkflowRunsCount30d !== null
        ? [
            {
              label: "GitHub Actions runs",
              value: githubWorkflowRunsCount30d,
              detail:
                "Workflow runs GitHub Actions completés sur 30 jours. Cette donnée remplace la projection dérivée sur le poste des déploiements.",
              basis: "recent" as const,
            },
          ]
        : []),
    ],
    notes: [
      PROJECT_SIGNAL_VOLUME_NOTE,
      "Les signaux proviennent des tables opérationnelles CleanMyMap, pas de moyennes externes.",
      "Les vues de page utilisent désormais page_view comme signal route-level principal, avec fallback sur view_new pour l'historique.",
      "Les emails Resend sont journalisés via le service email central pour garder un historique localisé.",
      "Les événements communautaires, RSVP et notifications app sont intégrés pour refléter l'usage produit réel et non un proxy générique.",
      "Les images stockées sont déduites des training_examples et de leurs pièces jointes, afin de rester projet-spécifique.",
      "Les métriques mensuelles sont projetées à partir des 30 derniers jours observés sur le projet.",
      githubWorkflowRunsCount30d === null
        ? "GitHub Actions runs sur 30 jours: NA; le poste de déploiements conserve un proxy dérivé."
        : `GitHub Actions runs sur 30 jours: ${githubWorkflowRunsCount30d}; le poste des déploiements est branché directement sur cette source.`,
      ...codexUsage.codexUsage.notes,
    ],
  };
}

export async function loadEnvironmentalImpactProjectSignals(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    generatedAt?: string;
    githubRepositoryStats?: GitHubRepositoryStats | null;
  },
): Promise<EnvironmentalImpactProjectSignals> {
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const [
    oldestProfileCreatedAt,
    accountCreatedAt,
    actions,
    spots,
    funnelEvents,
    progressionEvents,
    reports,
    trainingExamples,
    serviceEmails,
    communityEvents,
    eventRsvps,
    appNotifications,
  ] = await Promise.all([
    loadOldestProfileCreatedAt(supabase),
    params.userId ? loadProfileCreatedAtById(supabase, params.userId) : Promise.resolve(null),
    orderProjectSignalRows<ActionRow>(
      supabase
        .from("actions")
        .select("id, created_at, created_by_clerk_id, latitude, longitude, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
      ],
    ),
    orderProjectSignalRows<SpotRow>(
      supabase
        .from("spots")
        .select("created_at, created_by_clerk_id, latitude, longitude, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["created_by_clerk_id", false],
        ["latitude", false],
        ["longitude", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<FunnelRow>(
      supabase
        .from("funnel_events")
        .select("at, user_id, session_id, step, mode, meta")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["at", false],
        ["session_id", false],
        ["step", false],
        ["mode", false],
        ["user_id", false],
      ],
    ),
    orderProjectSignalRows<ProgressionRow>(
      supabase
        .from("progression_events")
        .select("created_at, user_id, event_type, status_phase")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["user_id", false],
        ["event_type", false],
        ["status_phase", false],
      ],
    ),
    orderProjectSignalRows<ReportRow>(
      supabase
        .from("reports")
        .select("created_at, owner_clerk_id, file_kind")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["owner_clerk_id", false],
        ["file_kind", false],
      ],
    ),
    orderProjectSignalRows<TrainingRow>(
      supabase
        .from("training_examples")
        .select("action_id, created_at, photos, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["action_id", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<ServiceEmailRow>(
      supabase
        .from("service_email_events")
        .select("created_at, actor_user_id, recipient_count, status")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["actor_user_id", false],
        ["recipient_count", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<CommunityEventRow>(
      supabase
        .from("community_events")
        .select("id, created_at, organizer_clerk_id, title, event_date, location_label, description")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
        ["organizer_clerk_id", false],
        ["event_date", false],
        ["title", false],
      ],
    ),
    orderProjectSignalRows<EventRsvpRow>(
      supabase
        .from("event_rsvps")
        .select("event_id, participant_clerk_id, status, updated_at")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["updated_at", false],
        ["event_id", false],
        ["participant_clerk_id", false],
        ["status", false],
      ],
    ),
    orderProjectSignalRows<AppNotificationRow>(
      supabase
        .from("app_notifications")
        .select("id, user_id, type, title, content, read_at, created_at")
        .limit(PROJECT_SIGNAL_ROW_LIMIT),
      [
        ["created_at", false],
        ["id", false],
        ["user_id", false],
        ["type", false],
      ],
    ),
  ]);
  const codexSnapshots = await listCodexUsageWeeklySnapshots(12);

  const error = [
    actions.error,
    spots.error,
    funnelEvents.error,
    progressionEvents.error,
    reports.error,
    trainingExamples.error,
    serviceEmails.error,
    communityEvents.error,
    eventRsvps.error,
    appNotifications.error,
  ].find(Boolean);

  if (error) {
    throw new Error(error?.message ?? "Impossible de charger les signaux environnementaux du projet.");
  }

  return buildEnvironmentalImpactProjectSignals(
    {
      profiles: [],
      actions: (actions.data ?? []) as ActionRow[],
      spots: (spots.data ?? []) as SpotRow[],
      funnelEvents: (funnelEvents.data ?? []) as FunnelRow[],
      progressionEvents: (progressionEvents.data ?? []) as ProgressionRow[],
      reports: (reports.data ?? []) as ReportRow[],
      trainingExamples: (trainingExamples.data ?? []) as TrainingRow[],
      serviceEmails: (serviceEmails.data ?? []) as ServiceEmailRow[],
      communityEvents: (communityEvents.data ?? []) as CommunityEventRow[],
      eventRsvps: (eventRsvps.data ?? []) as EventRsvpRow[],
      appNotifications: (appNotifications.data ?? []) as AppNotificationRow[],
    },
    {
      generatedAt,
      userId: params.userId,
      oldestProfileCreatedAt,
      accountCreatedAt,
    },
    codexSnapshots,
    params.githubRepositoryStats ?? null,
  );
}
