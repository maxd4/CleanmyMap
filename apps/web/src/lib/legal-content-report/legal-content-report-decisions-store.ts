import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { upsertSupabaseMirror } from "@/lib/supabase/mirror";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isLegalContentReportDecisionAction,
  isLegalContentReportDecisionExecutionErrorCode,
  isLegalContentReportDecisionExecutionStatus,
  isLegalContentReportDecisionOrigin,
  normalizeLegalContentReportUrl,
  normalizeOptionalReportText,
  type LegalContentReportDecisionRecord,
  type LegalContentReportDecisionExecutionErrorCode,
  type LegalContentReportDecisionExecutionStatus,
  type LegalContentReportNotificationStatus,
} from "./legal-content-report";

export const LEGAL_CONTENT_REPORT_DECISION_MAX_REASON_LENGTH = 2000;
export const LEGAL_CONTENT_REPORT_DECISION_MAX_BASIS_LENGTH = 1000;
export const LEGAL_CONTENT_REPORT_DECISION_MAX_SNAPSHOT_LENGTH = 4000;
export const LEGAL_CONTENT_REPORT_DECISION_MAX_ERROR_LENGTH = 500;

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "legal_content_report_decisions.json",
);

type StorePayload = {
  updatedAt: string;
  records: LegalContentReportDecisionRecord[];
};

function emptyStore(): StorePayload {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

function normalizeSnapshot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length > LEGAL_CONTENT_REPORT_DECISION_MAX_SNAPSHOT_LENGTH) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeNotificationStatus(value: unknown): LegalContentReportNotificationStatus {
  return value === "sent" || value === "failed" ? value : "not_requested";
}

function normalizeExecutionStatus(
  value: unknown,
  action: LegalContentReportDecisionRecord["action"],
): LegalContentReportDecisionExecutionStatus {
  const isContentMutation = action === "content_restricted" || action === "content_removed";
  if (!isContentMutation) return "not_applicable";
  if (!isLegalContentReportDecisionExecutionStatus(value) || value === "not_applicable") {
    return "failed";
  }
  return value;
}

function normalizeExecutionErrorCode(
  value: unknown,
  executionStatus: LegalContentReportDecisionExecutionStatus,
): LegalContentReportDecisionExecutionErrorCode | null {
  if (executionStatus !== "failed") return null;
  return isLegalContentReportDecisionExecutionErrorCode(value)
    ? value
    : "legacy_execution_unknown";
}

function normalizeRecord(value: unknown): LegalContentReportDecisionRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const contentUrl = normalizeLegalContentReportUrl(raw.contentUrl);
  const reason = normalizeOptionalReportText(
    raw.reason,
    LEGAL_CONTENT_REPORT_DECISION_MAX_REASON_LENGTH,
  );
  if (
    typeof raw.id !== "string" ||
    typeof raw.reportId !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.actorAdminUserId !== "string" ||
    !isLegalContentReportDecisionAction(raw.action) ||
    !isLegalContentReportDecisionOrigin(raw.origin) ||
    !reason ||
    typeof raw.automatedMeansUsed !== "boolean" ||
    !contentUrl ||
    typeof raw.auditOperationId !== "string"
  ) {
    return null;
  }

  const executionStatus = normalizeExecutionStatus(raw.executionStatus, raw.action);

  return {
    id: raw.id,
    reportId: raw.reportId,
    createdAt: raw.createdAt,
    actorAdminUserId: raw.actorAdminUserId,
    action: raw.action,
    origin: raw.origin,
    reason,
    automatedMeansUsed: raw.automatedMeansUsed,
    legalBasis: normalizeOptionalReportText(
      raw.legalBasis,
      LEGAL_CONTENT_REPORT_DECISION_MAX_BASIS_LENGTH,
    ),
    termsBasis: normalizeOptionalReportText(
      raw.termsBasis,
      LEGAL_CONTENT_REPORT_DECISION_MAX_BASIS_LENGTH,
    ),
    contentUrl,
    contentId: normalizeOptionalReportText(raw.contentId, 160),
    beforeState: normalizeSnapshot(raw.beforeState),
    afterState: normalizeSnapshot(raw.afterState),
    executionStatus,
    executionErrorCode: normalizeExecutionErrorCode(raw.executionErrorCode, executionStatus),
    auditOperationId: raw.auditOperationId,
    notifierNotificationStatus: normalizeNotificationStatus(
      raw.notifierNotificationStatus,
    ),
    authorNotificationStatus: normalizeNotificationStatus(
      raw.authorNotificationStatus,
    ),
    notificationError: normalizeOptionalReportText(
      raw.notificationError,
      LEGAL_CONTENT_REPORT_DECISION_MAX_ERROR_LENGTH,
    ),
  };
}

