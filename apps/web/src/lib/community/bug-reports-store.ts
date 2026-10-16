import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
  deleteAndPersistRecord,
  deleteSupabaseRecordById,
  findRecordInList,
  persistSupabaseRecord,
  readSupabaseRecord,
  readSupabaseRecords,
  replaceAndPersistRecord,
} from "@/lib/persistence/runtime-store";
import {
  normalizeOptionalTextField,
  normalizeTextField,
} from "@/lib/persistence/record-normalizers";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
} from "@/lib/persistence/local-record-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { removeBugReportScreenshotForDeletedReport } from "./bug-report-screenshot";
import {
  compareCreatorInboxRecordCursors,
  type CreatorInboxRecordCursor,
} from "./creator-inbox-pagination";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "community_bug_reports.json",
);
const SUPABASE_BUG_REPORT_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_display_name, submitted_by_email, submitted_by_role, report_type, title, description, page_path, source, status, creator_state, screenshot_upload_state, qualification_status, qualification_reason, qualification_decided_at, qualification_decided_by_user_id, qualification_duplicate_feedback_id";

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
};

export const COMMUNITY_BUG_REPORTS_HISTORY_DEFAULT_LIMIT = 20;
export const COMMUNITY_BUG_REPORTS_HISTORY_MAX_LIMIT = 50;

export type CommunityBugReportHistoryCursor = {
  createdAt: string;
  id: string;
};

export type CommunityBugReportHistoryPage = {
  items: BugReportRecord[];
  nextCursor: CommunityBugReportHistoryCursor | null;
  hasMore: boolean;
};

const COMMUNITY_BUG_REPORT_HISTORY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type StorePayload = {
  updatedAt: string;
  records: BugReportRecord[];
};

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

function compareHistoryKeys(
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

function toHistoryPage(
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

function isBugReportType(
  value: unknown,
): value is BugReportRecord["reportType"] {
  return (
    value === "bug" ||
    value === "idea" ||
    value === "improvement" ||
    value === "collaboration"
  );
}

function normalizeBugReportSource(
  value: unknown,
): BugReportRecord["source"] {
  return value === "feedback_section" || value === "feedback_discussion"
    ? value
    : "discussion_form";
}

function normalizeBugReportStatus(
  value: unknown,
): BugReportRecord["status"] {
  return value === "treated" || value === "archived" ? value : "open";
}

function normalizeBugReportCreatorState(
  value: unknown,
  status: BugReportRecord["status"],
): BugReportRecord["creatorState"] {
  if (
    value === "pending" ||
    value === "responded" ||
    value === "treated" ||
    value === "archived"
  ) {
    return value;
  }
  if (status === "treated") {
    return "treated";
  }
  if (status === "archived") {
    return "archived";
  }
  return "new";
}

function normalizeScreenshotUploadState(
  value: unknown,
): BugReportRecord["screenshotUploadState"] {
  return value === "pending" || value === "ready" || value === "failed" ? value : null;
}

function normalizeFeedbackQualificationStatus(
  value: unknown,
): FeedbackQualificationStatus {
  return FEEDBACK_QUALIFICATION_STATUSES.includes(
    value as FeedbackQualificationStatus,
  )
    ? (value as FeedbackQualificationStatus)
    : "pending";
}

function normalizeBugReportRecord(record: unknown): BugReportRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const raw = record as Record<string, unknown>;
  if (!isBugReportType(raw["reportType"])) {
    return null;
  }

  const title = normalizeTextField(raw["title"]);
  const description = normalizeTextField(raw["description"]);
  const pagePath = normalizeOptionalTextField(raw["pagePath"]);
  const submittedByUserId =
    typeof raw["submittedByUserId"] === "string" ? raw["submittedByUserId"] : "unknown";
  const submittedByDisplayName =
    normalizeOptionalTextField(raw["submittedByDisplayName"]) ?? submittedByUserId;
  const submittedByEmail = normalizeOptionalTextField(raw["submittedByEmail"]);
  const submittedByRole = normalizeOptionalTextField(raw["submittedByRole"]);
  const id = typeof raw["id"] === "string" ? raw["id"] : randomUUID();
  const createdAt =
    typeof raw["createdAt"] === "string" ? raw["createdAt"] : new Date().toISOString();
  const source = normalizeBugReportSource(raw["source"]);
  const status = normalizeBugReportStatus(raw["status"]);
  const creatorState = normalizeBugReportCreatorState(raw["creatorState"], status);
  const rawReportType = raw["reportType"];

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByDisplayName,
    submittedByEmail,
    submittedByRole,
    source,
    status,
    creatorState,
    screenshotUploadState: normalizeScreenshotUploadState(raw["screenshotUploadState"]),
    qualificationStatus: normalizeFeedbackQualificationStatus(
      raw["qualificationStatus"],
    ),
    qualificationReason: normalizeOptionalTextField(raw["qualificationReason"]),
    qualificationDecidedAt: normalizeOptionalTextField(
      raw["qualificationDecidedAt"],
    ),
    qualificationDecidedByUserId: normalizeOptionalTextField(
      raw["qualificationDecidedByUserId"],
    ),
    qualificationDuplicateFeedbackId: normalizeOptionalTextField(
      raw["qualificationDuplicateFeedbackId"],
    ),
    reportType: rawReportType as BugReportRecord["reportType"],
    title,
    description,
    pagePath,
  };
}

