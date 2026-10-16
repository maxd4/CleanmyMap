export const FEEDBACK_QUALIFICATION_STATUSES = [
  "pending",
  "needs_info",
  "accepted",
  "duplicate",
  "rejected",
] as const;

export type FeedbackQualificationStatus =
  (typeof FEEDBACK_QUALIFICATION_STATUSES)[number];

export type FeedbackQualificationDecision = Exclude<
  FeedbackQualificationStatus,
  "pending"
> | "pending";

export const FEEDBACK_TRACKING_STATUSES = [
  "not_planned",
  "under_study",
  "planned",
  "in_progress",
  "shipped",
] as const;

export type FeedbackTrackingStatus = (typeof FEEDBACK_TRACKING_STATUSES)[number];

export type FeedbackTracking = {
  status: FeedbackTrackingStatus;
  publicSummary: string | null;
  reference: string | null;
  shippedOn: string | null;
  shippedNotificationAt: string | null;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

export type BugReportInput = {
  reportType: "bug" | "idea" | "improvement" | "collaboration";
  title: string;
  description: string;
  pagePath: string | null;
  source?: "discussion_form" | "feedback_section" | "feedback_discussion";
  submittedByDisplayName?: string;
  submittedByEmail?: string | null;
  submittedByRole?: string | null;
};

export type BugReportRecord = BugReportInput & {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  submittedByDisplayName: string;
  submittedByEmail: string | null;
  submittedByRole: string | null;
  source: "discussion_form" | "feedback_section" | "feedback_discussion";
  status: "open" | "treated" | "archived";
  creatorState: "new" | "pending" | "responded" | "treated" | "archived";
  screenshotUploadState?: "pending" | "ready" | "failed" | null;
  qualificationStatus?: FeedbackQualificationStatus;
  qualificationReason?: string | null;
  qualificationDecidedAt?: string | null;
  qualificationDecidedByUserId?: string | null;
  qualificationDuplicateFeedbackId?: string | null;
  tracking?: FeedbackTracking;
};

const COMMUNITY_BUG_REPORTS_HISTORY_DEFAULT_LIMIT = 20;
const COMMUNITY_BUG_REPORTS_HISTORY_MAX_LIMIT = 50;

export type CommunityBugReportHistoryCursor = {
  createdAt: string;
  id: string;
};

export type CommunityBugReportHistoryPage = {
  items: BugReportRecord[];
  nextCursor: CommunityBugReportHistoryCursor | null;
  hasMore: boolean;
};

export type CommunityBugReportFollowUpMetrics = {
  received: number;
  pendingQualification: number;
  accepted: number;
  duplicate: number;
  rejected: number;
  shipped: number;
  period: "all_time";
  scope: "community_bug_reports";
};

const COMMUNITY_BUG_REPORT_HISTORY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function clampCommunityBugReportsHistoryLimit(
  value: number | null | undefined,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return COMMUNITY_BUG_REPORTS_HISTORY_DEFAULT_LIMIT;
  }
  return Math.min(
    COMMUNITY_BUG_REPORTS_HISTORY_MAX_LIMIT,
    Math.max(1, Math.trunc(value)),
  );
}

export function parseCommunityBugReportHistoryCursor(
  value: string | null | undefined,
): CommunityBugReportHistoryCursor | null {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf("|");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  const createdAt = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1).trim();
  const timestamp = Date.parse(createdAt);
  if (!COMMUNITY_BUG_REPORT_HISTORY_ID_PATTERN.test(id) || !Number.isFinite(timestamp)) {
    return null;
  }

  return { createdAt: new Date(timestamp).toISOString(), id };
}

export function buildCommunityBugReportHistoryCursor(
  cursor: CommunityBugReportHistoryCursor,
): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export function compareHistoryKeys(
  left: CommunityBugReportHistoryCursor,
  right: CommunityBugReportHistoryCursor,
): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }
  return left.id.localeCompare(right.id);
}

export function toHistoryPage(
  records: BugReportRecord[],
  limit: number,
): CommunityBugReportHistoryPage {
  const hasMore = records.length > limit;
  const items = records.slice(0, limit);
  const lastItem = items.at(-1);
  return {
    items,
    nextCursor:
      hasMore && lastItem
        ? { createdAt: lastItem.createdAt, id: lastItem.id }
        : null,
    hasMore,
  };
}
