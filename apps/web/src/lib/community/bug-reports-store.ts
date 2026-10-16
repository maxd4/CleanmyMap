import { randomUUID } from "node:crypto";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
  deleteAndPersistRecord,
  deleteSupabaseRecordById,
  findRecordInList,
  persistSupabaseRecord,
  readSupabaseRecord,
  readSupabaseRecords,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { removeBugReportScreenshotForDeletedReport } from "./bug-report-screenshot";
import {
  clampCommunityBugReportsHistoryLimit,
  compareHistoryKeys,
  toHistoryPage,
  type BugReportInput,
  type BugReportRecord,
  type CommunityBugReportHistoryCursor,
  type CommunityBugReportHistoryPage,
  type FeedbackQualificationDecision,
  type FeedbackTrackingStatus,
} from "./bug-reports-store-contract";
import {
  fromSupabaseRow,
  toSupabaseRow,
} from "./bug-reports-store-normalization";
import {
  readStore,
  SUPABASE_BUG_REPORT_COLUMNS,
  writeStore,
} from "./bug-reports-store-persistence";
import {
  compareCreatorInboxRecordCursors,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";

export type {
  BugReportInput,
  BugReportRecord,
  CommunityBugReportFollowUpMetrics,
  CommunityBugReportHistoryCursor,
  CommunityBugReportHistoryPage,
  FeedbackQualificationDecision,
  FeedbackQualificationStatus,
  FeedbackTracking,
  FeedbackTrackingStatus,
} from "./bug-reports-store-contract";
export {
  buildCommunityBugReportHistoryCursor,
  clampCommunityBugReportsHistoryLimit,
  parseCommunityBugReportHistoryCursor,
} from "./bug-reports-store-contract";
export { loadCommunityBugReportFollowUpMetrics } from "./bug-reports-store-metrics";

export type CommunityBugReportQualificationResult = {
  record: BugReportRecord | null;
  status: "updated" | "unchanged" | "not_found" | "duplicate_not_found";
};

export async function qualifyCommunityBugReport(params: {
  reportId: string;
  decision: FeedbackQualificationDecision;
  reason: string | null;
  duplicateFeedbackId: string | null;
  actorUserId: string;
  operationId: string;
}): Promise<CommunityBugReportQualificationResult> {
  assertPersistenceAvailable("community_bug_reports");

  if (!canUseSupabaseServerPersistence()) {
    throw new Error(
      "Feedback qualification requires transactional Supabase persistence.",
    );
  }

  const result = await getSupabaseServerClient(true).rpc(
    "qualify_community_bug_report",
    {
      p_feedback_id: params.reportId,
      p_decision: params.decision,
      p_reason: params.reason,
      p_duplicate_feedback_id: params.duplicateFeedbackId,
      p_actor_user_id: params.actorUserId,
      p_operation_id: params.operationId,
    },
  );
  if (result.error) throw new Error(result.error.message);

  const payload = result.data as {
    status?: CommunityBugReportQualificationResult["status"];
    item?: Record<string, unknown> | null;
  } | null;
  const status = payload?.status;
  if (
    status !== "updated" &&
    status !== "unchanged" &&
    status !== "not_found" &&
    status !== "duplicate_not_found"
  ) {
    throw new Error("Invalid feedback qualification result.");
  }
  return {
    status,
    record: payload?.item ? fromSupabaseRow(payload.item) : null,
  };
}

export type CommunityBugReportTrackingResult = {
  record: BugReportRecord | null;
  status: "updated" | "unchanged" | "not_found";
};

export async function updateCommunityBugReportTracking(params: {
  reportId: string;
  trackingStatus: FeedbackTrackingStatus;
  publicSummary: string | null;
  reference: string | null;
  shippedOn: string | null;
  actorUserId: string;
  operationId: string;
}): Promise<CommunityBugReportTrackingResult> {
  assertPersistenceAvailable("community_bug_reports");

  if (!canUseSupabaseServerPersistence()) {
    throw new Error("Feedback tracking requires transactional Supabase persistence.");
  }

  const result = await getSupabaseServerClient(true).rpc(
    "update_community_bug_report_tracking",
    {
      p_feedback_id: params.reportId,
      p_tracking_status: params.trackingStatus,
      p_public_summary: params.publicSummary,
      p_reference: params.reference,
      p_shipped_on: params.shippedOn,
      p_actor_user_id: params.actorUserId,
      p_operation_id: params.operationId,
    },
  );
  if (result.error) throw new Error(result.error.message);

  const payload = result.data as {
    status?: CommunityBugReportTrackingResult["status"];
    item?: Record<string, unknown> | null;
  } | null;
  if (
    payload?.status !== "updated" &&
    payload?.status !== "unchanged" &&
    payload?.status !== "not_found"
  ) {
    throw new Error("Invalid feedback tracking result.");
  }

  return {
    status: payload.status,
    record: payload.item ? fromSupabaseRow(payload.item) : null,
  };
}

export async function appendCommunityBugReport(params: {
  submittedByUserId: string;
  input: BugReportInput;
}): Promise<BugReportRecord> {
  assertPersistenceAvailable("community_bug_reports");

  const { source, ...restInput } = params.input;
  const record: BugReportRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...restInput,
    submittedByUserId: params.submittedByUserId,
    submittedByDisplayName: restInput.submittedByDisplayName ?? params.submittedByUserId,
    submittedByEmail: restInput.submittedByEmail ?? null,
    submittedByRole: restInput.submittedByRole ?? null,
    source: source ?? "discussion_form",
    status: "open",
    creatorState: "new",
    screenshotUploadState: null,
  };

  if (canUseSupabaseServerPersistence()) {
    return persistSupabaseRecord(
      getSupabaseServerClient(true)
        .from("community_bug_reports")
        .insert(toSupabaseRow(record))
        .select(SUPABASE_BUG_REPORT_COLUMNS)
        .single(),
      fromSupabaseRow,
      "Supabase returned an invalid community bug report.",
    );
  }

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 4000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function listCommunityBugReports(
  limit = 100,
  beforeCursor?: CreatorInboxRecordCursor | null,
): Promise<BugReportRecord[]> {
  assertPersistenceAvailable("community_bug_reports");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    let query = getSupabaseServerClient(true)
      .from("community_bug_reports")
      .select(SUPABASE_BUG_REPORT_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (beforeCursor) {
      query = query.or(
        `created_at.lt.${beforeCursor.createdAt},and(created_at.eq.${beforeCursor.createdAt},id.lt.${beforeCursor.id})`,
      );
    }
    return readSupabaseRecords(query.limit(normalizedLimit), fromSupabaseRow);
  }

  const store = await readStore();
  return store.records
    .filter(
      (record) =>
        !beforeCursor ||
        compareCreatorInboxRecordCursors(record, beforeCursor) < 0,
    )
    .sort((left, right) =>
      compareCreatorInboxRecordCursors(right, left),
    )
    .slice(0, normalizedLimit);
}

export async function listCommunityBugReportsForUser(params: {
  submittedByUserId: string;
  limit?: number | null;
  beforeCursor?: CommunityBugReportHistoryCursor | null;
}): Promise<CommunityBugReportHistoryPage> {
  assertPersistenceAvailable("community_bug_reports");
  const submittedByUserId = params.submittedByUserId.trim();
  if (!submittedByUserId) {
    throw new Error("Authenticated feedback owner id is required.");
  }

  const limit = clampCommunityBugReportsHistoryLimit(params.limit);
  if (canUseSupabaseServerPersistence()) {
    let query = getSupabaseServerClient(true)
      .from("community_bug_reports")
      .select(SUPABASE_BUG_REPORT_COLUMNS)
      .eq("submitted_by_user_id", submittedByUserId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (params.beforeCursor) {
      const { createdAt, id } = params.beforeCursor;
      query = query.or(
        `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`,
      );
    }
    return toHistoryPage(
      await readSupabaseRecords(query.limit(limit + 1), fromSupabaseRow),
      limit,
    );
  }

  const store = await readStore();
  const records = store.records
    .filter((record) => record.submittedByUserId === submittedByUserId)
    .filter((record) =>
      params.beforeCursor
        ? compareHistoryKeys(
            { createdAt: record.createdAt, id: record.id },
            params.beforeCursor,
          ) < 0
        : true,
    )
    .sort((left, right) =>
      compareHistoryKeys(
        { createdAt: right.createdAt, id: right.id },
        { createdAt: left.createdAt, id: left.id },
      ),
    );
  return toHistoryPage(records.slice(0, limit + 1), limit);
}

export async function getCommunityBugReportById(
  reportId: string,
): Promise<BugReportRecord | null> {
  assertPersistenceAvailable("community_bug_reports");
  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("community_bug_reports")
        .select(SUPABASE_BUG_REPORT_COLUMNS)
        .eq("id", reportId)
        .maybeSingle(),
      fromSupabaseRow,
    );
  }
  const store = await readStore();
  return findRecordInList(store.records, (record) => record.id === reportId);
}

