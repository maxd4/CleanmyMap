import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
  prependBoundedRecord,
  requirePersistedRecord,
  readSupabaseRecord,
  replaceRecordInList,
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

type ContactRequestType = "access" | "rectification" | "erasure" | "portability" | "other";
export type ContactRequestStatus = "queued" | "sent" | "failed";

export type ContactRequestRecord = {
  id: string;
  createdAt: string;
  submittedByUserId: string | null;
  submittedByEmail: string;
  requestType: ContactRequestType;
  subject: string;
  message: string;
  pagePath: string | null;
  source: "contact_page";
  status: ContactRequestStatus;
  notificationError: string | null;
};

export type ContactRequestInput = {
  submittedByEmail: string;
  requestType: ContactRequestType;
  subject: string;
  message: string;
  pagePath?: string | null;
};

type StorePayload = {
  updatedAt: string;
  records: ContactRequestRecord[];
};

const STORE_FILE = join(process.cwd(), "data", "local-db", "contact_requests.json");
const SUPABASE_CONTACT_REQUEST_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_email, request_type, subject, message, page_path, source, status, notification_error";

function isContactRequestType(value: unknown): value is ContactRequestType {
  return (
    value === "access" ||
    value === "rectification" ||
    value === "erasure" ||
    value === "portability" ||
    value === "other"
  );
}

function normalizeContactRequestStatus(
  value: unknown,
): ContactRequestStatus {
  return value === "queued" || value === "sent" || value === "failed"
    ? value
    : "queued";
}

function normalizeContactRequest(record: Record<string, unknown>): ContactRequestRecord | null {
  const id = normalizeTextField(record["id"]);
  const createdAt = normalizeTextField(record["createdAt"]);
  const submittedByEmail = normalizeTextField(record["submittedByEmail"]);
  const requestType = record["requestType"];
  const subject = normalizeTextField(record["subject"]);
  const message = normalizeTextField(record["message"]);
  const pagePath = normalizeOptionalTextField(record["pagePath"]);
  const submittedByUserId = normalizeOptionalTextField(record["submittedByUserId"]);
  const source = "contact_page";
  const status = normalizeContactRequestStatus(record["status"]);
  const notificationError = normalizeOptionalTextField(record["notificationError"]);

  if (
    !id ||
    !createdAt ||
    !submittedByEmail ||
    !subject ||
    !message ||
    !isContactRequestType(requestType)
  ) {
    return null;
  }

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByEmail,
    requestType,
    subject,
    message,
    pagePath,
    source,
    status,
    notificationError,
  };
}

function fromSupabaseRow(row: Record<string, unknown>): ContactRequestRecord | null {
  return normalizeContactRequest({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByEmail: row.submitted_by_email,
    requestType: row.request_type,
    subject: row.subject,
    message: row.message,
    pagePath: row.page_path,
    status: row.status,
    notificationError: row.notification_error,
  });
}

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizeContactRequest);
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}

function toSupabaseRow(record: ContactRequestRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    submitted_by_email: record.submittedByEmail,
    request_type: record.requestType,
    subject: record.subject,
    message: record.message,
    page_path: record.pagePath,
    source: record.source,
    status: record.status,
    notification_error: record.notificationError,
  };
}

export async function appendContactRequest(params: {
  submittedByUserId: string | null;
  input: ContactRequestInput;
}): Promise<ContactRequestRecord> {
  assertPersistenceAvailable("contact_requests");

  const record: ContactRequestRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    submittedByEmail: params.input.submittedByEmail,
    requestType: params.input.requestType,
    subject: params.input.subject,
    message: params.input.message,
    pagePath: params.input.pagePath ?? null,
    source: "contact_page",
    status: "queued",
    notificationError: null,
  };

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient(true)
      .from("contact_requests")
      .insert(toSupabaseRow(record))
      .select(SUPABASE_CONTACT_REQUEST_COLUMNS)
      .single();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const persisted = fromSupabaseRow(result.data as Record<string, unknown>);
    return requirePersistedRecord(persisted, "Supabase returned an invalid contact request.");
  }

  const store = await readStore();
  const records = prependBoundedRecord(record, store.records);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function updateContactRequestStatus(params: {
  requestId: string;
  status: ContactRequestStatus;
  notificationError?: string | null;
}): Promise<ContactRequestRecord | null> {
  assertPersistenceAvailable("contact_requests");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("contact_requests")
        .update({
          status: params.status,
          notification_error: params.notificationError ?? null,
        })
        .eq("id", params.requestId)
        .select(SUPABASE_CONTACT_REQUEST_COLUMNS)
        .maybeSingle(),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  const replacement = replaceRecordInList(
    store.records,
    (record) => record.id === params.requestId,
    (current) => ({
      ...current,
      status: params.status,
      notificationError: params.notificationError ?? null,
    }),
  );
  if (!replacement) return null;
  await writeStore({ updatedAt: new Date().toISOString(), records: replacement.records });
  return replacement.record;
}
