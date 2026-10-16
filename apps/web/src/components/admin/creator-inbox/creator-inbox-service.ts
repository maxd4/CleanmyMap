import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type { CommunityBugReportFollowUpMetrics, FeedbackTrackingStatus } from "@/lib/community/bug-reports-store";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionOrigin,
} from "@/lib/legal-content-report/legal-content-report";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  hint?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await readJson<ApiErrorPayload>(response);
  return body?.hint ?? body?.message ?? body?.error ?? fallback;
}

async function postJson<T>(url: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
  const payload = await readJson<T>(response);
  if (!payload) {
    throw new Error(fallback);
  }
  return payload;
}

export type CreatorInboxPagePayload = {
  items: CreatorInboxItem[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
  canQualify?: boolean;
  feedbackMetrics?: CommunityBugReportFollowUpMetrics;
};

function isFeedbackMetrics(value: unknown): value is CommunityBugReportFollowUpMetrics {
  if (!value || typeof value !== "object") return false;
  const metrics = value as Record<string, unknown>;
  return [
    "received",
    "pendingQualification",
    "accepted",
    "duplicate",
    "rejected",
    "shipped",
  ].every(
    (key) =>
      typeof metrics[key] === "number" &&
      Number.isInteger(metrics[key]) &&
      (metrics[key] as number) >= 0,
  ) && metrics.period === "all_time" && metrics.scope === "community_bug_reports";
}

export async function fetchCreatorInboxPage(params?: {
  limit?: number;
  cursor?: string | null;
}): Promise<CreatorInboxPagePayload> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  if (params?.cursor) search.set("cursor", params.cursor);
  const query = search.toString();
  const response = await fetch(`/api/admin/creator-inbox${query ? `?${query}` : ""}`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to refresh inbox."));
  }
  const payload = await readJson<Partial<CreatorInboxPagePayload>>(response);
  if (
    !payload ||
    !Array.isArray(payload.items) ||
    typeof payload.count !== "number" ||
    typeof payload.hasMore !== "boolean" ||
    (payload.nextCursor !== null && typeof payload.nextCursor !== "string")
    || (payload.canQualify !== undefined && typeof payload.canQualify !== "boolean")
    || (payload.feedbackMetrics !== undefined && !isFeedbackMetrics(payload.feedbackMetrics))
  ) {
    throw new Error("Invalid creator inbox page.");
  }
  return payload as CreatorInboxPagePayload;
}

export async function applyCreatorInboxAction(params: {
  source: CreatorInboxSource;
  itemId: string;
  action: "mark_treated" | "responded" | "archive" | "delete" | "qualify" | "update_tracking";
  reason: string;
  decision?: "pending" | "needs_info" | "accepted" | "duplicate" | "rejected";
  duplicateFeedbackId?: string | null;
  trackingStatus?: FeedbackTrackingStatus;
  trackingPublicSummary?: string | null;
  trackingReference?: string | null;
  trackingShippedOn?: string | null;
}): Promise<{ item?: CreatorInboxItem; deletedId?: string }> {
  const response = await fetch("/api/admin/creator-inbox", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...params,
      ...(params.reason === undefined ? {} : { reason: params.reason.trim() }),
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Action failed."));
  }
  const payload = await readJson<{ item?: CreatorInboxItem; deletedId?: string }>(response);
  return payload ?? {};
}

export async function decideLegalContentReport(params: {
  reportId: string;
  action: LegalContentReportDecisionAction;
  origin: LegalContentReportDecisionOrigin;
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis?: string;
  termsBasis?: string;
}): Promise<{ item?: CreatorInboxItem; status?: string; warning?: string }> {
  return postJson(
    "/api/admin/legal-content-reports/decision",
    {
      ...params,
      reason: params.reason.trim(),
      legalBasis: params.legalBasis?.trim() || undefined,
      termsBasis: params.termsBasis?.trim() || undefined,
    },
    "Decision failed.",
  );
}

export async function acceptPromotionRequest(params: {
  requestId: string;
  reason: string;
}): Promise<void> {
  await postJson(
    "/api/admin/promotion-requests",
    { requestId: params.requestId, action: "accept", reason: params.reason.trim() },
    "Approval failed.",
  );
}

export async function rejectPromotionRequest(params: {
  requestId: string;
  reason: string;
}): Promise<void> {
  await postJson(
    "/api/admin/promotion-requests",
    { requestId: params.requestId, action: "reject", reason: params.reason.trim() },
    "Rejection failed.",
  );
}

export async function acceptPartnerRequest(params: {
  id: string;
  confirmPhrase: string;
  reason: string;
}): Promise<void> {
  await postJson(
    "/api/admin/partners/published-directory",
    {
      id: params.id,
      publicationStatus: "accepted",
      confirmPhrase: params.confirmPhrase,
      reason: params.reason.trim(),
    },
    "Approval failed.",
  );
}

export async function rejectPartnerRequest(params: {
  id: string;
  confirmPhrase: string;
  reason: string;
}): Promise<void> {
  await postJson(
    "/api/admin/partners/published-directory",
    {
      id: params.id,
      publicationStatus: "rejected",
      confirmPhrase: params.confirmPhrase,
      reason: params.reason.trim(),
    },
    "Rejection failed.",
  );
}
