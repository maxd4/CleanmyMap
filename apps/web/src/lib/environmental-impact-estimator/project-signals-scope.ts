import type {
  EnvironmentalImpactScopeInput,
} from "./types";
import {
  countProjectPageViews,
  countTrainingPhotos,
  isWithinWindow,
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
  type FunnelSignalAggregate,
  type FunnelSignalSummary,
  type ProfileRow,
  type ProgressionRow,
  type ProjectSignalRows,
  type ReportRow,
  type ServiceEmailRow,
  type SpotRow,
  type TrainingRow,
} from "./project-signals.calculations";

export type ProjectSignalRowsInput = {
  profiles: ProfileRow[];
  actions: ActionRow[];
  spots: SpotRow[];
  funnelEvents: FunnelRow[];
  funnelSignalSummary?: FunnelSignalSummary;
  progressionEvents: ProgressionRow[];
  reports: ReportRow[];
  trainingExamples: TrainingRow[];
  serviceEmails: ServiceEmailRow[];
  communityEvents: CommunityEventRow[];
  eventRsvps: EventRsvpRow[];
  appNotifications: AppNotificationRow[];
};

export function buildProjectSignalRows(
  params: ProjectSignalRowsInput,
  windowFromMs?: number,
  windowUntilMs?: number,
): ProjectSignalRows {
  const filterByTimestamp = <T>(rows: T[], toTimestamp: (row: T) => string | null | undefined) =>
    rows.filter((row) =>
      windowFromMs === undefined || windowUntilMs === undefined
        ? true
        : isWithinWindow(toTimestamp(row), windowFromMs, windowUntilMs),
    );
  const filterByWindow = <T extends BaseTimelineRow>(rows: T[]) =>
    filterByTimestamp(rows, (row) => row.created_at);

  const funnelAggregate = selectFunnelAggregate(
    params.funnelSignalSummary,
    windowFromMs,
    windowUntilMs,
  );

  return {
    profiles: filterByWindow(params.profiles as BaseTimelineRow[]) as ProfileRow[],
    actions: filterByWindow(params.actions),
    spots: filterByWindow(params.spots),
    funnelEvents: filterByTimestamp(params.funnelEvents, (row) => row.at),
    funnelAggregate,
    funnelSignalSummary: params.funnelSignalSummary,
    progressionEvents: filterByWindow(params.progressionEvents),
    reports: filterByWindow(params.reports),
    trainingExamples: filterByWindow(params.trainingExamples),
    serviceEmails: filterByWindow(params.serviceEmails),
    communityEvents: filterByWindow(params.communityEvents),
    eventRsvps: filterByTimestamp(params.eventRsvps, (row) => row.updated_at),
    appNotifications: filterByWindow(params.appNotifications),
  };
}

function selectFunnelAggregate(
  summary: FunnelSignalSummary | undefined,
  windowFromMs: number | undefined,
  windowUntilMs: number | undefined,
): FunnelSignalAggregate | undefined {
  if (!summary) {
    return undefined;
  }
  if (windowFromMs === undefined || windowUntilMs === undefined) {
    return summary.allTime;
  }
  const windowToleranceMs = 5 * 60 * 1000;
  const isCloseTo = (left: number, right: number) =>
    Math.abs(left - right) <= windowToleranceMs;
  if (
    isCloseTo(windowFromMs, summary.currentWindowFromMs) &&
    isCloseTo(windowUntilMs, summary.currentWindowUntilMs)
  ) {
    return summary.current;
  }
  if (
    isCloseTo(windowFromMs, summary.previousWindowFromMs) &&
    isCloseTo(windowUntilMs, summary.previousWindowUntilMs)
  ) {
    return summary.previous;
  }
  return undefined;
}

function selectAllTimeFunnelAggregate(
  rows: ProjectSignalRows,
  userId: string | null,
): FunnelSignalAggregate | undefined {
  if (!userId) {
    return rows.funnelAggregate ?? rows.funnelSignalSummary?.allTime;
  }
  if (rows.funnelSignalSummary?.userId !== userId) {
    return undefined;
  }
  return rows.funnelSignalSummary.user ?? undefined;
}

function countAggregatePageViews(aggregate: FunnelSignalAggregate): number {
  return aggregate.detailedPageViewCount > 0
    ? aggregate.detailedPageViewCount
    : aggregate.legacyPageViewCount;
}

