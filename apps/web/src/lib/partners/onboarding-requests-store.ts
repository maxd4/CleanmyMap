import { join } from "node:path";
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
  replaceAndPersistRecord,
} from "@/lib/persistence/runtime-store";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
} from "@/lib/persistence/local-record-store";
import {
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";
import {
  normalizePartnerOnboardingSupabaseRow,
  normalizeStoredPartnerOnboardingRequest,
} from "./onboarding-requests-normalization";
import type { PartnerOnboardingRequestRecord } from "./onboarding-requests-normalization";

export type { PartnerOnboardingRequestRecord } from "./onboarding-requests-normalization";
export { normalizeStoredPartnerOnboardingRequest } from "./onboarding-requests-normalization";
import {
  appendPublishedPartnerAnnuaireEntry,
  buildPublishedPartnerAnnuaireEntry,
  serializePublishedPartnerAnnuaireEntry,
} from "./published-annuaire-entries-store";
import {
  getSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  compareCreatorInboxRecordCursors,
  type CreatorInboxRecordCursor,
} from "@/lib/community/creator-inbox-pagination";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "partner_onboarding_requests.json",
);
const SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS =
  "id, created_at, submitted_by_user_id, submitted_by_email, idempotency_key, organization_name, organization_type, partner_scope, legal_identity, coverage, contribution_types, engagement_types, relay_actions, availability, contact_name, contact_channel, contact_details, motivation, public_website_url, public_website_consent, status, creator_state";

export class PartnerOnboardingIdempotencyConflictError extends Error {
  readonly code = "partner_onboarding_idempotency_conflict" as const;

  constructor() {
    super("The partner onboarding idempotency key was reused with a different payload.");
    this.name = "PartnerOnboardingIdempotencyConflictError";
  }
}

export type PartnerOnboardingAppendResult = {
  record: PartnerOnboardingRequestRecord;
  replayed: boolean;
};

type StorePayload = {
  updatedAt: string;
  records: PartnerOnboardingRequestRecord[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizeStoredPartnerOnboardingRequest);
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}

function canonicalizePartnerOnboardingRecord(
  record: Pick<PartnerOnboardingRequestRecord, "submittedByUserId" | "submittedByEmail" | "organizationName" | "organizationType" | "partnerScope" | "legalIdentity" | "coverage" | "contributionTypes" | "engagementTypes" | "relayActions" | "availability" | "contactName" | "contactChannel" | "contactDetails" | "motivation" | "publicWebsiteUrl" | "publicWebsiteConsent">,
): string {
  return JSON.stringify({
    submittedByUserId: record.submittedByUserId,
    submittedByEmail: record.submittedByEmail?.trim() || null,
    organizationName: record.organizationName.trim(),
    organizationType: record.organizationType,
    partnerScope: record.partnerScope,
    legalIdentity: record.legalIdentity.trim(),
    coverage: record.coverage,
    contributionTypes: record.contributionTypes,
    engagementTypes: record.engagementTypes ?? [],
    relayActions: record.relayActions.trim(),
    availability: record.availability,
    contactName: record.contactName.trim(),
    contactChannel: record.contactChannel.trim(),
    contactDetails: record.contactDetails.trim(),
    motivation: record.motivation.trim(),
    publicWebsiteUrl: record.publicWebsiteUrl ?? null,
    publicWebsiteConsent: record.publicWebsiteConsent === true,
  });
}

function assertSamePartnerOnboardingPayload(
  existing: PartnerOnboardingRequestRecord,
  candidate: PartnerOnboardingRequestRecord,
): void {
  if (
    canonicalizePartnerOnboardingRecord(existing) !==
    canonicalizePartnerOnboardingRecord(candidate)
  ) {
    throw new PartnerOnboardingIdempotencyConflictError();
  }
}

