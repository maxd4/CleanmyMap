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

export function findEarliestDate(
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

export function calculateAllTimeScopeInput(
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