function fromSupabaseRow(row: Record<string, unknown>): LegalContentReportDecisionRecord | null {
  return normalizeRecord({
    id: row.id,
    reportId: row.report_id,
    createdAt: row.created_at,
    actorAdminUserId: row.actor_admin_user_id,
    action: row.action,
    origin: row.decision_origin,
    reason: row.reason,
    automatedMeansUsed: row.automated_means_used,
    legalBasis: row.legal_basis,
    termsBasis: row.terms_basis,
    contentUrl: row.content_url,
    contentId: row.content_id,
    beforeState: row.before_state,
    afterState: row.after_state,
    executionStatus: row.execution_status,
    executionErrorCode: row.execution_error_code,
    auditOperationId: row.audit_operation_id,
    notifierNotificationStatus: row.notifier_notification_status,
    authorNotificationStatus: row.author_notification_status,
    notificationError: row.notification_error,
  });
}

async function readStore(): Promise<StorePayload> {
  try {
    const parsed = JSON.parse(await readFile(STORE_FILE, "utf8")) as StorePayload;
    if (!parsed || !Array.isArray(parsed.records)) return emptyStore();
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records
        .map((record) => normalizeRecord(record))
        .filter((record): record is LegalContentReportDecisionRecord => Boolean(record)),
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StorePayload): Promise<void> {
  await ensureDirectory(STORE_FILE);
  await writeFile(
    STORE_FILE,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), records: store.records }, null, 2)}\n`,
    "utf8",
  );
}

function toSupabaseRow(record: LegalContentReportDecisionRecord): Record<string, unknown> {
  return {
    id: record.id,
    report_id: record.reportId,
    created_at: record.createdAt,
    actor_admin_user_id: record.actorAdminUserId,
    action: record.action,
    decision_origin: record.origin,
    reason: record.reason,
    automated_means_used: record.automatedMeansUsed,
    legal_basis: record.legalBasis,
    terms_basis: record.termsBasis,
    content_url: record.contentUrl,
    content_id: record.contentId,
    before_state: record.beforeState,
    after_state: record.afterState,
    execution_status: record.executionStatus,
    execution_error_code: record.executionErrorCode,
    audit_operation_id: record.auditOperationId,
    notifier_notification_status: record.notifierNotificationStatus,
    author_notification_status: record.authorNotificationStatus,
    notification_error: record.notificationError,
  };
}

export async function listLegalContentReportDecisions(
  reportId?: string,
): Promise<LegalContentReportDecisionRecord[]> {
  assertPersistenceAvailable("legal_content_report_decisions");

  if (canUseSupabaseServerPersistence()) {
    try {
      let query = getSupabaseServerClient()
        .from("legal_content_report_decisions")
        .select("id, report_id, created_at, actor_admin_user_id, action, decision_origin, reason, automated_means_used, legal_basis, terms_basis, content_url, content_id, before_state, after_state, execution_status, execution_error_code, audit_operation_id, notifier_notification_status, author_notification_status, notification_error")
        .order("created_at", { ascending: false })
        .limit(8000);
      if (reportId) query = query.eq("report_id", reportId);
      const result = await query;
      if (!result.error) {
        return (result.data ?? [])
          .map((row) => fromSupabaseRow(row as Record<string, unknown>))
          .filter((record): record is LegalContentReportDecisionRecord => Boolean(record));
      }
      if (!allowLocalFileStoreFallback()) throw new Error(result.error.message);
    } catch (error) {
      if (!allowLocalFileStoreFallback()) throw error;
    }
  }

  const store = await readStore();
  return store.records
    .filter((record) => !reportId || record.reportId === reportId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getLatestLegalContentReportDecision(
  reportId: string,
): Promise<LegalContentReportDecisionRecord | null> {
  return (await listLegalContentReportDecisions(reportId))[0] ?? null;
}

export async function appendLegalContentReportDecision(
  input: Omit<LegalContentReportDecisionRecord, "id" | "createdAt" | "notifierNotificationStatus" | "authorNotificationStatus" | "notificationError">,
): Promise<LegalContentReportDecisionRecord> {
  assertPersistenceAvailable("legal_content_report_decisions");
  const record: LegalContentReportDecisionRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
    notifierNotificationStatus: "not_requested",
    authorNotificationStatus: "not_requested",
    notificationError: null,
  };
  const store = await readStore();
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: [record, ...store.records].slice(0, 8000),
  });
  await upsertSupabaseMirror(
    "legal_content_report_decisions",
    toSupabaseRow(record),
  ).catch((error) => console.warn("Legal content report decision Supabase sync failed", error));
  return record;
}

export async function updateLegalContentReportDecisionNotifications(params: {
  decisionId: string;
  notifierNotificationStatus?: LegalContentReportNotificationStatus;
  authorNotificationStatus?: LegalContentReportNotificationStatus;
  notificationError?: string | null;
}): Promise<LegalContentReportDecisionRecord | null> {
  assertPersistenceAvailable("legal_content_report_decisions");
  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.decisionId);
  if (index < 0) return null;
  const current = store.records[index];
  if (!current) return null;
  const updated: LegalContentReportDecisionRecord = {
    ...current,
    ...(params.notifierNotificationStatus
      ? { notifierNotificationStatus: params.notifierNotificationStatus }
      : {}),
    ...(params.authorNotificationStatus
      ? { authorNotificationStatus: params.authorNotificationStatus }
      : {}),
    ...(params.notificationError !== undefined
      ? {
          notificationError: normalizeOptionalReportText(
            params.notificationError,
            LEGAL_CONTENT_REPORT_DECISION_MAX_ERROR_LENGTH,
          ),
        }
      : {}),
  };
  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror(
    "legal_content_report_decisions",
    toSupabaseRow(updated),
  ).catch((error) => console.warn("Legal content report decision notification sync failed", error));
  return updated;
}

export async function updateLegalContentReportDecisionStates(params: {
  decisionId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  executionStatus?: LegalContentReportDecisionExecutionStatus;
  executionErrorCode?: LegalContentReportDecisionExecutionErrorCode | null;
}): Promise<LegalContentReportDecisionRecord | null> {
  assertPersistenceAvailable("legal_content_report_decisions");
  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.decisionId);
  if (index < 0) return null;
  const current = store.records[index];
  if (!current) return null;
  const updated = {
    ...current,
    beforeState:
      params.beforeState === undefined
        ? current.beforeState
        : normalizeSnapshot(params.beforeState),
    afterState:
      params.afterState === undefined
        ? current.afterState
        : normalizeSnapshot(params.afterState),
    executionStatus: params.executionStatus ?? current.executionStatus,
    executionErrorCode:
      (params.executionStatus ?? current.executionStatus) === "failed"
        ? params.executionErrorCode ?? current.executionErrorCode
        : null,
  };
  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror(
    "legal_content_report_decisions",
    toSupabaseRow(updated),
  ).catch((error) => console.warn("Legal content report decision state sync failed", error));
  return updated;
}
