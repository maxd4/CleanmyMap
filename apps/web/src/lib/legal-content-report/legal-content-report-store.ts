import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH,
  LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH,
  normalizeLegalContentReportUrl,
  normalizeOptionalReportText,
  type LegalContentReportInput,
  type LegalContentReportRecord,
} from "./legal-content-report";
import { getLatestLegalContentReportDecision } from "./legal-content-report-decisions-store";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "legal_content_reports.json",
);
const SUPABASE_REPORT_COLUMNS =
  "id, created_at, submitted_by_user_id, notifier_name, notifier_email, identity_exception_reason, content_url, content_type, content_id, allegation_reason, good_faith_confirmed, status, creator_state";

type StorePayload = {
  updatedAt: string;
  records: LegalContentReportRecord[];
};

function emptyStore(): StorePayload {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

function normalizeRecord(value: unknown): LegalContentReportRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const contentUrl = normalizeLegalContentReportUrl(raw["contentUrl"]);
  const allegationReason = normalizeOptionalReportText(
    raw["allegationReason"],
    LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH,
  );
  if (!contentUrl || !allegationReason || raw["goodFaithConfirmed"] !== true) {
    return null;
  }

  const status =
    raw["status"] === "treated" || raw["status"] === "archived"
      ? raw["status"]
      : "open";
  const creatorState =
    raw["creatorState"] === "responded" ||
    raw["creatorState"] === "treated" ||
    raw["creatorState"] === "archived" ||
    raw["creatorState"] === "reviewing" ||
    raw["creatorState"] === "no_action" ||
    raw["creatorState"] === "content_restricted" ||
    raw["creatorState"] === "content_removed" ||
    raw["creatorState"] === "closed"
      ? raw["creatorState"]
      : "new";

  return {
    id: typeof raw["id"] === "string" ? raw["id"] : randomUUID(),
    createdAt:
      typeof raw["createdAt"] === "string"
        ? raw["createdAt"]
        : new Date().toISOString(),
    submittedByUserId:
      typeof raw["submittedByUserId"] === "string"
        ? raw["submittedByUserId"]
        : null,
    notifierName: normalizeOptionalReportText(raw["notifierName"], 160),
    notifierEmail: normalizeOptionalReportText(raw["notifierEmail"], 254),
    identityExceptionReason: normalizeOptionalReportText(
      raw["identityExceptionReason"],
      LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH,
    ),
    contentUrl,
    contentType: normalizeOptionalReportText(raw["contentType"], 120),
    contentId: normalizeOptionalReportText(raw["contentId"], 160),
    allegationReason,
    goodFaithConfirmed: true,
    status,
    creatorState,
  } as LegalContentReportRecord;
}

async function readStore(): Promise<StorePayload> {
  try {
    const parsed = JSON.parse(await readFile(STORE_FILE, "utf8")) as StorePayload;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records
        .map((record) => normalizeRecord(record))
        .filter((record): record is LegalContentReportRecord => Boolean(record)),
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
      { updatedAt: new Date().toISOString(), records: store.records },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function toSupabaseRow(record: LegalContentReportRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    notifier_name: record.notifierName,
    notifier_email: record.notifierEmail,
    identity_exception_reason: record.identityExceptionReason,
    content_url: record.contentUrl,
    content_type: record.contentType,
    content_id: record.contentId,
    allegation_reason: record.allegationReason,
    good_faith_confirmed: record.goodFaithConfirmed,
    status: record.status,
    creator_state: record.creatorState,
  };
}

function fromSupabaseRow(row: Record<string, unknown>): LegalContentReportRecord | null {
  return normalizeRecord({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    notifierName: row.notifier_name,
    notifierEmail: row.notifier_email,
    identityExceptionReason: row.identity_exception_reason,
    contentUrl: row.content_url,
    contentType: row.content_type,
    contentId: row.content_id,
    allegationReason: row.allegation_reason,
    goodFaithConfirmed: row.good_faith_confirmed,
    status: row.status,
    creatorState: row.creator_state,
  });
}

export async function appendLegalContentReport(
  input: LegalContentReportInput,
): Promise<LegalContentReportRecord> {
  assertPersistenceAvailable("legal_content_reports");
  const record: LegalContentReportRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
    status: "open",
    creatorState: "new",
  };

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("legal_content_reports")
      .insert(toSupabaseRow(record))
      .select(SUPABASE_REPORT_COLUMNS)
      .single();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const persisted = fromSupabaseRow(result.data as Record<string, unknown>);
    if (!persisted) {
      throw new Error("Supabase returned an invalid legal content report.");
    }
    return persisted;
  }

  const store = await readStore();
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: [record, ...store.records].slice(0, 4000),
  });
  return record;
}

