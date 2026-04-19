import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "partner_onboarding_requests.json",
);

export type PartnerOnboardingRequestInput = {
  organizationName: string;
  organizationType: "association" | "commerce" | "entreprise" | "collectif";
  legalIdentity: string;
  coverage: string;
  contributionTypes: Array<
    "materiel" | "logistique" | "accueil" | "financement" | "communication"
  >;
  availability: string;
  contactName: string;
  contactChannel: string;
  contactDetails: string;
  motivation: string;
};

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
      records: parsed.records,
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