function selectByUser<T>(userId: string | null, scoped: T[], all: T[]): T[] {
  return userId ? scoped : all;
}

function scopeRows<T>(
  userId: string | null,
  rows: T[],
  matches: (row: T, userId: string) => boolean,
): T[] {
  if (!userId) {
    return [];
  }
  return rows.filter((row) => matches(row, userId));
}

export function findEarliestDate(
  rows: ProjectSignalRows,
  oldestProfileCreatedAt: string | null,
): string | null {
  const timestamps = [
    ...rows.actions.map((row) => toMs(row.created_at)),
    ...rows.spots.map((row) => toMs(row.created_at)),
    ...((rows.funnelAggregate?.earliestAt ?? rows.funnelSignalSummary?.allTime.earliestAt)
      ? [toMs(rows.funnelAggregate?.earliestAt ?? rows.funnelSignalSummary?.allTime.earliestAt)]
      : rows.funnelEvents.map((row) => toMs(row.at))),
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

export function findAccountCreatedAt(
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
    ...(rows.funnelSignalSummary?.userId === userId && rows.funnelSignalSummary.user?.earliestAt
      ? [rows.funnelSignalSummary.user.earliestAt]
      : rows.funnelEvents.filter((row) => row.user_id === userId).map((row) => row.at)),
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

export function calculateAllTimeScopeInput(
  rows: ProjectSignalRows,
  params: {
    userId: string | null;
    accountCreatedAt: string | null;
  },
): EnvironmentalImpactScopeInput {
  const userId = params.userId;
  const actionById = new Map(rows.actions.map((row) => [row.id, row.created_by_clerk_id]));

  const scopedActions = scopeRows(userId, rows.actions, (row, id) => row.created_by_clerk_id === id);
  const scopedSpots = scopeRows(userId, rows.spots, (row, id) => row.created_by_clerk_id === id);
  const scopedFunnel = scopeRows(userId, rows.funnelEvents, (row, id) => row.user_id === id);
  const selectedFunnelAggregate = selectAllTimeFunnelAggregate(rows, userId);
  const scopedProgression = scopeRows(userId, rows.progressionEvents, (row, id) => row.user_id === id);
  const scopedReports = scopeRows(userId, rows.reports, (row, id) => row.owner_clerk_id === id);
  const scopedEmails = scopeRows(userId, rows.serviceEmails, (row, id) => row.actor_user_id === id);
  const scopedTraining = scopeRows(
    userId,
    rows.trainingExamples,
    (row, id) => actionById.get(row.action_id) === id,
  );
  const scopedCommunityEvents = scopeRows(
    userId,
    rows.communityEvents,
    (row, id) => row.organizer_clerk_id === id,
  );
  const scopedEventRsvps = scopeRows(userId, rows.eventRsvps, (row, id) => row.participant_clerk_id === id);
  const scopedNotifications = scopeRows(userId, rows.appNotifications, (row, id) => row.user_id === id);
  const selectedActions = selectByUser(userId, scopedActions, rows.actions);
  const selectedSpots = selectByUser(userId, scopedSpots, rows.spots);
  const selectedFunnel = selectByUser(userId, scopedFunnel, rows.funnelEvents);
  const selectedProgression = selectByUser(userId, scopedProgression, rows.progressionEvents);
  const selectedReports = selectByUser(userId, scopedReports, rows.reports);
  const selectedEmails = selectByUser(userId, scopedEmails, rows.serviceEmails);
  const selectedTraining = selectByUser(userId, scopedTraining, rows.trainingExamples);
  const selectedCommunityEvents = selectByUser(userId, scopedCommunityEvents, rows.communityEvents);
  const selectedEventRsvps = selectByUser(userId, scopedEventRsvps, rows.eventRsvps);
  const selectedNotifications = selectByUser(userId, scopedNotifications, rows.appNotifications);
  const hasAnySignal =
    selectedActions.length +
      selectedSpots.length +
      (selectedFunnelAggregate?.eventCount ?? selectedFunnel.length) +
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

  const pageViews = selectedFunnelAggregate
    ? countAggregatePageViews(selectedFunnelAggregate)
    : countProjectPageViews(selectedFunnel);
  const storedImages = selectedTraining.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const apiRequests = userId
    ? scopedActions.length +
      scopedSpots.length +
       (selectedFunnelAggregate?.eventCount ?? scopedFunnel.length) +
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
