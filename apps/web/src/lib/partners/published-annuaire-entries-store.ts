import {
  normalizePublicWebUrl,
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";
import type {
  AssociationProfile,
  PublishedAnnuaireEntry,
} from "./annuaire-types";
import { buildPublishedPartnerAnnuaireEntry } from "./published-annuaire-entry-builder";
export { buildPublishedPartnerAnnuaireEntry } from "./published-annuaire-entry-builder";
import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
  readSupabaseRecord,
  readSupabaseRecords,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
} from "@/lib/persistence/local-record-store";

const STORE_FILE = `${process.cwd()}/data/local-db/published_partner_annuaire_entries.json`;
const SUPABASE_PUBLISHED_PARTNER_COLUMNS =
  "id, source_request_id, created_at, updated_at, published_at, publication_status, reviewed_at, reviewed_by_user_id, public_data, private_admin_contact";

export type PublishedPartnerAnnuaireEntry = PublishedAnnuaireEntry & {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fromSupabaseRow(row: Record<string, unknown>): PublishedPartnerAnnuaireEntry | null {
  if (!isRecord(row.public_data)) {
    return null;
  }

  return normalizePublishedRecord({
    ...row.public_data,
    id: row.id,
    sourceRequestId: row.source_request_id,
    source: "partner_onboarding",
    publishedAt: row.published_at,
    publicationStatus: row.publication_status,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    internalAdminContact: isRecord(row.private_admin_contact)
      ? row.private_admin_contact
      : undefined,
  });
}

export function serializePublishedPartnerAnnuaireEntry(
  record: PublishedPartnerAnnuaireEntry,
): {
  id: string;
  published_at: string;
  publication_status: PublishedPartnerAnnuaireEntry["publicationStatus"];
  public_data: Record<string, unknown>;
  private_admin_contact: Record<string, unknown>;
} {
  const {
    sourceRequestId,
    source,
    publishedAt,
    publicationStatus,
    reviewedAt,
    reviewedByUserId,
    internalAdminContact,
    ...publicData
  } = record;
  void sourceRequestId;
  void source;
  void reviewedAt;
  void reviewedByUserId;
  return {
    id: record.id,
    published_at: publishedAt,
    publication_status: publicationStatus,
    public_data: publicData,
    private_admin_contact: internalAdminContact ?? {},
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

function normalizeCoordinates(record: Record<string, unknown>): {
  lat: number | null;
  lng: number | null;
  coordinatesSource: "verified" | "derived_coverage" | "unknown";
} {
  const source =
    record.coordinatesSource === "verified" || record.coordinatesSource === "derived_coverage"
      ? record.coordinatesSource
      : "unknown";
  const lat = typeof record.lat === "number" ? record.lat : null;
  const lng = typeof record.lng === "number" ? record.lng : null;

  // A persisted coordinate without an explicit verification source is not a
  // safe public marker. Older rows used France/Paris centroids and are
  // intentionally hidden until an administrator provides precise evidence.
  if (source !== "verified" || lat === null || lng === null) {
    return { lat: null, lng: null, coordinatesSource: source };
  }

  return { lat, lng, coordinatesSource: source };
}

export function normalizePublishedRecord(
  record: PublishedPartnerAnnuaireEntry | Record<string, unknown>,
): PublishedPartnerAnnuaireEntry {
  const publicationStatus = normalizePublicationStatus(
    (record as { publicationStatus?: unknown }).publicationStatus,
  );
  const websiteUrl = normalizePublicWebUrl(
    (record as { websiteUrl?: unknown }).websiteUrl,
  );
  const instagramUrl = normalizePublicWebUrl(
    (record as { instagramUrl?: unknown }).instagramUrl,
  );
  const facebookUrl = normalizePublicWebUrl(
    (record as { facebookUrl?: unknown }).facebookUrl,
  );
  const primaryChannelUrl = normalizePublicWebUrl(
    (record as { primaryChannel?: { url?: unknown } | null }).primaryChannel?.url ?? null,
  );
  const initialAssociationProfile = normalizeAssociationProfile(
    (record as { associationProfile?: unknown }).associationProfile,
  );
  const normalizedRecord = removeDemonstrablySyntheticActivity(record, initialAssociationProfile);
  const associationProfile = normalizeAssociationProfile(normalizedRecord.associationProfile);
  const coordinates = normalizeCoordinates(record as Record<string, unknown>);
  return {
    ...normalizedRecord,
    ...coordinates,
    provenance: "published_partner",
    websiteUrl: websiteUrl ?? undefined,
    instagramUrl: instagramUrl ?? undefined,
    facebookUrl: facebookUrl ?? undefined,
    associationProfile,
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

const SYNTHETIC_IMPACT_NOTE = "Historique d'impact à compléter après validation.";

function removeDemonstrablySyntheticActivity(
  record: PublishedPartnerAnnuaireEntry | Record<string, unknown>,
  associationProfile: AssociationProfile | undefined,
): Record<string, unknown> {
  const normalizedRecord = { ...record } as Record<string, unknown>;
  const publishedAt = typeof normalizedRecord.publishedAt === "string"
    ? normalizedRecord.publishedAt
    : undefined;
  const recentActivityAt = typeof normalizedRecord.recentActivityAt === "string"
    ? normalizedRecord.recentActivityAt
    : undefined;

  // The old builder copied publishedAt into recentActivityAt. Equality is
  // sufficient evidence that this legacy value was generated, not observed.
  if (publishedAt && recentActivityAt === publishedAt) {
    delete normalizedRecord.recentActivityAt;
  }

  if (!associationProfile) return normalizedRecord;
  const impactHistory = associationProfile.impactHistory;
  if (!impactHistory || impactHistory.provenance?.source?.trim()) return normalizedRecord;

  const normalizedProfile = { ...associationProfile } as Record<string, unknown>;
  const impactNote = typeof impactHistory.note === "string" ? impactHistory.note.trim() : "";
  const impactWasGenerated = impactNote === SYNTHETIC_IMPACT_NOTE;
  const lastActionWasGenerated = Boolean(
    publishedAt && impactHistory.lastActionAt === publishedAt,
  );

  if (impactWasGenerated) {
    // Preserve an explicitly measured numeric count, including zero. The
    // surrounding generated projection is not evidence and is dropped only
    // when its artificial origin is explicit in the persisted note.
    if (typeof impactHistory.actionCount === "number") {
      normalizedProfile.impactHistory = {
        actionCount: impactHistory.actionCount,
        note: impactHistory.note,
      };
    } else {
      delete normalizedProfile.impactHistory;
    }
  } else if (lastActionWasGenerated) {
    const normalizedImpact = { ...impactHistory };
    delete normalizedImpact.lastActionAt;
    normalizedProfile.impactHistory = normalizedImpact;
  }

  normalizedRecord.associationProfile = normalizedProfile;
  return normalizedRecord;
}

function normalizeAssociationProfile(value: unknown): AssociationProfile | undefined {
  if (!isRecord(value)) return undefined;
  const resources = Array.isArray(value.usefulResources)
    ? value.usefulResources.filter((resource) => {
        if (!isRecord(resource)) return false;
        const label = typeof resource.label === "string" ? resource.label : "";
        const url = typeof resource.url === "string" ? resource.url : "";
        return !/^contact direct$/i.test(label.trim()) && !/^(mailto:|tel:)/i.test(url.trim());
      })
    : value.usefulResources;
  return {
    ...value,
    ...(Array.isArray(resources) ? { usefulResources: resources } : {}),
  } as AssociationProfile;
}

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizePublishedRecord);
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
}

export async function appendPublishedPartnerAnnuaireEntry(params: {
  request: PartnerOnboardingRequestInput;
  requestId: string;
}): Promise<PublishedPartnerAnnuaireEntry> {
  assertPersistenceAvailable("published_partner_annuaire_entries");
  const record = buildPublishedPartnerAnnuaireEntry(params);

  if (canUseSupabaseServerPersistence()) {
    const serialized = serializePublishedPartnerAnnuaireEntry(record);
    const supabase = getSupabaseServerClient(true);
    const inserted = await supabase
      .from("partner_annuaire_entries")
      .insert({ ...serialized, source_request_id: params.requestId })
      .select(SUPABASE_PUBLISHED_PARTNER_COLUMNS)
      .maybeSingle();
    if (inserted.error && inserted.error.code !== "23505") {
      throw new Error(inserted.error.message);
    }

    const persisted = inserted.data
      ? fromSupabaseRow(inserted.data as Record<string, unknown>)
      : await readSupabaseRecord(
          supabase
            .from("partner_annuaire_entries")
            .select(SUPABASE_PUBLISHED_PARTNER_COLUMNS)
            .eq("source_request_id", params.requestId)
            .maybeSingle(),
          fromSupabaseRow,
        );
    if (!persisted) throw new Error("Supabase returned no partner annuaire entry.");
    return persisted;
  }

  const store = await readStore();
  const existing = store.records.find((candidate) => candidate.sourceRequestId === params.requestId);
  if (existing) return existing;
  const records = [record, ...store.records];
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function listPublishedPartnerAnnuaireEntries(params: {
  publicationStatus?: PublishedPartnerAnnuaireEntry["publicationStatus"];
} = {}): Promise<
  PublishedPartnerAnnuaireEntry[]
> {
  assertPersistenceAvailable("published_partner_annuaire_entries");

  if (canUseSupabaseServerPersistence()) {
    let query = getSupabaseServerClient(true)
        .from("partner_annuaire_entries")
        .select(SUPABASE_PUBLISHED_PARTNER_COLUMNS)
        .order("published_at", { ascending: false });
    if (params.publicationStatus) {
      query = query.eq("publication_status", params.publicationStatus);
    }
    return readSupabaseRecords(
      query.limit(500),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  const records = params.publicationStatus
    ? store.records.filter((record) => record.publicationStatus === params.publicationStatus)
    : store.records;
  return records.slice(0, 500);
}

export async function getPublishedPartnerAnnuaireEntryById(
  entryId: string,
): Promise<PublishedPartnerAnnuaireEntry | null> {
  assertPersistenceAvailable("published_partner_annuaire_entries");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecord(
      getSupabaseServerClient(true)
        .from("partner_annuaire_entries")
        .select(SUPABASE_PUBLISHED_PARTNER_COLUMNS)
        .eq("id", entryId)
        .maybeSingle(),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  return store.records.find((record) => record.id === entryId) ?? null;
}

export async function updatePublishedPartnerAnnuaireEntryPublicationStatus(params: {
  entryId: string;
  publicationStatus: "accepted" | "rejected";
  reviewedByUserId: string;
  operationId?: string;
  reason?: string;
}): Promise<PublishedPartnerAnnuaireEntry | null> {
  assertPersistenceAvailable("published_partner_annuaire_entries");

  if (canUseSupabaseServerPersistence()) {
    const result = await getSupabaseServerClient(true).rpc(
      "review_partner_publication",
      {
        p_entry_id: params.entryId,
        p_publication_status: params.publicationStatus,
        p_reviewed_by_user_id: params.reviewedByUserId,
        p_operation_id: params.operationId ?? `partner-review-${params.entryId}`,
        p_reason: params.reason ?? "Revue administrative partenaire",
      },
    );
    if (result.error) throw new Error(result.error.message);
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return row ? fromSupabaseRow(row as Record<string, unknown>) : null;
  }

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
