import { getRoleBadge, getProfileBadge } from "@/lib/authz";
import { listPromotionRequests } from "@/lib/admin/promotion-requests-store";
import { listCommunityBugReports, loadCommunityBugReportFollowUpMetrics, type CommunityBugReportFollowUpMetrics } from "@/lib/community/bug-reports-store";
import {
  buildEventInboxItem,
  buildAssociationActionReviewInboxItem,
  buildFeedbackInboxItem,
  buildLegalContentReportInboxItem,
  buildPartnerInboxItem,
  buildPromotionInboxItem,
  type CreatorInboxItem,
  type AssociationActionReviewInboxRecord,
} from "@/lib/community/creator-inbox";
import { listPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { listLegalContentReports } from "@/lib/legal-content-report/legal-content-report-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getClerkService } from "@/lib/services/clerk";
import type { CommunityEventRow } from "@/types/database";
import {
  compareCreatorInboxRecordCursors,
  createCreatorInboxContinuationCursor,
  isCreatorInboxHistoricalRecordCursor,
  isCreatorInboxRecordCursor,
  type CreatorInboxPaginationCursor,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";
import type { CommunityBugReportQueueCursor } from "./bug-reports-store-contract";

const CREATOR_INBOX_SOURCES = [
  "feedback",
  "promotion",
  "partner",
  "legal_content_report",
  "event",
  "association_action",
] as const;

type CreatorInboxPageSource = (typeof CREATOR_INBOX_SOURCES)[number];

type CreatorInboxPageCursor = {
  feedback: CreatorInboxPaginationCursor | CommunityBugReportQueueCursor | null;
  promotion: CreatorInboxRecordCursor | null;
  partner: CreatorInboxRecordCursor | null;
  legal_content_report: CreatorInboxRecordCursor | null;
  event: CreatorInboxRecordCursor | null;
  association_action: CreatorInboxRecordCursor | null;
};

export type CreatorInboxPage = {
  items: CreatorInboxItem[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
  feedbackMetrics?: CommunityBugReportFollowUpMetrics;
};

const CREATOR_INBOX_DEFAULT_PAGE_SIZE = 50;
const CREATOR_INBOX_MAX_PAGE_SIZE = 100;

function emptyPageCursor(): CreatorInboxPageCursor {
  return {
    feedback: null,
    promotion: null,
    partner: null,
    legal_content_report: null,
    event: null,
    association_action: null,
  };
}

function encodePageCursor(cursor: CreatorInboxPageCursor): string {
  return Buffer.from(JSON.stringify({ version: 1, sources: cursor }), "utf8").toString(
    "base64url",
  );
}

export function parseCreatorInboxPageCursor(
  value: string | null | undefined,
): CreatorInboxPageCursor | null {
  if (!value || value.length > 8192) {
    return value ? null : emptyPageCursor();
  }
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      version?: unknown;
      sources?: unknown;
    };
    if (decoded.version !== 1 || !decoded.sources || typeof decoded.sources !== "object") {
      return null;
    }
    const rawSources = decoded.sources as Record<string, unknown>;
    const cursor = emptyPageCursor();
    for (const source of CREATOR_INBOX_SOURCES) {
      const rawCursor = rawSources[source];
      const isValidSourceCursor =
        isCreatorInboxRecordCursor(rawCursor) ||
        (source === "feedback" && isCreatorInboxHistoricalRecordCursor(rawCursor));
      if (rawCursor === undefined || rawCursor === null) {
        cursor[source] = null;
        continue;
      }
      if (!isValidSourceCursor) {
        return null;
      }
      cursor[source] = rawCursor as CreatorInboxPageCursor[typeof source];
    }
    return cursor;
  } catch {
    return null;
  }
}

type InboxCandidate = {
  item: CreatorInboxItem;
  source: CreatorInboxPageSource;
};

function compareInboxCandidates(left: InboxCandidate, right: InboxCandidate): number {
  const leftCursor = {
    createdAt: left.item.createdAt,
    id: left.item.sourceRecordId,
  };
  const rightCursor = {
    createdAt: right.item.createdAt,
    id: right.item.sourceRecordId,
  };
  const leftTime = Date.parse(left.item.createdAt);
  const rightTime = Date.parse(right.item.createdAt);
  const sameDateOrderKey =
    Number.isFinite(leftTime) && Number.isFinite(rightTime)
      ? leftTime === rightTime
      : !Number.isFinite(leftTime) &&
          !Number.isFinite(rightTime) &&
          left.item.createdAt === right.item.createdAt;
  const sourceCursorOrder = compareCreatorInboxRecordCursors(leftCursor, rightCursor);
  if (!sameDateOrderKey) return -sourceCursorOrder;
  const sourceOrder =
    CREATOR_INBOX_SOURCES.indexOf(left.source) - CREATOR_INBOX_SOURCES.indexOf(right.source);
  if (sourceOrder !== 0) {
    return sourceOrder;
  }
  return -sourceCursorOrder;
}

function compareFeedbackQueueCandidates(left: InboxCandidate, right: InboxCandidate): number {
  const priorityRank = { critical: 0, high: 1, normal: 2 } as const;
  return priorityRank[left.item.priority] - priorityRank[right.item.priority] ||
    compareCreatorInboxRecordCursors(
      { createdAt: left.item.createdAt, id: left.item.sourceRecordId },
      { createdAt: right.item.createdAt, id: right.item.sourceRecordId },
    );
}

function clampPageSize(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return CREATOR_INBOX_DEFAULT_PAGE_SIZE;
  }
  return Math.min(CREATOR_INBOX_MAX_PAGE_SIZE, Math.max(1, Math.trunc(value as number)));
}

