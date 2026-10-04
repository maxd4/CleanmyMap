import type { EnvironmentalImpactScopeInput } from "./types";
import {
  countDistinct,
  countTrainingPhotos,
  isWithinWindow,
  sumTrainingPhotoBytes,
} from "./project-signals-helpers";
import { summarizeFunnelRows } from "./project-signals-funnel";
import type {
  FunnelRow,
  FunnelSignalAggregate,
  ProjectSignalRows,
} from "./project-signals.calculations";
import { round6 } from "./project-signals.calculations";

function selectScopeFunnelAggregate(
  rows: ProjectSignalRows,
  userId: string | null,
  funnelRows: FunnelRow[],
): FunnelSignalAggregate {
  if (userId) {
    if (rows.funnelSignalSummary?.userId === userId && rows.funnelSignalSummary.user) {
      return rows.funnelSignalSummary.user;
    }
    return summarizeFunnelRows(funnelRows);
  }
  return rows.funnelAggregate ?? rows.funnelSignalSummary?.allTime ?? summarizeFunnelRows(funnelRows);
}

type ScopeWindowRows = {
  funnelRows: FunnelRow[];
  progressionRows: ProjectSignalRows["progressionEvents"];
  actionRows: ProjectSignalRows["actions"];
  spotRows: ProjectSignalRows["spots"];
  reportRows: ProjectSignalRows["reports"];
  trainingRows: ProjectSignalRows["trainingExamples"];
  emailRows: ProjectSignalRows["serviceEmails"];
  communityEventRows: ProjectSignalRows["communityEvents"];
  eventRsvpRows: ProjectSignalRows["eventRsvps"];
  notificationRows: ProjectSignalRows["appNotifications"];
};

function filterScopeWindowRows(
  rows: ProjectSignalRows,
  fromMs: number,
  untilMs: number,
): ScopeWindowRows {
  return {
    funnelRows: rows.funnelEvents.filter((row) => isWithinWindow(row.at, fromMs, untilMs)),
    progressionRows: rows.progressionEvents.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    actionRows: rows.actions.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    spotRows: rows.spots.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    reportRows: rows.reports.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    trainingRows: rows.trainingExamples.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    emailRows: rows.serviceEmails.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    communityEventRows: rows.communityEvents.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
    eventRsvpRows: rows.eventRsvps.filter((row) => isWithinWindow(row.updated_at, fromMs, untilMs)),
    notificationRows: rows.appNotifications.filter((row) => isWithinWindow(row.created_at, fromMs, untilMs)),
  };
}

function buildScopeValueMetrics(
  windowRows: ScopeWindowRows,
  funnelAggregate: FunnelSignalAggregate,
) {
  const pageViews = funnelAggregate.detailedPageViewCount > 0
    ? funnelAggregate.detailedPageViewCount
    : funnelAggregate.legacyPageViewCount;
  const storedImages = windowRows.trainingRows.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const pdfExports = windowRows.reportRows.filter((row) => row.file_kind === "pdf").length;
  const maps = windowRows.actionRows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  ).length + windowRows.spotRows.filter((row) => row.latitude !== null && row.longitude !== null).length;
  const aiCalls = windowRows.trainingRows.filter((row) => countTrainingPhotos(row.photos) > 0).length;
  const emailCount = windowRows.emailRows.reduce((acc, row) => {
    if (row.status !== "sent") {
      return acc;
    }

    return acc + Math.max(0, Number(row.recipient_count ?? 0));
  }, 0);
  const photoBytes = windowRows.trainingRows.reduce(
    (acc, row) => acc + sumTrainingPhotoBytes(row.photos),
    0,
  );

  return { pageViews, storedImages, pdfExports, maps, aiCalls, emailCount, photoBytes };
}

