import { subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
import {
  buildCodexMonthlyUsageEstimate,
  listCodexUsageWeeklySnapshots,
} from "./codex-usage-store";
import type { GitHubRepositoryStats } from "@/lib/github/github-repository-stats";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactProjectSignal,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
} from "./types";

type BaseTimelineRow = {
  created_at: string;
};

type ProjectSignalQueryBuilder = {
  order(column: string, options?: { ascending?: boolean }): ProjectSignalQueryBuilder;
  limit(limit: number): ProjectSignalQueryBuilder;
};

type FunnelRow = {
  at: string;
  user_id: string | null;
  session_id: string;
  step: string;
  mode: string;
  meta?: Record<string, unknown> | null;
};

type ProgressionRow = {
  created_at: string;
  user_id: string;
  event_type: string;
  status_phase: string;
};

type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

type SpotRow = {
  created_at: string;
  created_by_clerk_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

type ReportRow = {
  created_at: string;
  owner_clerk_id: string;
  file_kind: string;
};

type TrainingRow = {
  action_id: string;
  created_at: string;
  photos: unknown;
  status: string;
};

type ServiceEmailRow = {
  created_at: string;
  actor_user_id: string | null;
  recipient_count: number;
  status: string;
};

type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
  updated_at: string | null;
};

type AppNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  created_at: string;
};

type ProjectSignalRows = {
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
};

const PROJECT_SIGNAL_VOLUME_NOTE =
  `Volumes plafonnés à ${new Intl.NumberFormat("fr-FR").format(PROJECT_SIGNAL_ROW_LIMIT)} lignes par table; au-delà, la lecture reste indicative.`;

async function limitProjectSignalRows<T>(
  query: ProjectSignalQueryBuilder,
  orderings: Array<[column: string, ascending?: boolean]>,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  let orderedQuery = query;

  for (const [column, ascending = false] of orderings) {
    orderedQuery = orderedQuery.order(column, { ascending });
  }

  return (await orderedQuery.limit(PROJECT_SIGNAL_ROW_LIMIT)) as unknown as {
    data: T[] | null;
    error: { message: string } | null;
  };
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toMs(value: string | null | undefined): number | null {
  const date = parseDateOrNull(value);
  return date ? date.getTime() : null;
}

function isWithinWindow(
  value: string | null | undefined,
  fromMs: number,
  untilMs: number,
): boolean {
  const ms = toMs(value);
  return ms !== null && ms >= fromMs && ms <= untilMs;
}

function countDistinct(values: Array<string | null | undefined>): number {
  return new Set(
    values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
  ).size;
}

function getFunnelMetaString(row: FunnelRow, keys: string[]): string | null {
  if (!row.meta) {
    return null;
  }

  for (const key of keys) {
    const value = row.meta[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getFunnelPagePath(row: FunnelRow): string | null {
  return getFunnelMetaString(row, ["pagePath", "pathname", "routePath"]);
}

function countProjectPageViews(rows: FunnelRow[]): number {
  const detailedPageViews = rows.filter((row) => row.step === "page_view").length;
  if (detailedPageViews > 0) {
    return detailedPageViews;
  }

  return rows.filter((row) => row.step === "view_new").length;
}

function countProjectPageViewRoutes(rows: FunnelRow[]): number {
  return countDistinct(
    rows
      .filter((row) => row.step === "page_view" || row.step === "view_new" || row.step === "start_form")
      .map((row) => getFunnelPagePath(row)),
  );
}

function countProjectUnreadNotifications(rows: AppNotificationRow[]): number {
  return rows.filter((row) => row.read_at === null).length;
}

function buildTopPageViewRoutes(rows: FunnelRow[]): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.step !== "page_view" && row.step !== "view_new") {
      continue;
    }

    const path = getFunnelPagePath(row);
    if (!path) {
      continue;
    }

    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.path.localeCompare(right.path, "fr");
    })
    .slice(0, 5);
}

function countTrainingPhotos(raw: unknown): number {
  if (!Array.isArray(raw)) {
    return 0;
  }

  return raw.length;
}

function sumTrainingPhotoBytes(raw: unknown): number {
  if (!Array.isArray(raw)) {
    return 0;
  }

  return raw.reduce((acc, item) => {
    if (!item || typeof item !== "object") {
      return acc;
    }
    const maybeSize = (item as { size?: unknown }).size;
    return acc + (typeof maybeSize === "number" && Number.isFinite(maybeSize) ? maybeSize : 0);
  }, 0);
}

