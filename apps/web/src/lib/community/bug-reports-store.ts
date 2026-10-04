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

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "community_bug_reports.json",
);
const SUPABASE_BUG_REPORT_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_display_name, submitted_by_email, submitted_by_role, report_type, title, description, page_path, source, status, creator_state";

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
};

type StorePayload = {
  updatedAt: string;
  records: BugReportRecord[];
};

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
): Promise<BugReportRecord[]> {
  assertPersistenceAvailable("community_bug_reports");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecords(
      getSupabaseServerClient(true)
        .from("community_bug_reports")
        .select(SUPABASE_BUG_REPORT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(normalizedLimit),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  return store.records.slice(0, normalizedLimit);
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
