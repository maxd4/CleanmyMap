import { randomUUID } from "node:crypto";
import {
  formatAvailabilitySummary,
  formatCoverageSummary,
  formatPartnerScopeLabel,
  normalizePublicChannelUrl,
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  type PartnerOnboardingRequestInput,
  type ParisArrondissement,
} from "./onboarding-types";
import { getParisArrondissementCenter } from "@/lib/geo/paris-arrondissements";
import type {
  AnnuaireEntry,
  AssociationProfile,
  AssociationPublicCall,
  AssociationResource,
  PublishedAnnuaireEntry,
} from "./annuaire-types";
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
    provenance: "published_partner",
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

async function readStore(): Promise<StorePayload> {
  return readLocalRecordStore(STORE_FILE, normalizePublishedRecord);
}

async function writeStore(store: StorePayload): Promise<void> {
  await writeLocalRecordStore(STORE_FILE, store.records);
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

function franceCenterCoordinates(): { lat: number; lng: number } {
  return { lat: 46.603354, lng: 1.888334 };
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

function buildAssociationPublicCalls(
  contributionTypes: PartnerOnboardingRequestInput["contributionTypes"],
  relayActions: string,
): AssociationPublicCall[] {
  const calls: AssociationPublicCall[] = contributionTypes.map((type) => {
    if (type === "materiel") {
      return {
        type: "materiel",
        label: "Appel à matériel",
        detail: "Prêt, don ou mise à disposition d'équipements utiles au terrain.",
      };
    }
    if (type === "financement") {
      return {
        type: "dons",
        label: "Appel aux dons",
        detail: "Soutien financier pour consolider les actions locales.",
      };
    }
    if (type === "communication") {
      return {
        type: "communication",
        label: "Relais de communication",
        detail: "Diffusion des appels et des événements locaux.",
      };
    }
    return {
      type: "benevoles",
      label: "Appel à bénévoles",
      detail: "Renfort humain pour coordonner et déployer les actions.",
    };
  });

  if (relayActions.trim()) {
    calls.push({
      type: "communication",
      label: "Relais de communication",
      detail: relayActions.trim(),
    });
  }

  return calls;
}

function buildAssociationRecurringNeeds(
  contributionTypes: PartnerOnboardingRequestInput["contributionTypes"],
): string[] {
  const needs = contributionTypes.map((type) => {
    if (type === "materiel") return "Matériel";
    if (type === "financement") return "Dons";
    if (type === "communication") return "Relais de communication";
    if (type === "logistique") return "Bénévoles logistiques";
    return "Bénévoles d'accueil";
  });

  return [...new Set(needs)];
}

function buildAssociationResources(params: {
  contactChannel: string;
  contactDetails: string;
  websiteUrl?: string | null;
  primaryChannelUrl?: string | null;
  primaryChannelLabel?: string;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): AssociationResource[] {
  const resources: AssociationResource[] = [];

  if (params.websiteUrl) {
    resources.push({
      label: "Site officiel",
      description: "Agenda public et informations utiles.",
      url: params.websiteUrl,
    });
  }
  if (params.primaryChannelUrl && params.primaryChannelUrl !== params.websiteUrl) {
    resources.push({
      label: params.primaryChannelLabel?.trim() || "Canal de contact",
      description: `Contact via ${params.contactChannel.trim() || "canal direct"}.`,
      url: params.primaryChannelUrl,
    });
  }
  if (params.instagramUrl) {
    resources.push({
      label: "Instagram",
      description: "Actualités, campagnes et relais visuels.",
      url: params.instagramUrl,
    });
  }
  if (params.facebookUrl) {
    resources.push({
      label: "Facebook",
      description: "Annonces, événements et mobilisations.",
      url: params.facebookUrl,
    });
  }
  if (params.contactDetails.trim() && !params.contactDetails.includes("@")) {
    resources.push({
      label: "Contact direct",
      description: "Point de contact déclaré pour les échanges opérationnels.",
      url: undefined,
    });
  }

  return resources;
}

export function buildPublishedPartnerAnnuaireEntry(params: {
  request: PartnerOnboardingRequestInput;
  requestId: string;
}): PublishedPartnerAnnuaireEntry {
  const coverage = normalizePartnerCoverage(params.request.coverage);
  const availability = normalizePartnerAvailability(params.request.availability);
  const arrondissements =
    params.request.partnerScope === "local" ? coverage.arrondissements : [];
  const coordinates =
    params.request.partnerScope === "local" && arrondissements.length > 0
      ? averageParisCoordinates(arrondissements)
      : franceCenterCoordinates();
  const contactUrl = normalizeContactUrl(
    params.request.contactChannel,
    params.request.contactDetails,
  );
  const publicChannelUrl = contactUrl ? normalizePublicChannelUrl(contactUrl) : null;
  const websiteUrl = normalizePublicChannelUrl(params.request.contactDetails.trim());
  const nowIso = new Date().toISOString();
  const associationProfile: AssociationProfile | undefined =
    params.request.organizationType === "association"
      ? {
          mission: [
            params.request.motivation.trim(),
            params.request.relayActions.trim()
              ? `Relais déclaré: ${params.request.relayActions.trim()}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          recurringNeeds: buildAssociationRecurringNeeds(params.request.contributionTypes),
          pastActions: [],
          usefulResources: buildAssociationResources({
            contactChannel: params.request.contactChannel,
            contactDetails: params.request.contactDetails,
            websiteUrl,
            primaryChannelUrl: publicChannelUrl,
            primaryChannelLabel: params.request.contactChannel,
            instagramUrl: null,
            facebookUrl: null,
          }),
          publicCalls: buildAssociationPublicCalls(
            params.request.contributionTypes,
            params.request.relayActions,
          ),
          impactHistory: {
            zonesCovered: arrondissements.length,
            recurrence: formatAvailabilitySummary(availability),
            lastActionAt: nowIso,
            note: "Historique d'impact à compléter après validation.",
          },
          structureStatus: "pending",
        }
      : undefined;

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
    scope: params.request.partnerScope,
    description: [
      params.request.motivation.slice(0, 220),
      params.request.relayActions.trim()
        ? `Relais: ${params.request.relayActions.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    location:
      params.request.partnerScope === "local"
        ? formatCoverageSummary(coverage)
        : formatPartnerScopeLabel(params.request.partnerScope),
    lat: coordinates.lat,
    lng: coordinates.lng,
    websiteUrl: websiteUrl ?? undefined,
    coveredArrondissements: arrondissements,
    contributionTypes: params.request.contributionTypes,
    availability: formatAvailabilitySummary(availability),
    tags: [
      params.request.partnerScope === "local"
        ? "Réseau local"
        : formatPartnerScopeLabel(params.request.partnerScope),
      ...params.request.contributionTypes.map((type) => {
        if (type === "materiel") return "Matériel";
        if (type === "logistique") return "Logistique";
        if (type === "accueil") return "Accueil";
        if (type === "financement") return "Financement";
        return "Communication";
      }),
    ],
    primaryChannel: publicChannelUrl
      ? {
          platform: "site web",
          label: params.request.contactChannel.trim() || "Contact direct",
          url: publicChannelUrl,
        }
      : undefined,
    verificationStatus: "en_cours",
    qualificationStatus: "contact_non_qualifie",
    provenance: "published_partner",
    lastUpdatedAt: nowIso,
    recentActivityAt: nowIso,
    associationProfile,
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
  const records = [record, ...store.records].slice(0, 500);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}

export async function listPublishedPartnerAnnuaireEntries(): Promise<
  PublishedPartnerAnnuaireEntry[]
> {
  assertPersistenceAvailable("published_partner_annuaire_entries");

  if (canUseSupabaseServerPersistence()) {
    return readSupabaseRecords(
      getSupabaseServerClient(true)
        .from("partner_annuaire_entries")
        .select(SUPABASE_PUBLISHED_PARTNER_COLUMNS)
        .order("published_at", { ascending: false })
        .limit(500),
      fromSupabaseRow,
    );
  }

  const store = await readStore();
  return store.records;
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