export async function loadCreatorInboxPage(params?: {
  limit?: number | null;
  cursor?: CreatorInboxPageCursor | null;
  source?: "feedback" | "association_action";
}): Promise<CreatorInboxPage> {
  const limit = clampPageSize(params?.limit);
  const cursor = params?.cursor ?? emptyPageCursor();
  const sourceLimit = limit + 1;
  const feedbackOnly = params?.source === "feedback";
  const associationOnly = params?.source === "association_action";
  const sources = await loadCreatorInboxSources(sourceLimit, cursor, feedbackOnly, associationOnly);
  const { feedback, promotion, partner, legalContentReports, events, associationActions, feedbackMetrics } = sources;

  const candidates: InboxCandidate[] = [
    ...feedback.map((item) => ({ item: buildFeedbackInboxItem(item), source: "feedback" as const })),
    ...promotion.map((item) => ({ item: buildPromotionInboxItem(item), source: "promotion" as const })),
    ...partner.map((item) => ({ item: buildPartnerInboxItem(item), source: "partner" as const })),
    ...legalContentReports.map((item) => ({ item: buildLegalContentReportInboxItem(item), source: "legal_content_report" as const })),
    ...events.map((item) => ({ item, source: "event" as const })),
    ...associationActions.map((item) => ({ item, source: "association_action" as const })),
  ].sort(feedbackOnly ? compareFeedbackQueueCandidates : compareInboxCandidates);

  const items = candidates.slice(0, limit).map(({ item }) => item);
  const hasMore = candidates.length > limit;
  if (!hasMore) {
    return { items, count: items.length, hasMore: false, nextCursor: null, feedbackMetrics };
  }
  return {
    items,
    count: items.length,
    hasMore: true,
    nextCursor: buildCreatorInboxNextCursor(candidates, limit, cursor, feedbackOnly),
    feedbackMetrics,
  };
}

async function loadCreatorInboxSources(
  sourceLimit: number,
  cursor: CreatorInboxPageCursor,
  feedbackOnly: boolean,
  associationOnly: boolean,
) {
  const [feedback, promotion, partner, legalContentReports, events, associationActions, feedbackMetrics] = await Promise.all([
    feedbackOnly
      ? listCommunityBugReports(sourceLimit, cursor.feedback, { activeOnly: true, order: "priority" })
      : associationOnly ? Promise.resolve([]) : listCommunityBugReports(sourceLimit, cursor.feedback),
    feedbackOnly || associationOnly ? Promise.resolve([]) : listPromotionRequests(sourceLimit, cursor.promotion),
    feedbackOnly || associationOnly ? Promise.resolve([]) : listPartnerOnboardingRequests(sourceLimit, cursor.partner),
    feedbackOnly || associationOnly ? Promise.resolve([]) : listLegalContentReports(sourceLimit, cursor.legal_content_report),
    feedbackOnly || associationOnly ? Promise.resolve([]) : loadCreatorInboxEvents(sourceLimit, cursor.event),
    feedbackOnly
      ? Promise.resolve([])
      : loadAssociationActionReviewInbox(sourceLimit, cursor.association_action, { required: associationOnly }),
    loadCommunityBugReportFollowUpMetrics(),
  ]);
  return { feedback, promotion, partner, legalContentReports, events, associationActions, feedbackMetrics };
}