function fromSupabaseRow(row: Record<string, unknown>): BugReportRecord | null {
  return normalizeBugReportRecord({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByDisplayName: row.submitted_by_display_name,
    submittedByEmail: row.submitted_by_email,
    submittedByRole: row.submitted_by_role,
    reportType: row.report_type,
    title: row.title,
    description: row.description,
    pagePath: row.page_path,
    source: row.source,
    status: row.status,
    creatorState: row.creator_state,
    screenshotUploadState: row.screenshot_upload_state,
    qualificationStatus: row.qualification_status,
    qualificationReason: row.qualification_reason,
    qualificationDecidedAt: row.qualification_decided_at,
    qualificationDecidedByUserId: row.qualification_decided_by_user_id,
    qualificationDuplicateFeedbackId: row.qualification_duplicate_feedback_id,
  });
}

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, (record) => normalizeBugReportRecord(record));
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}

function toSupabaseRow(record: BugReportRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    submitted_by_display_name: record.submittedByDisplayName,
    submitted_by_email: record.submittedByEmail,
    submitted_by_role: record.submittedByRole,
    report_type: record.reportType,
    title: record.title,
    description: record.description,
    page_path: record.pagePath,
    source: record.source,
    status: record.status,
    creator_state: record.creatorState,
    qualification_status: record.qualificationStatus ?? "pending",
    qualification_reason: record.qualificationReason ?? null,
    qualification_decided_at: record.qualificationDecidedAt ?? null,
    qualification_decided_by_user_id: record.qualificationDecidedByUserId ?? null,
    qualification_duplicate_feedback_id:
      record.qualificationDuplicateFeedbackId ?? null,
  };
}

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
  if (result.error) {
    throw new Error(result.error.message);
  }

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
    submittedByDisplayName:
      restInput.submittedByDisplayName ?? params.submittedByUserId,
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
    .sort((left, right) => compareCreatorInboxRecordCursors(right, left))
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
  if (index < 0) {
    return null;
  }

  const current = store.records[index];
  if (!current) {
    return null;
  }

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

export async function deleteCommunityBugReport(
  reportId: string,
): Promise<boolean> {
  assertPersistenceAvailable("community_bug_reports");

  if (canUseSupabaseServerPersistence()) {
    await removeBugReportScreenshotForDeletedReport(
      getSupabaseServerClient(true),
      reportId,
    );
    return deleteSupabaseRecordById(getSupabaseServerClient(true), "community_bug_reports", reportId);
  }

  const store = await readStore();
  return deleteAndPersistRecord(store.records, (record) => record.id === reportId, (records) => writeStore({ updatedAt: new Date().toISOString(), records }));
}

export async function updateCommunityBugReportCreatorState(params: {
  reportId: string;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived";
}): Promise<BugReportRecord | null> {
  assertPersistenceAvailable("community_bug_reports");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("community_bug_reports")
        .update({ creator_state: params.creatorState })
        .eq("id", params.reportId)
        .select(SUPABASE_BUG_REPORT_COLUMNS)
        .maybeSingle(),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  return replaceAndPersistRecord(
    store.records,
    (record) => record.id === params.reportId,
    (current) => ({ ...current, creatorState: params.creatorState }),
    (records) => writeStore({ updatedAt: new Date().toISOString(), records }),
  );
}
