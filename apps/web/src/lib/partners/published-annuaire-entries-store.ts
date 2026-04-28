import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  formatAvailabilitySummary,
  formatCoverageSummary,
  normalizePublicChannelUrl,
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  type PartnerOnboardingRequestInput,
  type ParisArrondissement,
} from "./onboarding-types";
import { getParisArrondissementCenter } from "@/lib/geo/paris-arrondissements";
import type { AnnuaireEntry } from "@/components/sections/rubriques/annuaire-map-canvas";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "published_partner_annuaire_entries.json",
);

export type PublishedPartnerAnnuaireEntry = AnnuaireEntry & {
  sourceRequestId: string;
  publishedAt: string;
  publicationStatus: "pending_admin_review" | "accepted" | "rejected";
  source: "partner_onboarding";
  reviewedAt?: string;
  reviewedByUserId?: string;
};

type StorePayload = {
  updatedAt: string;
  records: PublishedPartnerAnnuaireEntry[];
};

function emptyStore(): StorePayload {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

function normalizePublicationStatus(
  value: unknown,
): PublishedPartnerAnnuaireEntry["publicationStatus"] {
  if (value === "pending_admin_review" || value === "accepted" || value === "rejected") {
    return value;
  }
  if (value === "draft_published") {
    return "accepted";
  }
  return "accepted";
}

function normalizePublishedRecord(
  record: PublishedPartnerAnnuaireEntry | Record<string, unknown>,
): PublishedPartnerAnnuaireEntry {
  const publicationStatus = normalizePublicationStatus(
    (record as { publicationStatus?: unknown }).publicationStatus,
  );
  const websiteUrl = normalizePublicChannelUrl(
    (record as { websiteUrl?: unknown }).websiteUrl,
  );
  const instagramUrl = normalizePublicChannelUrl(
    (record as { instagramUrl?: unknown }).instagramUrl,
  );
  const facebookUrl = normalizePublicChannelUrl(
    (record as { facebookUrl?: unknown }).facebookUrl,
  );
  const primaryChannelUrl = normalizePublicChannelUrl(
    (record as { primaryChannel?: { url?: unknown } | null }).primaryChannel?.url ?? null,
  );
  return {
    ...record,
    websiteUrl: websiteUrl ?? undefined,
    instagramUrl: instagramUrl ?? undefined,
    facebookUrl: facebookUrl ?? undefined,
    primaryChannel: primaryChannelUrl
      ? {
          platform: "site web",
          label:
            typeof (record as { primaryChannel?: { label?: unknown } | null }).primaryChannel
              ?.label === "string"
              ? (record as { primaryChannel?: { label?: string } | null }).primaryChannel?.label
              : "Contact direct",
          url: primaryChannelUrl,
        }
      : undefined,
    publicationStatus,
    reviewedAt:
      typeof (record as { reviewedAt?: unknown }).reviewedAt === "string"
        ? (record as { reviewedAt?: string }).reviewedAt
        : undefined,
    reviewedByUserId:
      typeof (record as { reviewedByUserId?: unknown }).reviewedByUserId === "string"
        ? (record as { reviewedByUserId?: string }).reviewedByUserId
        : undefined,
  } as PublishedPartnerAnnuaireEntry;
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
      records: parsed.records.map((record) => normalizePublishedRecord(record)),
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

function averageParisCoordinates(arrondissements: number[]): {
  lat: number;
  lng: number;
} {
  if (arrondissements.length === 0) {
    return { lat: 48.8566, lng: 2.3522 };
  }
  const centers = arrondissements.map((item) =>
    getParisArrondissementCenter(item as ParisArrondissement),
  );
  const lat = centers.reduce((acc, item) => acc + item.lat, 0) / centers.length;
  const lng = centers.reduce((acc, item) => acc + item.lng, 0) / centers.length;
  return { lat, lng };
}

function normalizeContactUrl(
  contactChannel: string,
  contactDetails: string,
): string | null {
  const trimmedDetails = contactDetails.trim();
  if (/^https?:\/\//i.test(trimmedDetails)) {
    const normalized = normalizePublicChannelUrl(trimmedDetails);
    if (normalized) {
      return normalized;
    }
    return null;
  }
  if (/^mailto:/i.test(trimmedDetails) || /^tel:/i.test(trimmedDetails)) {
    return trimmedDetails;
  }
  if (
    /email|mail|courriel/i.test(contactChannel) ||
    trimmedDetails.includes("@")
  ) {
    return `mailto:${trimmedDetails}`;
  }
  if (/t[ée]l|phone|mobile/i.test(contactChannel) || (/^[+\d]/.test(trimmedDetails) && /^[\d\s().+-]+$/.test(trimmedDetails) && trimmedDetails.length <= 30)) {
    const digits = trimmedDetails.replace(/[^\d+]/g, "");
    return `tel:${digits}`;
  }
  return null;
}

function organizationTypesToEngagementTypes(
  organizationType: PartnerOnboardingRequestInput["organizationType"],
): AnnuaireEntry["types"] {
  if (organizationType === "commerce") {
    return ["social"];
  }
  if (organizationType === "entreprise") {
    return ["environnemental", "social"];
  }
  return ["social", "environnemental"];
}

function organizationTypeToKind(
  organizationType: PartnerOnboardingRequestInput["organizationType"],
): AnnuaireEntry["kind"] {
  if (organizationType === "association") {
    return "association";
  }
  if (organizationType === "commerce") {
    return "commerce";
  }
  if (organizationType === "entreprise") {
    return "entreprise";
  }
  return "groupe_parole";
}

export function buildPublishedPartnerAnnuaireEntry(params: {
  request: PartnerOnboardingRequestInput;
  requestId: string;
}): PublishedPartnerAnnuaireEntry {
  const coverage = normalizePartnerCoverage(params.request.coverage);
  const availability = normalizePartnerAvailability(params.request.availability);
  const arrondissements = coverage.arrondissements;
  const coordinates = averageParisCoordinates(arrondissements);
  const contactUrl = normalizeContactUrl(
    params.request.contactChannel,
    params.request.contactDetails,
  );
  const publicChannelUrl = contactUrl ? normalizePublicChannelUrl(contactUrl) : null;
  const websiteUrl = normalizePublicChannelUrl(params.request.contactDetails.trim());
  const nowIso = new Date().toISOString();

  return {
    id: `onboarded-${randomUUID()}`,
    sourceRequestId: params.requestId,
    source: "partner_onboarding",
    publicationStatus: "pending_admin_review",
    publishedAt: nowIso,
    name: params.request.organizationName,
    legalIdentity: params.request.legalIdentity,
    kind: organizationTypeToKind(params.request.organizationType),
    types: organizationTypesToEngagementTypes(params.request.organizationType),
    description: params.request.motivation.slice(0, 220),
    location: formatCoverageSummary(coverage),
    lat: coordinates.lat,
    lng: coordinates.lng,
    websiteUrl: websiteUrl ?? undefined,
    coveredArrondissements: arrondissements,
    contributionTypes: params.request.contributionTypes,
    availability: formatAvailabilitySummary(availability),
    primaryChannel: publicChannelUrl
      ? {
          platform: "site web",
          label: params.request.contactChannel.trim() || "Contact direct",
          url: publicChannelUrl,
        }
      : undefined,
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
    lastUpdatedAt: nowIso,
    recentActivityAt: nowIso,
    internalAdminContact: {
      referentName: params.request.contactName,
      email: params.request.contactDetails.includes("@")
        ? params.request.contactDetails
        : "non communiqué",
      phone: params.request.contactDetails.includes("@")
        ? "non communiqué"
        : params.request.contactDetails,
    },
  };
}

export async function appendPublishedPartnerAnnuaireEntry(params: {
  request: PartnerOnboardingRequestInput;
  requestId: string;
}): Promise<PublishedPartnerAnnuaireEntry> {
  assertPersistenceAvailable("published_partner_annuaire_entries");
  const record = buildPublishedPartnerAnnuaireEntry(params);
  const store = await readStore();
  const records = [record, ...store.records].slice(0, 500);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function listPublishedPartnerAnnuaireEntries(): Promise<
  PublishedPartnerAnnuaireEntry[]
> {
  assertPersistenceAvailable("published_partner_annuaire_entries");
  const store = await readStore();
  return store.records;
}

export async function updatePublishedPartnerAnnuaireEntryPublicationStatus(params: {
  entryId: string;
  publicationStatus: "accepted" | "rejected";
  reviewedByUserId: string;
}): Promise<PublishedPartnerAnnuaireEntry | null> {
  assertPersistenceAvailable("published_partner_annuaire_entries");
  const store = await readStore();
  const nowIso = new Date().toISOString();
  let updatedEntry: PublishedPartnerAnnuaireEntry | null = null;
  const records = store.records.map((record) => {
    if (record.id !== params.entryId) {
      return record;
    }
    updatedEntry = {
      ...record,
      publicationStatus: params.publicationStatus,
      verificationStatus:
        params.publicationStatus === "accepted" ? "verifie" : "a_revalider",
      reviewedAt: nowIso,
      reviewedByUserId: params.reviewedByUserId,
    };
    return updatedEntry;
  });

  if (!updatedEntry) {
    return null;
  }

  await writeStore({ updatedAt: nowIso, records });
  return updatedEntry;
}