function buildCreatorInboxNextCursor(
  candidates: InboxCandidate[],
  limit: number,
  cursor: CreatorInboxPageCursor,
  feedbackOnly: boolean,
): string {
  const nextCursor = { ...cursor };
  for (const candidate of candidates.slice(0, limit)) {
    const candidateCursor =
      candidate.source === "feedback" && feedbackOnly
        ? {
            version: 1 as const,
            priority: candidate.item.priority,
            createdAt: candidate.item.createdAt,
            id: candidate.item.sourceRecordId,
          }
        : candidate.source === "feedback"
        ? createCreatorInboxContinuationCursor({
            createdAt: candidate.item.createdAt,
            id: candidate.item.sourceRecordId,
          })
        : {
            createdAt: candidate.item.createdAt,
            id: candidate.item.sourceRecordId,
          };
    nextCursor[candidate.source] = {
      ...candidateCursor,
    };
  }
  return encodePageCursor(nextCursor);
}

export async function loadCreatorInboxItems(): Promise<CreatorInboxItem[]> {
  const page = await loadCreatorInboxPage();
  return page.items;
}

async function loadCreatorInboxEvents(
  limit: number,
  beforeCursor?: CreatorInboxRecordCursor | null,
): Promise<CreatorInboxItem[]> {
  const supabase = getSupabaseServerClient(true);
  let query = supabase
    .from("community_events")
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (beforeCursor) {
    query = query.or(
      `created_at.lt.${beforeCursor.createdAt},and(created_at.eq.${beforeCursor.createdAt},id.lt.${beforeCursor.id})`,
    );
  }
  const eventsResult = await query.limit(limit);

  if (eventsResult.error) {
    throw new Error("Creator inbox events read failed");
  }
  if (!eventsResult.data || eventsResult.data.length === 0) {
    return [];
  }
  const eventRows = eventsResult.data as unknown as CommunityEventRow[];

  const clerk = await getClerkService();
  const organizerIds = Array.from(
    new Set(
      eventRows
        .map((event) => event.organizer_clerk_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const organizerMap = await clerk.resolveUsers(organizerIds);

  return eventRows.map((event) => {
    const organizer =
      organizerMap.get(event.organizer_clerk_id) ?? {
        userId: null,
        displayName: "Membre",
        roleBadge: getRoleBadge("benevole"),
        profileBadge: getProfileBadge("benevole"),
      };
    return buildEventInboxItem(
      {
        id: event.id,
        created_at: event.created_at,
        organizer_clerk_id: event.organizer_clerk_id,
        title: event.title,
        event_date: event.event_date,
        location_label: event.location_label,
        latitude: event.latitude,
        longitude: event.longitude,
        location_source: event.location_source,
        description: event.description,
      },
      organizer,
    );
  });
}

async function loadAssociationActionReviewInbox(
  limit: number,
  beforeCursor?: CreatorInboxRecordCursor | null,
  options?: { required?: boolean },
): Promise<CreatorInboxItem[]> {
  const supabase = getSupabaseServerClient(true);
  const selected = supabase
    .from("actions")
    .select("id, created_at, created_by_clerk_id, actor_name, organizer_type, organizer_name, action_date, event_start_time, event_end_time, location_label, notes, review_state, review_reason, preparation_data");
  if (typeof (selected as { eq?: unknown }).eq !== "function") {
    if (options?.required) {
      throw new Error("Creator inbox association action query is unavailable");
    }
    return [];
  }
  let query = selected
    .eq("action_phase", "pre_action")
    .in("organizer_type", ["association", "student_association"])
    .eq("review_state", "pending_review")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (beforeCursor) {
    query = query.or(
      `created_at.lt.${beforeCursor.createdAt},and(created_at.eq.${beforeCursor.createdAt},id.lt.${beforeCursor.id})`,
    );
  }
  const result = await query.limit(limit);
  if (result.error) throw new Error("Creator inbox association action read failed");
  const rows = (result.data ?? []) as unknown as AssociationActionReviewInboxRecord[];
  if (rows.length === 0) return [];
  const clerk = await getClerkService();
  const authorIds = Array.from(new Set(rows.map((row) => row.created_by_clerk_id).filter(Boolean)));
  const authorMap = await clerk.resolveUsers(authorIds);
  return rows.map((row) => buildAssociationActionReviewInboxItem(
    row,
    authorMap.get(row.created_by_clerk_id)?.displayName ?? row.actor_name ?? "Membre",
  ));
}