async function appendPartnerOnboardingRequestToSupabase(
  record: PartnerOnboardingRequestRecord,
  entry: ReturnType<typeof buildPublishedPartnerAnnuaireEntry>,
): Promise<PartnerOnboardingAppendResult> {
  const serializedEntry = serializePublishedPartnerAnnuaireEntry(entry);
  const rawResult: unknown = await getSupabaseServerClient(true).rpc(
    "create_partner_onboarding_request_with_annuaire",
    {
      p_request_id: record.id,
      p_entry_id: entry.id,
      p_created_at: record.createdAt,
      p_submitted_by_user_id: record.submittedByUserId,
      p_submitted_by_email: record.submittedByEmail,
      p_idempotency_key: record.idempotencyKey,
      p_organization_name: record.organizationName,
      p_organization_type: record.organizationType,
      p_partner_scope: record.partnerScope,
      p_legal_identity: record.legalIdentity,
      p_coverage: record.coverage,
      p_contribution_types: record.contributionTypes,
      p_relay_actions: record.relayActions,
      p_availability: record.availability,
      p_contact_name: record.contactName,
      p_contact_channel: record.contactChannel,
      p_contact_details: record.contactDetails,
      p_motivation: record.motivation,
      p_public_data: serializedEntry.public_data,
      p_private_admin_contact: {
        ...serializedEntry.private_admin_contact,
        publicWebsiteConsent: record.publicWebsiteConsent,
      },
    },
  );
  if (!isRecord(rawResult) || !("data" in rawResult) || !("error" in rawResult)) {
    throw new Error("Supabase returned an invalid partner onboarding response.");
  }
  if (rawResult.error) {
    const message = isRecord(rawResult.error) && typeof rawResult.error.message === "string"
      ? rawResult.error.message
      : "Partner onboarding RPC failed.";
    if (message.toLowerCase().includes("partner onboarding idempotency conflict")) {
      throw new PartnerOnboardingIdempotencyConflictError();
    }
    throw new Error(message);
  }
  const rpcRow = Array.isArray(rawResult.data) ? rawResult.data[0] : rawResult.data;
  if (!isRecord(rpcRow) || typeof rpcRow.request_id !== "string") {
    throw new Error("Supabase returned no partner onboarding request.");
  }
  const persisted = await persistSupabaseRecord(
    getSupabaseServerClient(true)
      .from("partner_onboarding_requests")
      .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
      .eq("id", rpcRow.request_id)
      .single(),
    normalizePartnerOnboardingSupabaseRow,
    "Supabase returned an invalid partner onboarding request.",
  );
  return {
    record: persisted,
    replayed: rpcRow.request_id !== record.id,
  };
}

export async function appendPartnerOnboardingRequestWithResult(params: {
  submittedByUserId: string;
  submittedByEmail?: string | null;
  input: PartnerOnboardingRequestInput;
  idempotencyKey?: string;
}): Promise<PartnerOnboardingAppendResult> {
  assertPersistenceAvailable("partner_onboarding_requests");

  const idempotencyKey = params.idempotencyKey?.trim() || `${params.submittedByUserId}:${randomUUID()}`;
  const requestId = randomUUID();
  const entry = buildPublishedPartnerAnnuaireEntry({
    request: params.input,
    requestId,
  });
  const record: PartnerOnboardingRequestRecord = {
    id: requestId,
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    submittedByEmail: params.submittedByEmail ?? null,
    idempotencyKey,
    status: "pending_admin_review",
    creatorState: "pending",
    ...params.input,
    publicWebsiteConsent: params.input.publicWebsiteConsent === true,
  };

  if (canUseSupabaseServerPersistence()) {
    return appendPartnerOnboardingRequestToSupabase(record, entry);
  } else {
    const store = await readStore();
    const existing = store.records.find(
      (candidate) =>
        candidate.idempotencyKey === record.idempotencyKey,
    );
    if (existing) {
      if (existing.submittedByUserId !== record.submittedByUserId) {
        throw new PartnerOnboardingIdempotencyConflictError();
      }
      assertSamePartnerOnboardingPayload(existing, record);
      await appendPublishedPartnerAnnuaireEntry({
        requestId: existing.id,
        request: existing,
      });
      return { record: existing, replayed: true };
    }
    const records = [record, ...store.records].slice(0, 2000);
    await writeStore({ updatedAt: new Date().toISOString(), records });
    // The request is retained if this fails; a later reconciliation can retry
    // the missing entry without changing its stable request id.
    await appendPublishedPartnerAnnuaireEntry({
      requestId: record.id,
      request: record,
    });
  }

  return { record, replayed: false };
}

export async function appendPartnerOnboardingRequest(params: {
  submittedByUserId: string;
  submittedByEmail?: string | null;
  input: PartnerOnboardingRequestInput;
  idempotencyKey?: string;
}): Promise<PartnerOnboardingRequestRecord> {
  return (await appendPartnerOnboardingRequestWithResult(params)).record;
}