export async function listLegalContentReports(limit = 200): Promise<LegalContentReportRecord[]> {
  assertPersistenceAvailable("legal_content_reports");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("legal_content_reports")
      .select(SUPABASE_REPORT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return Promise.all(
      (result.data ?? [])
        .map((row) => fromSupabaseRow(row as Record<string, unknown>))
        .filter((record): record is LegalContentReportRecord => Boolean(record))
        .map(async (record) => ({
          ...record,
          latestDecision: await getLatestLegalContentReportDecision(record.id),
        })),
    );
  }

  const store = await readStore();
  return Promise.all(
    store.records.slice(0, normalizedLimit).map(async (record) => ({
      ...record,
      latestDecision: await getLatestLegalContentReportDecision(record.id),
    })),
  );
}

export async function getLegalContentReportById(
  reportId: string,
): Promise<LegalContentReportRecord | null> {
  assertPersistenceAvailable("legal_content_reports");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("legal_content_reports")
      .select(SUPABASE_REPORT_COLUMNS)
      .eq("id", reportId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const record = result.data
      ? fromSupabaseRow(result.data as Record<string, unknown>)
      : null;
    return record
      ? { ...record, latestDecision: await getLatestLegalContentReportDecision(record.id) }
      : null;
  }

  const store = await readStore();
  const record = store.records.find((candidate) => candidate.id === reportId);
  if (!record) return null;
  return {
    ...record,
    latestDecision: await getLatestLegalContentReportDecision(record.id),
  };
}

export async function updateLegalContentReportState(params: {
  reportId: string;
  creatorState: LegalContentReportRecord["creatorState"];
}): Promise<LegalContentReportRecord | null> {
  assertPersistenceAvailable("legal_content_reports");

  if (canUseSupabaseServerPersistence()) {
    const updatedStatus =
      params.creatorState === "treated" ||
      params.creatorState === "no_action" ||
      params.creatorState === "content_restricted" ||
      params.creatorState === "content_removed"
        ? "treated"
        : params.creatorState === "archived" || params.creatorState === "closed"
          ? "archived"
          : null;
    const update = updatedStatus
      ? { creator_state: params.creatorState, status: updatedStatus }
      : { creator_state: params.creatorState };
    const result = await getSupabaseServerClient()
      .from("legal_content_reports")
      .update(update)
      .eq("id", params.reportId)
      .select(SUPABASE_REPORT_COLUMNS)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const updated = result.data
      ? fromSupabaseRow(result.data as Record<string, unknown>)
      : null;
    return updated
      ? { ...updated, latestDecision: await getLatestLegalContentReportDecision(updated.id) }
      : null;
  }

  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.reportId);
  if (index < 0) return null;
  const current = store.records[index];
  if (!current) return null;
  const updated = {
    ...current,
    creatorState: params.creatorState,
    status:
      params.creatorState === "treated" ||
      params.creatorState === "no_action" ||
      params.creatorState === "content_restricted" ||
      params.creatorState === "content_removed"
        ? "treated"
        : params.creatorState === "archived" || params.creatorState === "closed"
          ? "archived"
          : current.status,
  } satisfies LegalContentReportRecord;
  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return updated;
}

export async function deleteLegalContentReport(reportId: string): Promise<boolean> {
  assertPersistenceAvailable("legal_content_reports");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("legal_content_reports")
      .delete()
      .eq("id", reportId)
      .select("id");
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data ?? []).length > 0;
  }

  const store = await readStore();
  const records = store.records.filter((record) => record.id !== reportId);
  if (records.length === store.records.length) return false;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return true;
}
