import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";
import { deleteSupabaseMirror, upsertSupabaseMirror } from "@/lib/supabase/mirror";
import {
  LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH,
  LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH,
  normalizeLegalContentReportUrl,
  normalizeOptionalReportText,
  type LegalContentReportInput,
  type LegalContentReportRecord,
} from "./legal-content-report";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "legal_content_reports.json",
);

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
    raw["creatorState"] === "archived"
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
  const store = await readStore();
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: [record, ...store.records].slice(0, 4000),
  });
  await upsertSupabaseMirror("legal_content_reports", toSupabaseRow(record)).catch(
    (error) => {
      console.warn("Legal content report Supabase sync failed", error);
    },
  );
  return record;
}

export async function listLegalContentReports(limit = 200): Promise<LegalContentReportRecord[]> {
  assertPersistenceAvailable("legal_content_reports");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const store = await readStore();
  return store.records.slice(0, normalizedLimit);
}

export async function updateLegalContentReportState(params: {
  reportId: string;
  creatorState: LegalContentReportRecord["creatorState"];
}): Promise<LegalContentReportRecord | null> {
  assertPersistenceAvailable("legal_content_reports");
  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.reportId);
  if (index < 0) return null;
  const current = store.records[index];
  if (!current) return null;
  const updated = {
    ...current,
    creatorState: params.creatorState,
    status:
      params.creatorState === "treated"
        ? "treated"
        : params.creatorState === "archived"
          ? "archived"
          : current.status,
  } satisfies LegalContentReportRecord;
  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror("legal_content_reports", toSupabaseRow(updated)).catch(
    (error) => console.warn("Legal content report Supabase sync failed", error),
  );
  return updated;
}

export async function deleteLegalContentReport(reportId: string): Promise<boolean> {
  assertPersistenceAvailable("legal_content_reports");
  const store = await readStore();
  const records = store.records.filter((record) => record.id !== reportId);
  if (records.length === store.records.length) return false;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await deleteSupabaseMirror("legal_content_reports", reportId).catch((error) =>
    console.warn("Legal content report Supabase delete sync failed", error),
  );
  return true;
}
