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
  status: "pending_admin_review" | "accepted" | "rejected";
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

export function normalizeStoredPartnerOnboardingRequest(
  record: Record<string, unknown>,
): PartnerOnboardingRequestRecord | null {
  const id = typeof record.id === "string" ? record.id : "";
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
  const submittedByUserId =
    typeof record.submittedByUserId === "string" ? record.submittedByUserId : "";
  const status =
    record.status === "accepted" || record.status === "rejected"
      ? record.status
      : "pending_admin_review";

  const organizationName =
    typeof record.organizationName === "string" ? record.organizationName : "";
  const organizationType = record.organizationType;
  const legalIdentity =
    typeof record.legalIdentity === "string" ? record.legalIdentity : "";
  const contributionTypes = Array.isArray(record.contributionTypes)
    ? record.contributionTypes.filter(
        (item): item is PartnerOnboardingRequestInput["contributionTypes"][number] =>
          item === "materiel" ||
          item === "logistique" ||
          item === "accueil" ||
          item === "financement" ||
          item === "communication",
      )
    : [];

  if (
    !id ||
    !createdAt ||
    !submittedByUserId ||
    !organizationName ||
    !legalIdentity ||
    (organizationType !== "association" &&
      organizationType !== "commerce" &&
      organizationType !== "entreprise" &&
      organizationType !== "collectif") ||
    contributionTypes.length === 0
  ) {
    return null;
  }

  const coverage = normalizePartnerCoverage(record.coverage);
  const availability = normalizePartnerAvailability(record.availability);

  return {
    id,
    createdAt,
    submittedByUserId,
    status,
    organizationName,
    organizationType,
    legalIdentity,
    coverage,
    contributionTypes,
    availability,
    contactName: typeof record.contactName === "string" ? record.contactName : "",
    contactChannel: typeof record.contactChannel === "string" ? record.contactChannel : "",
    contactDetails: typeof record.contactDetails === "string" ? record.contactDetails : "",
    motivation: typeof record.motivation === "string" ? record.motivation : "",
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

export async function appendPartnerOnboardingRequest(params: {
  submittedByUserId: string;
  input: PartnerOnboardingRequestInput;
}): Promise<PartnerOnboardingRequestRecord> {
  assertPersistenceAvailable("partner_onboarding_requests");

  const record: PartnerOnboardingRequestRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    status: "pending_admin_review",
    ...params.input,
  };

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 2000);
  await writeStore({ updatedAt: new Date().toISOString(), records });

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