function totalRowsForApiRequests(rows: ProjectSignalRows): number {
  return (
    rows.actions.length +
    rows.spots.length +
    rows.funnelEvents.length +
    rows.progressionEvents.length +
    rows.reports.length +
    rows.trainingExamples.length +
    rows.serviceEmails.length +
    rows.communityEvents.length +
    rows.eventRsvps.length +
    rows.appNotifications.length
  );
}

function buildScopeInputFromRows(
  rows: ProjectSignalRows,
  params: {
    userId: string | null;
    fromMs?: number;
    untilMs?: number;
    accountCreatedAt?: string | null;
  },
): EnvironmentalImpactScopeInput {
  const fromMs = params.fromMs ?? Number.NEGATIVE_INFINITY;
  const untilMs = params.untilMs ?? Number.POSITIVE_INFINITY;
  const userId = params.userId;
  const actionById = new Map(rows.actions.map((row) => [row.id, row.created_by_clerk_id]));

  const funnelRows = rows.funnelEvents.filter((row) => isWithinWindow(row.at, fromMs, untilMs));
  const progressionRows = rows.progressionEvents.filter((row) =>
    isWithinWindow(row.created_at, fromMs, untilMs),
  );
  const actionRows = rows.actions.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs));
  const spotRows = rows.spots.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs));
  const reportRows = rows.reports.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs));
  const trainingRows = rows.trainingExamples.filter((row) =>
    isWithinWindow(row.created_at, fromMs, untilMs),
  );
  const emailRows = rows.serviceEmails.filter((row) =>
    isWithinWindow(row.created_at, fromMs, untilMs),
  );
  const communityEventRows = rows.communityEvents.filter((row) =>
    isWithinWindow(row.created_at, fromMs, untilMs),
  );
  const eventRsvpRows = rows.eventRsvps.filter((row) =>
    isWithinWindow(row.updated_at, fromMs, untilMs),
  );
  const notificationRows = rows.appNotifications.filter((row) =>
    isWithinWindow(row.created_at, fromMs, untilMs),
  );

  const attributedTrainingRows = trainingRows.filter((row) => {
    if (!userId) {
      return false;
    }
    const ownerId = actionById.get(row.action_id) ?? null;
    return ownerId === userId;
  });

  const pageViews = countProjectPageViews(funnelRows);
  const storedImages = trainingRows.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const pdfExports = reportRows.filter((row) => row.file_kind === "pdf").length;
  const maps = actionRows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  ).length + spotRows.filter((row) => row.latitude !== null && row.longitude !== null).length;
  const aiCalls = trainingRows.filter((row) => countTrainingPhotos(row.photos) > 0).length;
  const emailCount = emailRows.reduce((acc, row) => {
    if (row.status !== "sent") {
      return acc;
    }

    return acc + Math.max(0, Number(row.recipient_count ?? 0));
  }, 0);
  const sessionCount = countDistinct(funnelRows.map((row) => row.session_id));
  const activeUserCount = countDistinct([
    ...funnelRows.map((row) => row.user_id),
    ...progressionRows.map((row) => row.user_id),
    ...actionRows.map((row) => row.created_by_clerk_id),
    ...spotRows.map((row) => row.created_by_clerk_id),
    ...reportRows.map((row) => row.owner_clerk_id),
    ...emailRows.map((row) => row.actor_user_id),
    ...attributedTrainingRows.map((row) => actionById.get(row.action_id) ?? null),
    ...communityEventRows.map((row) => row.organizer_clerk_id),
    ...eventRsvpRows.map((row) => row.participant_clerk_id),
    ...notificationRows.map((row) => row.user_id),
  ]);
  const apiRequests =
    funnelRows.length +
    progressionRows.length +
    actionRows.length +
    spotRows.length +
    reportRows.length +
    trainingRows.length +
    emailRows.length +
    communityEventRows.length +
    eventRsvpRows.length +
    notificationRows.length;
  const photoBytes = trainingRows.reduce(
    (acc, row) => acc + sumTrainingPhotoBytes(row.photos),
    0,
  );
  const storageGbMonths = round6(
      Math.max(
        0.1,
        (storedImages * 0.0025) +
          (photoBytes / 1_000_000_000) * 0.75 +
          (pdfExports * 0.0005) +
          (actionRows.length * 0.00001) +
        (spotRows.length * 0.00001) +
        (communityEventRows.length * 0.000008) +
        (notificationRows.length * 0.000004),
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
    measuredAt: new Date(Math.max(fromMs, Number.isFinite(untilMs) ? untilMs : Date.now())).toISOString(),
    monthlyPageViews: pageViews,
    monthlyActiveUsers: Math.max(1, activeUserCount),
    monthlySessions: Math.max(1, sessionCount),
    monthlyEmailsSent: emailCount,
    monthlyPdfExports: pdfExports,
    monthlyMapViews: maps,
    monthlyAiCalls: aiCalls,
    monthlyStorageGbMonths: storageGbMonths,
    monthlyApiRequests: apiRequests,
    monthlyAuthEvents: Math.max(1, activeUserCount),
  } as EnvironmentalImpactScopeInput & {
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
}

function buildProjectSignalsHighlights(
  rows: ProjectSignalRows,
  params: {
    generatedAt: string;
    accountCreatedAt: string | null;
    userId: string | null;
  },
): EnvironmentalImpactProjectSignal[] {
  const actionById = new Map(rows.actions.map((row) => [row.id, row.created_by_clerk_id]));
  const detailedPageViews = rows.funnelEvents.filter((row) => row.step === "page_view");
  const legacyPageViews = rows.funnelEvents.filter((row) => row.step === "view_new");

  const allTrainingPhotos = rows.trainingExamples.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const recentEmailCount = rows.serviceEmails.reduce((acc, row) => {
    if (row.status !== "sent") {
      return acc;
    }

    return acc + Math.max(0, Number(row.recipient_count ?? 0));
  }, 0);
  const communityEventCount = rows.communityEvents.length;
  const rsvpCount = rows.eventRsvps.length;
  const notificationCount = rows.appNotifications.length;
  const unreadNotificationCount = countProjectUnreadNotifications(rows.appNotifications);
  const routeCount = countProjectPageViewRoutes(rows.funnelEvents);

  return [
    {
      label: "Pages vues CleanMyMap",
      value: detailedPageViews.length > 0 ? detailedPageViews.length : legacyPageViews.length,
      detail:
        "Signal route-level prioritaire via page_view, avec fallback sur les vues de tunnel view_new.",
      basis: "all_time",
    },
    {
      label: "Pages vues tunnel",
      value: legacyPageViews.length,
      detail: "Vues de démarrage de formulaire conservées pour l'audit historique.",
      basis: "all_time",
    },
    {
      label: "Routes distinctes",
      value: routeCount,
      detail: "Nombre de chemins uniques capturés dans les métadonnées de page_view.",
      basis: "derived",
    },
    {
      label: "Actions terrain",
      value: rows.actions.length,
      detail: "Inclut les actions validées et les actions en attente déposées par le projet.",
      basis: "all_time",
    },
    {
      label: "Images stockées",
      value: allTrainingPhotos,
      detail: "Comptées depuis training_examples via les photos réellement attachées aux actions.",
      basis: "all_time",
    },
    {
      label: "Exports PDF",
      value: rows.reports.filter((row) => row.file_kind === "pdf").length,
      detail: "Mesure issue de la table reports pour les livrables PDF produits par le site.",
      basis: "all_time",
    },
    {
      label: "Emails Resend",
      value: recentEmailCount,
      detail: "Journalisation persistée des envois du service email centralisé.",
      basis: "recent",
    },
    {
      label: "Événements communauté",
      value: communityEventCount,
      detail: "Tables community_events utilisées comme signal social propre au projet.",
      basis: "all_time",
    },
    {
      label: "RSVP communauté",
      value: rsvpCount,
      detail: "Réponses enregistrées dans event_rsvps avec mise à jour horodatée.",
      basis: "all_time",
    },
    {
      label: "Notifications app",
      value: notificationCount,
      detail: "Messages persistés dans app_notifications pour les flux communautaires et système.",
      basis: "all_time",
    },
    {
      label: "Notifications non lues",
      value: unreadNotificationCount,
      detail: "Sous-ensemble des notifications encore actives dans la boîte de réception.",
      basis: "recent",
    },
    {
      label: "Appels IA",
      value: rows.trainingExamples.filter((row) => countTrainingPhotos(row.photos) > 0).length,
      detail: "Proxy CleanMyMap basé sur les analyses vision/training réellement branchées.",
      basis: "all_time",
    },
    {
      label: "Utilisateurs actifs",
      value: countDistinct([
        ...rows.funnelEvents.map((row) => row.user_id),
        ...rows.progressionEvents.map((row) => row.user_id),
        ...rows.actions.map((row) => row.created_by_clerk_id),
        ...rows.spots.map((row) => row.created_by_clerk_id),
        ...rows.reports.map((row) => row.owner_clerk_id),
        ...rows.serviceEmails.map((row) => row.actor_user_id),
        ...rows.trainingExamples.map((row) => actionById.get(row.action_id) ?? null),
      ]),
      detail: "Agrégation des identités présentes dans les tables opérationnelles du projet.",
      basis: "recent",
    },
  ];
}

function buildProjectSignalBreakdown(rows: ProjectSignalRows) {
  const detailedPageViews = rows.funnelEvents.filter((row) => row.step === "page_view").length;
  const legacyPageViews = rows.funnelEvents.filter((row) => row.step === "view_new").length;
  const communityEventCount = rows.communityEvents.length;
  const rsvpCount = rows.eventRsvps.length;
  const notificationCount = rows.appNotifications.length;
  const unreadNotificationCount = countProjectUnreadNotifications(rows.appNotifications);
  const sentEmailsCount = rows.serviceEmails.reduce((acc, row) => {
    if (row.status !== "sent") {
      return acc;
    }

    return acc + Math.max(0, Number(row.recipient_count ?? 0));
  }, 0);
  const pdfExportsCount = rows.reports.filter((row) => row.file_kind === "pdf").length;

  return {
    traffic: {
      pageViewEvents: detailedPageViews,
      legacyPageViewEvents: legacyPageViews,
      distinctRoutes: countProjectPageViewRoutes(rows.funnelEvents),
      topRoutes: buildTopPageViewRoutes(rows.funnelEvents),
    },
    community: {
      events: communityEventCount,
      rsvps: rsvpCount,
      notifications: notificationCount,
      unreadNotifications: unreadNotificationCount,
    },
    communication: {
      emailsSent: sentEmailsCount,
      pdfExports: pdfExportsCount,
    },
  };
}

function buildInfrastructureUsageInput(params: {
  recentRows: ProjectSignalRows;
  previousRows: ProjectSignalRows;
}): EnvironmentalImpactInfrastructureInput["usage"] {
  const recentCommunitySignals =
    params.recentRows.communityEvents.length +
    params.recentRows.eventRsvps.length +
    params.recentRows.appNotifications.length;
  const previousCommunitySignals =
    params.previousRows.communityEvents.length +
    params.previousRows.eventRsvps.length +
    params.previousRows.appNotifications.length;
  const current = buildScopeInputFromRows(params.recentRows, {
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
  const previous = buildScopeInputFromRows(params.previousRows, {
    userId: null,
    fromMs: Number.NEGATIVE_INFINITY,
    untilMs: Number.POSITIVE_INFINITY,
  }) as EnvironmentalImpactScopeInput & { monthlyPageViews: number; monthlyApiRequests: number; };

  const growthRateMonthly = clamp(
    ((current.monthlyPageViews - previous.monthlyPageViews) /
      Math.max(1, Math.max(previous.monthlyPageViews, current.monthlyPageViews))) || 0,
    -0.35,
    0.35,
  );
  const seasonalityAmplitude = clamp(
    Math.abs(current.monthlyPageViews - previous.monthlyPageViews) /
      Math.max(1, current.monthlyPageViews + previous.monthlyPageViews),
    0.04,
    0.25,
  );

  return {
    monthlyPageViews: Math.max(1, current.monthlyPageViews),
    monthlyActiveUsers: Math.max(1, current.monthlyActiveUsers),
    monthlySessions: Math.max(1, current.monthlySessions),
    monthlyEmailsSent: Math.max(0, current.monthlyEmailsSent),
    monthlyPdfExports: Math.max(0, current.monthlyPdfExports),
    monthlyMapViews: Math.max(0, current.monthlyMapViews),
    monthlyAiCalls: Math.max(0, current.monthlyAiCalls),
    monthlyCodexSessions: 0,
    monthlyCodexConversationTurns: 0,
    monthlyCodexToolActions: 0,
    monthlyCodexShellCommands: 0,
    monthlyCodexFilesTouched: 0,
    monthlyCodexTestsRun: 0,
    monthlyCodexChangedLines: 0,
    monthlyCodexActiveMinutes: 0,
    monthlyStorageGbMonths: Math.max(0.1, current.monthlyStorageGbMonths),
    monthlyApiRequests: Math.max(1, current.monthlyApiRequests),
    monthlyAuthEvents: Math.max(1, current.monthlyAuthEvents + recentCommunitySignals * 0.05),
    monthlyRealtimeEvents: Math.max(1, current.monthlyActiveUsers * 8 + recentCommunitySignals * 1.5),
    monthlyEgressGb: round6(
      Math.max(
        0.1,
        current.monthlyPageViews * 0.00008 +
          current.monthlyMapViews * 0.0012 +
          current.monthlyStorageGbMonths * 0.12 +
          recentCommunitySignals * 0.00002,
      ),
    ),
    monthlyBandwidthGb: round6(
      Math.max(
        0.1,
        current.monthlyPageViews * 0.00011 +
          current.monthlyMapViews * 0.001 +
          current.monthlyPdfExports * 0.002 +
          recentCommunitySignals * 0.00001,
      ),
    ),
    monthlyErrorEvents:
      current.monthlyApiRequests > 0
        ? Math.max(0, Math.round((current.monthlyApiRequests + recentCommunitySignals) * 0.0025))
        : null,
    growthRateMonthly,
    seasonalityAmplitude: clamp(
      seasonalityAmplitude +
        Math.min(0.08, Math.abs(recentCommunitySignals - previousCommunitySignals) / Math.max(1, recentCommunitySignals + previousCommunitySignals + 1)),
      0.04,
      0.3,
    ),
    horizonMonths: 12,
  };
}

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

function findEarliestDate(rows: ProjectSignalRows): string | null {
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
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.min(...timestamps)).toISOString();
}

function findAccountCreatedAt(rows: ProjectSignalRows, userId: string): string | null {
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
  },
  codexSnapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[] = [],
  githubRepositoryStats: GitHubRepositoryStats | null = null,
): EnvironmentalImpactProjectSignals {
  const generatedAtDate = parseDateOrNull(params.generatedAt) ?? new Date(params.generatedAt);
  const launchedAt = findEarliestDate(rows);
  const accountCreatedAt = params.userId ? findAccountCreatedAt(rows, params.userId) : null;
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
      ...buildProjectSignalsHighlights(rows, {
        generatedAt: generatedAtDate.toISOString(),
        accountCreatedAt,
        userId: params.userId,
      }),
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
    profiles,
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
    limitProjectSignalRows<ProfileRow>(supabase.from("profiles").select("id, created_at"), [
      ["created_at", false],
      ["id", false],
    ]),
    limitProjectSignalRows<ActionRow>(
      supabase.from("actions").select("id, created_at, created_by_clerk_id, latitude, longitude, status"),
      [
        ["created_at", false],
        ["id", false],
      ],
    ),
    limitProjectSignalRows<SpotRow>(
      supabase.from("spots").select("created_at, created_by_clerk_id, latitude, longitude, status"),
      [
        ["created_at", false],
        ["created_by_clerk_id", false],
        ["latitude", false],
        ["longitude", false],
        ["status", false],
      ],
    ),
    limitProjectSignalRows<FunnelRow>(
      supabase.from("funnel_events").select("at, user_id, session_id, step, mode, meta"),
      [
        ["at", false],
        ["session_id", false],
        ["step", false],
        ["mode", false],
        ["user_id", false],
      ],
    ),
    limitProjectSignalRows<ProgressionRow>(
      supabase.from("progression_events").select("created_at, user_id, event_type, status_phase"),
      [
        ["created_at", false],
        ["user_id", false],
        ["event_type", false],
        ["status_phase", false],
      ],
    ),
    limitProjectSignalRows<ReportRow>(
      supabase.from("reports").select("created_at, owner_clerk_id, file_kind"),
      [
        ["created_at", false],
        ["owner_clerk_id", false],
        ["file_kind", false],
      ],
    ),
    limitProjectSignalRows<TrainingRow>(
      supabase.from("training_examples").select("action_id, created_at, photos, status"),
      [
        ["created_at", false],
        ["action_id", false],
        ["status", false],
      ],
    ),
    limitProjectSignalRows<ServiceEmailRow>(
      supabase.from("service_email_events").select("created_at, actor_user_id, recipient_count, status"),
      [
        ["created_at", false],
        ["actor_user_id", false],
        ["recipient_count", false],
        ["status", false],
      ],
    ),
    limitProjectSignalRows<CommunityEventRow>(
      supabase.from("community_events").select("id, created_at, organizer_clerk_id, title, event_date, location_label, description"),
      [
        ["created_at", false],
        ["id", false],
        ["organizer_clerk_id", false],
        ["event_date", false],
        ["title", false],
      ],
    ),
    limitProjectSignalRows<EventRsvpRow>(
      supabase.from("event_rsvps").select("event_id, participant_clerk_id, status, updated_at"),
      [
        ["updated_at", false],
        ["event_id", false],
        ["participant_clerk_id", false],
        ["status", false],
      ],
    ),
    limitProjectSignalRows<AppNotificationRow>(
      supabase.from("app_notifications").select("id, user_id, type, title, content, read_at, created_at"),
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
    profiles.error,
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
      profiles: (profiles.data ?? []) as ProfileRow[],
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
    { generatedAt, userId: params.userId },
    codexSnapshots,
    params.githubRepositoryStats ?? null,
  );
}
