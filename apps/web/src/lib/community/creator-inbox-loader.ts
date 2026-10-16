import { getRoleBadge, getProfileBadge } from "@/lib/authz";
import { listPromotionRequests } from "@/lib/admin/promotion-requests-store";
import { listCommunityBugReports } from "@/lib/community/bug-reports-store";
import {
  buildEventInboxItem,
  buildFeedbackInboxItem,
  buildLegalContentReportInboxItem,
  buildPartnerInboxItem,
  buildPromotionInboxItem,
  type CreatorInboxItem,
} from "@/lib/community/creator-inbox";
import { listPartnerOnboardingRequests } from "@/lib/partners/onboarding-requests-store";
import { listLegalContentReports } from "@/lib/legal-content-report/legal-content-report-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getClerkService } from "@/lib/services/clerk";
import {
  isCreatorInboxRecordCursor,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";

const CREATOR_INBOX_SOURCES = [
  "feedback",
  "promotion",
  "partner",
  "legal_content_report",
  "event",
] as const;

type CreatorInboxPageSource = (typeof CREATOR_INBOX_SOURCES)[number];

type CreatorInboxPageCursor = Record<
  CreatorInboxPageSource,
  CreatorInboxRecordCursor | null
>;

export type CreatorInboxPage = {
  items: CreatorInboxItem[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
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
      if (rawCursor !== null && !isCreatorInboxRecordCursor(rawCursor)) {
        return null;
      }
      cursor[source] = rawCursor as CreatorInboxRecordCursor | null;
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
  const leftTime = Date.parse(left.item.createdAt);
  const rightTime = Date.parse(right.item.createdAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  if (left.item.createdAt !== right.item.createdAt) {
    return right.item.createdAt.localeCompare(left.item.createdAt);
  }
  const sourceOrder =
    CREATOR_INBOX_SOURCES.indexOf(left.source) - CREATOR_INBOX_SOURCES.indexOf(right.source);
  if (sourceOrder !== 0) {
    return sourceOrder;
  }
  return right.item.sourceRecordId.localeCompare(left.item.sourceRecordId);
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
}): Promise<CreatorInboxPage> {
  const limit = clampPageSize(params?.limit);
  const cursor = params?.cursor ?? emptyPageCursor();
  const sourceLimit = limit + 1;
  const [feedback, promotion, partner, legalContentReports, events] = await Promise.all([
    listCommunityBugReports(sourceLimit, cursor.feedback),
    listPromotionRequests(sourceLimit, cursor.promotion),
    listPartnerOnboardingRequests(sourceLimit, cursor.partner),
    listLegalContentReports(sourceLimit, cursor.legal_content_report),
    loadCreatorInboxEvents(sourceLimit, cursor.event),
  ]);

  const candidates: InboxCandidate[] = [
    ...feedback.map((item) => ({
      item: buildFeedbackInboxItem(item),
      source: "feedback" as const,
    })),
    ...promotion.map((item) => ({
      item: buildPromotionInboxItem(item),
      source: "promotion" as const,
    })),
    ...partner.map((item) => ({
      item: buildPartnerInboxItem(item),
      source: "partner" as const,
    })),
    ...legalContentReports.map((item) => ({
      item: buildLegalContentReportInboxItem(item),
      source: "legal_content_report" as const,
    })),
    ...events.map((item) => ({ item, source: "event" as const })),
  ].sort(compareInboxCandidates);

  const items = candidates.slice(0, limit).map(({ item }) => item);
  const hasMore = candidates.length > limit;
  if (!hasMore) {
    return { items, count: items.length, hasMore: false, nextCursor: null };
  }

  const nextCursor = { ...cursor };
  for (const candidate of candidates.slice(0, limit)) {
    nextCursor[candidate.source] = {
      createdAt: candidate.item.createdAt,
      id: candidate.item.sourceRecordId,
    };
  }

  return {
    items,
    count: items.length,
    hasMore: true,
    nextCursor: encodePageCursor(nextCursor),
  };
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

  const clerk = await getClerkService();
  const organizerIds = Array.from(
    new Set(
      eventsResult.data
        .map((event) => event.organizer_clerk_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const organizerMap = await clerk.resolveUsers(organizerIds);

  return eventsResult.data.map((event) => {
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
