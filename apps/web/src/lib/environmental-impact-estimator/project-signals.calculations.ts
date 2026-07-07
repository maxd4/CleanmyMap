import { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
export { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactProjectSignal,
  EnvironmentalImpactScopeInput,
} from "./types";

export type BaseTimelineRow = {
  created_at: string;
};

export type ProjectSignalQueryBuilder = {
  order(column: string, options?: { ascending?: boolean }): ProjectSignalQueryBuilder;
  limit(limit: number): ProjectSignalQueryBuilder;
};

export type FunnelRow = {
  at: string;
  user_id: string | null;
  session_id: string;
  step: string;
  mode: string;
  meta?: Record<string, unknown> | null;
};

export type ProgressionRow = {
  created_at: string;
  user_id: string;
  event_type: string;
  status_phase: string;
};

export type ActionRow = {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

export type SpotRow = {
  created_at: string;
  created_by_clerk_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

export type ReportRow = {
  created_at: string;
  owner_clerk_id: string;
  file_kind: string;
};

export type TrainingRow = {
  action_id: string;
  created_at: string;
  photos: unknown;
  status: string;
};

export type ServiceEmailRow = {
  created_at: string;
  actor_user_id: string | null;
  recipient_count: number;
  status: string;
};

export type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

export type EventRsvpRow = {
  event_id: string;
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
  updated_at: string | null;
};

export type AppNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  created_at: string;
};

export type ProfileCreatedAtRow = {
  created_at: string;
};

export type ProjectSignalRows = {
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

export const PROJECT_SIGNAL_VOLUME_NOTE =
  `Volumes plafonnés à ${new Intl.NumberFormat("fr-FR").format(PROJECT_SIGNAL_ROW_LIMIT)} lignes par table; au-delà, la lecture reste indicative.`;

// Keep the cap inline in callers so the static quota audit can see each bounded query.
export async function orderProjectSignalRows<T>(
  query: ProjectSignalQueryBuilder,
  orderings: Array<[column: string, ascending?: boolean]>,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  let orderedQuery = query;

  for (const [column, ascending = false] of orderings) {
    orderedQuery = orderedQuery.order(column, { ascending });
  }

  return (await orderedQuery) as unknown as {
    data: T[] | null;
    error: { message: string } | null;
  };
}

export function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function toMs(value: string | null | undefined): number | null {
  const date = parseDateOrNull(value);
  return date ? date.getTime() : null;
}

export function isWithinWindow(
  value: string | null | undefined,
  fromMs: number,
  untilMs: number,
): boolean {
  const ms = toMs(value);
  return ms !== null && ms >= fromMs && ms <= untilMs;
}

export function countDistinct(values: Array<string | null | undefined>): number {
  return new Set(
    values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
  ).size;
}

export function getFunnelMetaString(row: FunnelRow, keys: string[]): string | null {
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

export function getFunnelPagePath(row: FunnelRow): string | null {
  return getFunnelMetaString(row, ["pagePath", "pathname", "routePath"]);
}

export function countProjectPageViews(rows: FunnelRow[]): number {
  const detailedPageViews = rows.filter((row) => row.step === "page_view").length;
  if (detailedPageViews > 0) {
    return detailedPageViews;
  }

  return rows.filter((row) => row.step === "view_new").length;
}

export function countProjectPageViewRoutes(rows: FunnelRow[]): number {
  return countDistinct(
    rows
      .filter((row) => row.step === "page_view" || row.step === "view_new" || row.step === "start_form")
      .map((row) => getFunnelPagePath(row)),
  );
}

export function countProjectUnreadNotifications(rows: AppNotificationRow[]): number {
  return rows.filter((row) => row.read_at === null).length;
}

export function buildTopPageViewRoutes(rows: FunnelRow[]): Array<{ path: string; count: number }> {
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

export function countTrainingPhotos(raw: unknown): number {
  if (!Array.isArray(raw)) {
    return 0;
  }

  return raw.length;
}

export function sumTrainingPhotoBytes(raw: unknown): number {
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

export function totalRowsForApiRequests(rows: ProjectSignalRows): number {
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

export function buildScopeInputFromRows(
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

export function buildProjectSignalsHighlights(
  rows: ProjectSignalRows,
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

export function buildProjectSignalBreakdown(rows: ProjectSignalRows) {
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

export function buildInfrastructureUsageInput(params: {
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

