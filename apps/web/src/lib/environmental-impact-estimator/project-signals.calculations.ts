import { PROJECT_SIGNAL_ROW_LIMIT } from "./project-signals.constants";
import { countProjectUnreadNotifications } from "./project-signals-helpers";
import {
  buildTopPageViewRouteCounts,
  summarizeFunnelRows,
  type FunnelRow,
  type FunnelSignalAggregate,
  type FunnelSignalSummary,
} from "./project-signals-funnel";

export type { FunnelRow, FunnelSignalAggregate, FunnelSignalSummary } from "./project-signals-funnel";
export {
  countProjectPageViews,
} from "./project-signals-funnel";
export {
  clamp,
  countTrainingPhotos,
  getFunnelEventCount,
  isWithinWindow,
  parseDateOrNull,
  round6,
  sumTrainingPhotoBytes,
  toMs,
  totalRowsForApiRequests,
} from "./project-signals-helpers";
export { buildProjectSignalsHighlights } from "./project-signals-highlights";
export { buildScopeInputFromRows } from "./project-signals-timeline";

export type BaseTimelineRow = {
  created_at: string;
};

export type ProjectSignalQueryBuilder = {
  order(column: string, options?: { ascending?: boolean }): ProjectSignalQueryBuilder;
  limit(limit: number): ProjectSignalQueryBuilder;
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
  id?: string;
  source?: "trash_spotter_spots";
  created_at: string;
  created_by_clerk_id: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};

export function normalizeCanonicalSpotRows(
  canonicalRows: SpotRow[],
): SpotRow[] {
  const seenIds = new Set<string>();
  const rows = canonicalRows.map((row) => ({
    ...row,
    source: "trash_spotter_spots" as const,
  })).filter((row) => {
    const id = row.id?.trim();
    if (!id) {
      return true;
    }
    if (seenIds.has(id)) {
      return false;
    }
    seenIds.add(id);
    return true;
  });

  return rows.sort((left, right) => {
    const createdAtOrder = right.created_at.localeCompare(left.created_at);
    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }
    return left.id?.localeCompare(right.id ?? "") ?? 0;
  });
}

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
  funnelAggregate?: FunnelSignalAggregate;
  funnelSignalSummary?: FunnelSignalSummary;
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

export function buildProjectSignalBreakdown(rows: ProjectSignalRows) {
  const funnelAggregate =
    rows.funnelAggregate ?? rows.funnelSignalSummary?.allTime ?? summarizeFunnelRows(rows.funnelEvents);
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
      pageViewEvents: funnelAggregate.detailedPageViewCount,
      legacyPageViewEvents: funnelAggregate.legacyPageViewCount,
      distinctRoutes: funnelAggregate.distinctRouteCount,
      topRoutes: buildTopPageViewRouteCounts(funnelAggregate.routeCounts),
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
