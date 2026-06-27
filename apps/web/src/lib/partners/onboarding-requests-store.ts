import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";
import {
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";
import { appendPublishedPartnerAnnuaireEntry } from "./published-annuaire-entries-store";
import {
  deleteSupabaseMirror,
  upsertSupabaseMirror,
} from "@/lib/supabase/mirror";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "partner_onboarding_requests.json",
);

export type PartnerOnboardingRequestRecord = PartnerOnboardingRequestInput & {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  submittedByEmail: string | null;
  status: "pending_admin_review" | "accepted" | "rejected";
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
};

type StorePayload = {
  updatedAt: string;
  records: PartnerOnboardingRequestRecord[];
};

function emptyStore(): StorePayload {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

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
        .map((record) => normalizeStoredPartnerOnboardingRequest(record as Record<string, unknown>))
        .filter((record): record is PartnerOnboardingRequestRecord => Boolean(record)),
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

function toSupabaseRow(record: PartnerOnboardingRequestRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: record.createdAt,
    submitted_by_user_id: record.submittedByUserId,
    submitted_by_email: record.submittedByEmail,
    organization_name: record.organizationName,
    organization_type: record.organizationType,
    partner_scope: record.partnerScope,
    legal_identity: record.legalIdentity,
    coverage: record.coverage,
    contribution_types: record.contributionTypes,
    relay_actions: record.relayActions,
    availability: record.availability,
    contact_name: record.contactName,
    contact_channel: record.contactChannel,
    contact_details: record.contactDetails,
    motivation: record.motivation,
    status: record.status,
    creator_state: record.creatorState,
  };
}

export async function appendPartnerOnboardingRequest(params: {
  submittedByUserId: string;
  submittedByEmail?: string | null;
  input: PartnerOnboardingRequestInput;
}): Promise<PartnerOnboardingRequestRecord> {
  assertPersistenceAvailable("partner_onboarding_requests");

  const record: PartnerOnboardingRequestRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    submittedByEmail: params.submittedByEmail ?? null,
    status: "pending_admin_review",
    creatorState: "pending",
    ...params.input,
  };

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 2000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror(
    "partner_onboarding_requests",
    toSupabaseRow(record),
  ).catch((error) => {
    console.warn("Partner onboarding Supabase sync failed", error);
  });

  try {
    await appendPublishedPartnerAnnuaireEntry({
      requestId: record.id,
      request: params.input,
    });
  } catch (error) {
    console.warn("Published partner annuaire entry creation failed", error);
  }

  return record;
}

export async function listPartnerOnboardingRequests(
  limit = 100,
): Promise<PartnerOnboardingRequestRecord[]> {
  assertPersistenceAvailable("partner_onboarding_requests");

  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const store = await readStore();
  return store.records.slice(0, normalizedLimit);
}

export async function countPartnerOnboardingRequests(): Promise<number> {
  assertPersistenceAvailable("partner_onboarding_requests");
  const store = await readStore();
  return store.records.length;
}

export async function updatePartnerOnboardingRequestStatus(params: {
  requestId: string;
  status: "pending_admin_review" | "accepted" | "rejected";
}): Promise<PartnerOnboardingRequestRecord | null> {
  assertPersistenceAvailable("partner_onboarding_requests");
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
  await upsertSupabaseMirror(
    "partner_onboarding_requests",
    toSupabaseRow(updated),
  ).catch((error) => {
    console.warn("Partner onboarding Supabase sync failed", error);
  });
  return updated;
}

export async function updatePartnerOnboardingRequestCreatorState(params: {
  requestId: string;
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
}): Promise<PartnerOnboardingRequestRecord | null> {
  assertPersistenceAvailable("partner_onboarding_requests");
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
    creatorState: params.creatorState,
  };

  const records = [...store.records];
  records[index] = updated;
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await upsertSupabaseMirror(
    "partner_onboarding_requests",
    toSupabaseRow(updated),
  ).catch((error) => {
    console.warn("Partner onboarding Supabase sync failed", error);
  });
  return updated;
}

export async function deletePartnerOnboardingRequest(
  requestId: string,
): Promise<boolean> {
  assertPersistenceAvailable("partner_onboarding_requests");
  const store = await readStore();
  const records = store.records.filter((record) => record.id !== requestId);
  if (records.length === store.records.length) {
    return false;
  }
  await writeStore({ updatedAt: new Date().toISOString(), records });
  await deleteSupabaseMirror("partner_onboarding_requests", requestId).catch(
    (error) => {
      console.warn("Partner onboarding Supabase delete sync failed", error);
    },
  );
  return true;
}