export async function listPartnerOnboardingRequests(
  limit = 100,
  beforeCursor?: CreatorInboxRecordCursor | null,
): Promise<PartnerOnboardingRequestRecord[]> {
  assertPersistenceAvailable("partner_onboarding_requests");

  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    let query = getSupabaseServerClient(true)
        .from("partner_onboarding_requests")
        .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
    if (beforeCursor) {
      query = query.or(
        `created_at.lt.${beforeCursor.createdAt},and(created_at.eq.${beforeCursor.createdAt},id.lt.${beforeCursor.id})`,
      );
    }
    return readSupabaseRecords(query.limit(normalizedLimit), normalizePartnerOnboardingSupabaseRow);
  }

  const store = await readStore();
  const records = store.records
    .filter(
      (record) =>
        !beforeCursor ||
        compareCreatorInboxRecordCursors(record, beforeCursor) < 0,
    )
    .sort((left, right) => compareCreatorInboxRecordCursors(right, left))
    .slice(0, normalizedLimit);

  // Local fallback data predates the Supabase projection. Reconcile only the
  // missing projection, preserving every request id and decision.
  for (const record of records) {
    await appendPublishedPartnerAnnuaireEntry({
      requestId: record.id,
      request: record,
    });
  }
  return records;
}

export async function getPartnerOnboardingRequestById(
  requestId: string,
): Promise<PartnerOnboardingRequestRecord | null> {
  assertPersistenceAvailable("partner_onboarding_requests");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("partner_onboarding_requests")
        .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
        .eq("id", requestId)
        .maybeSingle(),
      normalizePartnerOnboardingSupabaseRow,
    );
  }

  const store = await readStore();
  return findRecordInList(store.records, (record) => record.id === requestId);
}

export async function countPartnerOnboardingRequests(): Promise<number> {
  assertPersistenceAvailable("partner_onboarding_requests");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient(true)
      .from("partner_onboarding_requests")
      .select("id", { count: "exact", head: true });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return Number(result.count ?? 0);
  }

  const store = await readStore();
  return store.records.length;
}

export async function updatePartnerOnboardingRequestStatus(params: {
  requestId: string;
  status: "pending_admin_review" | "accepted" | "rejected";
}): Promise<PartnerOnboardingRequestRecord | null> {
  assertPersistenceAvailable("partner_onboarding_requests");

  if (canUseSupabaseServerPersistence()) {
    const creatorState =
      params.status === "accepted"
        ? "accepted"
        : params.status === "rejected"
          ? "rejected"
          : "pending";
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("partner_onboarding_requests")
        .update({ status: params.status, creator_state: creatorState })
        .eq("id", params.requestId)
        .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
        .maybeSingle(),
      normalizePartnerOnboardingSupabaseRow,
    );
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

  const updated: PartnerOnboardingRequestRecord = {
    ...current,
    status: params.status,
    creatorState:
      params.status === "accepted"
        ? "accepted"
        : params.status === "rejected"
          ? "rejected"
          : "pending",
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return updated;
}

export async function updatePartnerOnboardingRequestCreatorState(params: {
  requestId: string;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
}): Promise<PartnerOnboardingRequestRecord | null> {
  assertPersistenceAvailable("partner_onboarding_requests");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("partner_onboarding_requests")
        .update({ creator_state: params.creatorState })
        .eq("id", params.requestId)
        .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
        .maybeSingle(),
      normalizePartnerOnboardingSupabaseRow,
    );
  }

  const store = await readStore();
  return replaceAndPersistRecord(
    store.records,
    (record) => record.id === params.requestId,
    (current) => ({ ...current, creatorState: params.creatorState }),
    (records) => writeStore({ updatedAt: new Date().toISOString(), records }),
  );
}

export async function deletePartnerOnboardingRequest(
  requestId: string,
): Promise<boolean> {
  assertPersistenceAvailable("partner_onboarding_requests");

  if (canUseSupabaseServerPersistence()) {
    return deleteSupabaseRecordById(getSupabaseServerClient(true), "partner_onboarding_requests", requestId);
  }

  const store = await readStore();
  return deleteAndPersistRecord(store.records, (record) => record.id === requestId, (records) => writeStore({ updatedAt: new Date().toISOString(), records }));
}
