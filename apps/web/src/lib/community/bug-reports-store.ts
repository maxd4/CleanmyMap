import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";
import {
  deleteSupabaseMirror,
  upsertSupabaseMirror,
} from "@/lib/supabase/mirror";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "community_bug_reports.json",
);

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

function normalizeBugReportRecord(record: unknown): BugReportRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const raw = record as Record<string, unknown>;
  if (!isBugReportType(raw["reportType"])) {
    return null;
  }

  const title = typeof raw["title"] === "string" ? raw["title"] : "";
  const description = typeof raw["description"] === "string" ? raw["description"] : "";
  const pagePath = typeof raw["pagePath"] === "string" ? raw["pagePath"] : null;
  const submittedByUserId =
    typeof raw["submittedByUserId"] === "string" ? raw["submittedByUserId"] : "unknown";
  const submittedByDisplayName =
    typeof raw["submittedByDisplayName"] === "string" &&
      raw["submittedByDisplayName"].trim().length > 0
      ? raw["submittedByDisplayName"]
      : submittedByUserId;
  const submittedByEmail =
    typeof raw["submittedByEmail"] === "string" && raw["submittedByEmail"].trim().length > 0
      ? raw["submittedByEmail"]
      : null;
  const submittedByRole =
    typeof raw["submittedByRole"] === "string" && raw["submittedByRole"].trim().length > 0
      ? raw["submittedByRole"]
      : null;
  const id = typeof raw["id"] === "string" ? raw["id"] : randomUUID();
  const createdAt = typeof raw["createdAt"] === "string" ? raw["createdAt"] : new Date().toISOString();
  const source =
    raw["source"] === "feedback_section" || raw["source"] === "feedback_discussion"
      ? raw["source"]
      : "discussion_form";
  const status =
    raw["status"] === "treated" || raw["status"] === "archived" ? raw["status"] : "open";
  const creatorState =
    raw["creatorState"] === "pending" ||
    raw["creatorState"] === "responded" ||
    raw["creatorState"] === "treated" ||
    raw["creatorState"] === "archived"
      ? raw["creatorState"]
      : status === "treated"
        ? "treated"
        : status === "archived"
          ? "archived"
      : "new";
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

function emptyStore(): StorePayload {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readStore(): Promise<StorePayload> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StorePayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records
        .map((record) => normalizeBugReportRecord(record))
        .filter((record): record is BugReportRecord => Boolean(record)),
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StorePayload): Promise<void> {
  await ensureDirectory(STORE_FILE);
  await writeFile(
    STORE_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        records: store.records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
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

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 4000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror("community_bug_reports", toSupabaseRow(record)).catch(
    (error) => {
      console.warn("Community bug report Supabase sync failed", error);
    },
  );
  return record;
}

export async function listCommunityBugReports(
  limit = 100,
): Promise<BugReportRecord[]> {
  assertPersistenceAvailable("community_bug_reports");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const store = await readStore();
  return store.records.slice(0, normalizedLimit);
}

export async function updateCommunityBugReportStatus(params: {
  reportId: string;
  status: "open" | "treated" | "archived";
}): Promise<BugReportRecord | null> {
  assertPersistenceAvailable("community_bug_reports");
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
  await upsertSupabaseMirror("community_bug_reports", toSupabaseRow(updated)).catch(
    (error) => {
      console.warn("Community bug report Supabase sync failed", error);
    },
  );
  return updated;
}

export async function deleteCommunityBugReport(
  reportId: string,
): Promise<boolean> {
  assertPersistenceAvailable("community_bug_reports");
  const store = await readStore();
  const nextRecords = store.records.filter((record) => record.id !== reportId);
  if (nextRecords.length === store.records.length) {
    return false;
  }
  await writeStore({ updatedAt: new Date().toISOString(), records: nextRecords });
  await deleteSupabaseMirror("community_bug_reports", reportId).catch((error) => {
    console.warn("Community bug report Supabase delete sync failed", error);
  });
  return true;
}

export async function updateCommunityBugReportCreatorState(params: {
  reportId: string;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived";
}): Promise<BugReportRecord | null> {
  assertPersistenceAvailable("community_bug_reports");
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
    creatorState: params.creatorState,
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror("community_bug_reports", toSupabaseRow(updated)).catch(
    (error) => {
      console.warn("Community bug report Supabase sync failed", error);
    },
  );
  return updated;
}