export async function updateCommunityBugReportStatus(params: {
  reportId: string;
  status: "open" | "treated" | "archived";
}): Promise<BugReportRecord | null> {
  assertPersistenceAvailable("community_bug_reports");

  if (canUseSupabaseServerPersistence()) {
    const creatorState =
      params.status === "open"
        ? "new"
        : params.status === "treated"
          ? "treated"
          : "archived";
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("community_bug_reports")
        .update({ status: params.status, creator_state: creatorState })
        .eq("id", params.reportId)
        .select(SUPABASE_BUG_REPORT_COLUMNS)
        .maybeSingle(),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.reportId);
  if (index < 0) return null;
  const current = store.records[index];
  if (!current) return null;

  const updated: BugReportRecord = {
    ...current,
    status: params.status,
    creatorState:
      params.status === "open"
        ? "new"
        : params.status === "treated"
          ? "treated"
          : "archived",
  };
  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return updated;
}

export async function deleteCommunityBugReport(reportId: string): Promise<boolean> {
  assertPersistenceAvailable("community_bug_reports");
  if (canUseSupabaseServerPersistence()) {
    await removeBugReportScreenshotForDeletedReport(
      getSupabaseServerClient(true),
      reportId,
    );
    return deleteSupabaseRecordById(
      getSupabaseServerClient(true),
      "community_bug_reports",
      reportId,
    );
  }

  const store = await readStore();
  return deleteAndPersistRecord(
    store.records,
    (record) => record.id === reportId,
    (records) => writeStore({ updatedAt: new Date().toISOString(), records }),
  );
}
