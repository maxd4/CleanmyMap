import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import type { AppProfile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PromotionRequestTargetRole = "elu" | "admin";

export type PromotionRequestRecord = {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  submittedByDisplayName: string;
  submittedByEmail: string | null;
  submittedByRole: AppProfile;
  requestedRole: PromotionRequestTargetRole;
  motivation: string;
  status: "pending_owner_review" | "accepted" | "rejected";
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByRole: AppProfile | null;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
};

export type PromotionRequestInput = {
  submittedByDisplayName: string;
  submittedByEmail?: string | null;
  submittedByRole: AppProfile;
  requestedRole: PromotionRequestTargetRole;
  motivation: string;
};

type StorePayload = {
  updatedAt: string;
  records: PromotionRequestRecord[];
};

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "promotion_requests.json",
);
const SUPABASE_PROMOTION_REQUEST_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_display_name, submitted_by_email, submitted_by_role, requested_role, motivation, status, reviewed_at, reviewed_by_user_id, reviewed_by_role, creator_state";

function emptyStore(): StorePayload {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

function normalizeRecord(record: Record<string, unknown>): PromotionRequestRecord | null {
  const id = typeof record["id"] === "string" ? record["id"] : "";
  const createdAt = typeof record["createdAt"] === "string" ? record["createdAt"] : "";
  const submittedByUserId =
    typeof record["submittedByUserId"] === "string" ? record["submittedByUserId"] : "";
  const submittedByDisplayName =
    typeof record["submittedByDisplayName"] === "string"
      ? record["submittedByDisplayName"]
      : "";
  const submittedByEmail =
    typeof record["submittedByEmail"] === "string" && record["submittedByEmail"].trim().length > 0
      ? record["submittedByEmail"]
      : null;
  const submittedByRole =
    typeof record["submittedByRole"] === "string" ? record["submittedByRole"] : "";
  const requestedRole = record["requestedRole"];
  const motivation = typeof record["motivation"] === "string" ? record["motivation"] : "";
  const status =
    record["status"] === "accepted" || record["status"] === "rejected"
      ? record["status"]
      : "pending_owner_review";
  const creatorState =
    record["creatorState"] === "pending" ||
    record["creatorState"] === "responded" ||
    record["creatorState"] === "treated" ||
    record["creatorState"] === "archived" ||
    record["creatorState"] === "accepted" ||
    record["creatorState"] === "rejected"
      ? record["creatorState"]
      : status === "accepted"
        ? "accepted"
        : status === "rejected"
          ? "rejected"
          : "new";
  const reviewedAt =
    typeof record["reviewedAt"] === "string" ? record["reviewedAt"] : null;
  const reviewedByUserId =
    typeof record["reviewedByUserId"] === "string" ? record["reviewedByUserId"] : null;
  const reviewedByRole =
    typeof record["reviewedByRole"] === "string" ? record["reviewedByRole"] : null;

  if (
    !id ||
    !createdAt ||
    !submittedByUserId ||
    !submittedByDisplayName ||
    !motivation ||
    (submittedByRole !== "benevole" &&
      submittedByRole !== "coordinateur" &&
      submittedByRole !== "scientifique" &&
      submittedByRole !== "elu" &&
      submittedByRole !== "admin" &&
      submittedByRole !== "max") ||
    (requestedRole !== "elu" && requestedRole !== "admin")
  ) {
    return null;
  }

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByDisplayName,
    submittedByEmail,
    submittedByRole,
    requestedRole,
    motivation,
    status,
    reviewedAt,
    reviewedByUserId,
    reviewedByRole:
      reviewedByRole === "benevole" ||
      reviewedByRole === "coordinateur" ||
      reviewedByRole === "scientifique" ||
      reviewedByRole === "elu" ||
      reviewedByRole === "admin" ||
      reviewedByRole === "max"
        ? reviewedByRole
        : null,
    creatorState,
  };
}

function fromSupabaseRow(row: Record<string, unknown>): PromotionRequestRecord | null {
  return normalizeRecord({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByDisplayName: row.submitted_by_display_name,
    submittedByEmail: row.submitted_by_email,
    submittedByRole: row.submitted_by_role,
    requestedRole: row.requested_role,
    motivation: row.motivation,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedByRole: row.reviewed_by_role,
    creatorState: row.creator_state,
  });
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
        .map((record) => normalizeRecord(record as Record<string, unknown>))
        .filter((record): record is PromotionRequestRecord => Boolean(record)),
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

function toSupabaseRow(record: PromotionRequestRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    submitted_by_display_name: record.submittedByDisplayName,
    submitted_by_email: record.submittedByEmail,
    submitted_by_role: record.submittedByRole,
    requested_role: record.requestedRole,
    motivation: record.motivation,
    status: record.status,
    reviewed_at: record.reviewedAt,
    reviewed_by_user_id: record.reviewedByUserId,
    reviewed_by_role: record.reviewedByRole,
    creator_state: record.creatorState,
  };
}

