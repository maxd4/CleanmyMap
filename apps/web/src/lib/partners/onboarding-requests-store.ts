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
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";
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
  "id, created_at, submitted_by_user_id, submitted_by_email, idempotency_key, organization_name, organization_type, partner_scope, legal_identity, coverage, contribution_types, relay_actions, availability, contact_name, contact_channel, contact_details, motivation, status, creator_state";

export type PartnerOnboardingRequestRecord = PartnerOnboardingRequestInput & {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  submittedByEmail: string | null;
  idempotencyKey?: string;
  status: "pending_admin_review" | "accepted" | "rejected";
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
};

type StorePayload = {
  updatedAt: string;
  records: PartnerOnboardingRequestRecord[];
};

function readStringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function readOptionalStringField(record: Record<string, unknown>, key: string): string | null {
  const value = readStringField(record, key);
  return value.trim().length > 0 ? value : null;
}

function isOrganizationType(
  value: unknown,
): value is PartnerOnboardingRequestInput["organizationType"] {
  return value === "association" || value === "commerce" || value === "entreprise" || value === "collectif";
}

function isContributionType(
  value: unknown,
): value is PartnerOnboardingRequestInput["contributionTypes"][number] {
  return (
    value === "materiel" ||
    value === "logistique" ||
    value === "accueil" ||
    value === "financement" ||
    value === "communication"
  );
}

function normalizeContributionTypes(
  rawValue: unknown,
): PartnerOnboardingRequestInput["contributionTypes"] {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.filter(isContributionType);
}

function normalizeCreatorState(
  rawValue: unknown,
  status: "pending_admin_review" | "accepted" | "rejected",
): PartnerOnboardingRequestRecord["creatorState"] {
  if (
    rawValue === "pending" ||
    rawValue === "responded" ||
    rawValue === "treated" ||
    rawValue === "archived" ||
    rawValue === "accepted" ||
    rawValue === "rejected"
  ) {
    return rawValue;
  }
  return status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "new";
}

export function normalizeStoredPartnerOnboardingRequest(
  record: Record<string, unknown>,
): PartnerOnboardingRequestRecord | null {
  const id = readStringField(record, "id");
  const createdAt = readStringField(record, "createdAt");
  const submittedByUserId = readStringField(record, "submittedByUserId");
  const submittedByEmail = readOptionalStringField(record, "submittedByEmail");
  const idempotencyKey = readOptionalStringField(record, "idempotencyKey") ?? undefined;
  const status =
    record["status"] === "accepted" || record["status"] === "rejected"
      ? record["status"]
      : "pending_admin_review";
  const creatorState = normalizeCreatorState(record["creatorState"], status);
  const organizationName = readStringField(record, "organizationName");
  const organizationType = record["organizationType"];
  const partnerScope =
    record["partnerScope"] === "national" || record["partnerScope"] === "france"
      ? record["partnerScope"]
      : "local";
  const legalIdentity = readStringField(record, "legalIdentity");
  const contributionTypes = normalizeContributionTypes(record["contributionTypes"]);

  if (
    !id ||
    !createdAt ||
    !submittedByUserId ||
    !organizationName ||
    !legalIdentity ||
    !isOrganizationType(organizationType) ||
    contributionTypes.length === 0
  ) {
    return null;
  }

  const coverage = normalizePartnerCoverage(record["coverage"]);
  const availability = normalizePartnerAvailability(record["availability"]);

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByEmail,
    idempotencyKey,
    status,
    organizationName,
    organizationType,
    partnerScope,
    legalIdentity,
    coverage,
    contributionTypes,
    relayActions: readStringField(record, "relayActions"),
    availability,
    contactName: readStringField(record, "contactName"),
    contactChannel: readStringField(record, "contactChannel"),
    contactDetails: readStringField(record, "contactDetails"),
    motivation: readStringField(record, "motivation"),
    creatorState,
  };
}

function fromSupabaseRow(
  row: Record<string, unknown>,
): PartnerOnboardingRequestRecord | null {
  return normalizeStoredPartnerOnboardingRequest({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByEmail: row.submitted_by_email,
    idempotencyKey: row.idempotency_key,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    partnerScope: row.partner_scope,
    legalIdentity: row.legal_identity,
    coverage: row.coverage,
    contributionTypes: row.contribution_types,
    relayActions: row.relay_actions,
    availability: row.availability,
    contactName: row.contact_name,
    contactChannel: row.contact_channel,
    contactDetails: row.contact_details,
    motivation: row.motivation,
    status: row.status,
    creatorState: row.creator_state,
  });
}

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizeStoredPartnerOnboardingRequest);
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}

export async function appendPartnerOnboardingRequest(params: {
  submittedByUserId: string;
  submittedByEmail?: string | null;
  input: PartnerOnboardingRequestInput;
  idempotencyKey?: string;
}): Promise<PartnerOnboardingRequestRecord> {
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
  };

  if (canUseSupabaseServerPersistence()) {
    const serializedEntry = serializePublishedPartnerAnnuaireEntry(entry);
    const result = await getSupabaseServerClient(true).rpc(
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
        p_private_admin_contact: serializedEntry.private_admin_contact,
      },
    );
    if (result.error) throw new Error(result.error.message);
    const rpcRow = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!rpcRow || typeof rpcRow.request_id !== "string") {
      throw new Error("Supabase returned no partner onboarding request.");
    }
    return persistSupabaseRecord(
      getSupabaseServerClient(true)
        .from("partner_onboarding_requests")
        .select(SUPABASE_PARTNER_ONBOARDING_REQUEST_COLUMNS)
        .eq("id", rpcRow.request_id)
        .single(),
      fromSupabaseRow,
      "Supabase returned an invalid partner onboarding request.",
    );
  } else {
    const store = await readStore();
    const existing = store.records.find(
      (candidate) =>
        candidate.submittedByUserId === record.submittedByUserId &&
        candidate.idempotencyKey === record.idempotencyKey,
    );
    if (existing) {
      await appendPublishedPartnerAnnuaireEntry({
        requestId: existing.id,
        request: existing,
      });
      return existing;
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

  return record;
}

/**
 * Rebuilds only the missing annuaire projection for an existing request.
 * It never changes the request status or deletes either side of the link.
 */
export async function reconcilePartnerOnboardingRequestAnnuaire(
  requestId: string,
): Promise<PartnerOnboardingRequestRecord | null> {
  const request = await getPartnerOnboardingRequestById(requestId);
  if (!request) return null;
  await appendPublishedPartnerAnnuaireEntry({
    requestId: request.id,
    request,
  });
  return request;
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
    return readSupabaseRecords(query.limit(normalizedLimit), fromSupabaseRow);
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
      fromSupabaseRow,
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
      fromSupabaseRow,
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
      fromSupabaseRow,
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
