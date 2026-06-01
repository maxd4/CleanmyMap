import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";
import {
  deleteSupabaseMirror,
  upsertSupabaseMirror,
} from "@/lib/supabase/mirror";

export type ContactRequestType = "access" | "rectification" | "erasure" | "portability" | "other";
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

function emptyStore(): StorePayload {
  return { updatedAt: new Date().toISOString(), records: [] };
}

function normalizeContactRequest(record: Record<string, unknown>): ContactRequestRecord | null {
  const id = typeof record["id"] === "string" ? record["id"] : "";
  const createdAt = typeof record["createdAt"] === "string" ? record["createdAt"] : "";
  const submittedByEmail =
    typeof record["submittedByEmail"] === "string" ? record["submittedByEmail"] : "";
  const requestType = record["requestType"];
  const subject = typeof record["subject"] === "string" ? record["subject"] : "";
  const message = typeof record["message"] === "string" ? record["message"] : "";
  const pagePath = typeof record["pagePath"] === "string" ? record["pagePath"] : null;
  const submittedByUserId =
    typeof record["submittedByUserId"] === "string" ? record["submittedByUserId"] : null;
  const source = record["source"] === "contact_page" ? "contact_page" : "contact_page";
  const status =
    record["status"] === "queued" ||
    record["status"] === "sent" ||
    record["status"] === "failed"
      ? record["status"]
      : "queued";
  const notificationError =
    typeof record["notificationError"] === "string" ? record["notificationError"] : null;

  if (
    !id ||
    !createdAt ||
    !submittedByEmail ||
    !subject ||
    !message ||
    (requestType !== "access" &&
      requestType !== "rectification" &&
      requestType !== "erasure" &&
      requestType !== "portability" &&
      requestType !== "other")
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
        .map((record) => normalizeContactRequest(record as Record<string, unknown>))
        .filter((record): record is ContactRequestRecord => Boolean(record)),
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

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 2000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror("contact_requests", toSupabaseRow(record)).catch((error) => {
    console.warn("Contact request Supabase sync failed", error);
  });

  return record;
}

export async function updateContactRequestStatus(params: {
  requestId: string;
  status: ContactRequestStatus;
  notificationError?: string | null;
}): Promise<ContactRequestRecord | null> {
  assertPersistenceAvailable("contact_requests");
  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.requestId);
  if (index < 0) {
    return null;
  }

  const current = store.records[index];
  if (!current) {
    return null;
  }

  const updated: ContactRequestRecord = {
    ...current,
    status: params.status,
    notificationError: params.notificationError ?? null,
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror("contact_requests", toSupabaseRow(updated)).catch((error) => {
    console.warn("Contact request Supabase sync failed", error);
  });
  return updated;
}

export async function deleteContactRequest(requestId: string): Promise<boolean> {
  assertPersistenceAvailable("contact_requests");
  const store = await readStore();
  const nextRecords = store.records.filter((record) => record.id !== requestId);
  if (nextRecords.length === store.records.length) {
    return false;
  }

  await writeStore({ updatedAt: new Date().toISOString(), records: nextRecords });
  await deleteSupabaseMirror("contact_requests", requestId).catch((error) => {
    console.warn("Contact request Supabase delete sync failed", error);
  });
  return true;
}