export async function appendPromotionRequest(params: {
  submittedByUserId: string;
  input: PromotionRequestInput;
}): Promise<PromotionRequestRecord> {
  assertPersistenceAvailable("promotion_requests");

  const record: PromotionRequestRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    submittedByDisplayName: params.input.submittedByDisplayName,
    submittedByEmail: params.input.submittedByEmail ?? null,
    submittedByRole: params.input.submittedByRole,
    requestedRole: params.input.requestedRole,
    motivation: params.input.motivation,
    status: "pending_owner_review",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewedByRole: null,
    creatorState: "pending",
  };

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .insert(toSupabaseRow(record))
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .single();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const persisted = fromSupabaseRow(result.data as Record<string, unknown>);
    if (!persisted) {
      throw new Error("Supabase returned an invalid promotion request.");
    }
    return persisted;
  }

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 2000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function listPromotionRequests(
  limit = 100,
): Promise<PromotionRequestRecord[]> {
  assertPersistenceAvailable("promotion_requests");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data ?? [])
      .map((row) => fromSupabaseRow(row as Record<string, unknown>))
      .filter((record): record is PromotionRequestRecord => Boolean(record));
  }

  const store = await readStore();
  return store.records.slice(0, normalizedLimit);
}

/**
 * Current-user projection source. The user id is always bound at the store
 * boundary so callers cannot accidentally turn a global admin read into a
 * user-facing read.
 */
export async function listPromotionRequestsForUser(
  submittedByUserId: string,
  limit = 100,
): Promise<PromotionRequestRecord[]> {
  assertPersistenceAvailable("promotion_requests");
  const normalizedUserId = submittedByUserId.trim();
  if (!normalizedUserId) {
    return [];
  }
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .eq("submitted_by_user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(normalizedLimit);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data ?? [])
      .map((row) => fromSupabaseRow(row as Record<string, unknown>))
      .filter((record): record is PromotionRequestRecord => Boolean(record));
  }

  const store = await readStore();
  return store.records
    .filter((record) => record.submittedByUserId === normalizedUserId)
    .slice(0, normalizedLimit);
}

export async function updatePromotionRequestStatus(params: {
  requestId: string;
  status: "accepted" | "rejected";
  reviewedByUserId: string;
  reviewedByRole: AppProfile;
}): Promise<PromotionRequestRecord | null> {
  assertPersistenceAvailable("promotion_requests");

  if (canUseSupabaseServerPersistence()) {
    const reviewedAt = new Date().toISOString();
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .update({
        status: params.status,
        reviewed_at: reviewedAt,
        reviewed_by_user_id: params.reviewedByUserId,
        reviewed_by_role: params.reviewedByRole,
        creator_state: params.status,
      })
      .eq("id", params.requestId)
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data
      ? fromSupabaseRow(result.data as Record<string, unknown>)
      : null;
  }

  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.requestId);
  if (index < 0) {
    return null;
  }

  const current = store.records[index];
  if (!current) {
    return null;
  }

  const updated: PromotionRequestRecord = {
    ...current,
    status: params.status,
    reviewedAt: new Date().toISOString(),
    reviewedByUserId: params.reviewedByUserId,
    reviewedByRole: params.reviewedByRole,
    creatorState: params.status,
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return updated;
}

export async function updatePromotionRequestCreatorState(params: {
  requestId: string;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
}): Promise<PromotionRequestRecord | null> {
  assertPersistenceAvailable("promotion_requests");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .update({ creator_state: params.creatorState })
      .eq("id", params.requestId)
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data
      ? fromSupabaseRow(result.data as Record<string, unknown>)
      : null;
  }

  const store = await readStore();
  const index = store.records.findIndex((record) => record.id === params.requestId);
  if (index < 0) {
    return null;
  }

  const current = store.records[index];
  if (!current) {
    return null;
  }

  const updated: PromotionRequestRecord = {
    ...current,
    creatorState: params.creatorState,
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return updated;
}

export async function getPromotionRequestById(
  requestId: string,
): Promise<PromotionRequestRecord | null> {
  assertPersistenceAvailable("promotion_requests");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .select(SUPABASE_PROMOTION_REQUEST_COLUMNS)
      .eq("id", requestId)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.data
      ? fromSupabaseRow(result.data as Record<string, unknown>)
      : null;
  }

  const store = await readStore();
  return store.records.find((record) => record.id === requestId) ?? null;
}

export async function deletePromotionRequest(
  requestId: string,
): Promise<boolean> {
  assertPersistenceAvailable("promotion_requests");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient()
      .from("promotion_requests")
      .delete()
      .eq("id", requestId)
      .select("id");
    if (result.error) {
      throw new Error(result.error.message);
    }
    return (result.data ?? []).length > 0;
  }

  const store = await readStore();
  const records = store.records.filter((record) => record.id !== requestId);
  if (records.length === store.records.length) {
    return false;
  }
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return true;
}