function buildScopeActivityMetrics(
  windowRows: ScopeWindowRows,
  funnelAggregate: FunnelSignalAggregate,
  actionById: Map<string, string>,
  attributedTrainingRows: ProjectSignalRows["trainingExamples"],
) {
  const activeUserCount = countDistinct([
    ...funnelAggregate.userIds,
    ...windowRows.progressionRows.map((row) => row.user_id),
    ...windowRows.actionRows.map((row) => row.created_by_clerk_id),
    ...windowRows.spotRows.map((row) => row.created_by_clerk_id),
    ...windowRows.reportRows.map((row) => row.owner_clerk_id),
    ...windowRows.emailRows.map((row) => row.actor_user_id),
    ...attributedTrainingRows.map((row) => actionById.get(row.action_id) ?? null),
    ...windowRows.communityEventRows.map((row) => row.organizer_clerk_id),
    ...windowRows.eventRsvpRows.map((row) => row.participant_clerk_id),
    ...windowRows.notificationRows.map((row) => row.user_id),
  ]);
  const apiRequests =
    funnelAggregate.eventCount +
    windowRows.progressionRows.length +
    windowRows.actionRows.length +
    windowRows.spotRows.length +
    windowRows.reportRows.length +
    windowRows.trainingRows.length +
    windowRows.emailRows.length +
    windowRows.communityEventRows.length +
    windowRows.eventRsvpRows.length +
    windowRows.notificationRows.length;

  return {
    activeUserCount,
    apiRequests,
    sessionCount: funnelAggregate.sessionCount,
  };
}

function calculateStorageGbMonths(
  windowRows: ScopeWindowRows,
  values: ReturnType<typeof buildScopeValueMetrics>,
): number {
  return round6(
    Math.max(
      0.1,
      (values.storedImages * 0.0025) +
        (values.photoBytes / 1_000_000_000) * 0.75 +
        (values.pdfExports * 0.0005) +
        (windowRows.actionRows.length * 0.00001) +
        (windowRows.spotRows.length * 0.00001) +
        (windowRows.communityEventRows.length * 0.000008) +
        (windowRows.notificationRows.length * 0.000004),
    ),
  );
}

function assembleScopeInput(
  values: ReturnType<typeof buildScopeValueMetrics>,
  activity: ReturnType<typeof buildScopeActivityMetrics>,
  storageGbMonths: number,
  params: { accountCreatedAt?: string | null },
  fromMs: number,
  untilMs: number,
): EnvironmentalImpactScopeInput {
  return {
    pageViews: values.pageViews,
    storedImages: values.storedImages,
    apiRequests: activity.apiRequests,
    pdfExports: values.pdfExports,
    maps: values.maps,
    storageGbMonths,
    aiCalls: values.aiCalls,
    accountCreatedAt: params.accountCreatedAt ?? null,
    measuredAt: new Date(Math.max(fromMs, Number.isFinite(untilMs) ? untilMs : Date.now())).toISOString(),
    monthlyPageViews: values.pageViews,
    monthlyActiveUsers: Math.max(1, activity.activeUserCount),
    monthlySessions: Math.max(1, activity.sessionCount),
    monthlyEmailsSent: values.emailCount,
    monthlyPdfExports: values.pdfExports,
    monthlyMapViews: values.maps,
    monthlyAiCalls: values.aiCalls,
    monthlyStorageGbMonths: storageGbMonths,
    monthlyApiRequests: activity.apiRequests,
    monthlyAuthEvents: Math.max(1, activity.activeUserCount),
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
  const windowRows = filterScopeWindowRows(rows, fromMs, untilMs);
  const attributedTrainingRows = windowRows.trainingRows.filter((row) => {
    if (!userId) {
      return false;
    }
    return (actionById.get(row.action_id) ?? null) === userId;
  });
  const funnelAggregate = selectScopeFunnelAggregate(rows, userId, windowRows.funnelRows);
  const values = buildScopeValueMetrics(windowRows, funnelAggregate);
  const activity = buildScopeActivityMetrics(
    windowRows,
    funnelAggregate,
    actionById,
    attributedTrainingRows,
  );
  return assembleScopeInput(
    values,
    activity,
    calculateStorageGbMonths(windowRows, values),
    params,
    fromMs,
    untilMs,
  );
}
