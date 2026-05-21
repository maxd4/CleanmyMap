import {
  classifyStorageBusinessDomain,
  listStorageBusinessDomains,
  type StorageBusinessDomainId,
  type StorageBusinessDomainMatch,
} from "./storage-business-taxonomy";

export type StorageBusinessClassificationSignalType =
  | StorageBusinessDomainMatch["signal"]
  | "businessDomain"
  | "sourceTable"
  | "businessContext";

export type StorageBusinessClassificationSignal = {
  signal: StorageBusinessClassificationSignalType;
  evidence: string;
};

export type StorageBusinessClassificationInput = {
  bucketId: string;
  name: string;
  mimeType?: string | null;
  metadata?: Record<string, unknown> | null;
  businessDomain?: StorageBusinessDomainId | string | null;
  sourceTable?: string | null;
  businessContext?: string | null;
};

export type StorageBusinessClassificationResult = {
  id: StorageBusinessDomainId;
  label: string;
  signal: StorageBusinessClassificationSignalType;
  evidence: string;
  businessDomain: string | null;
  sourceTable: string | null;
  businessContext: string | null;
  matchedSignals: StorageBusinessClassificationSignal[];
};

const DOMAIN_BY_ID = new Map(
  listStorageBusinessDomains().map((domain) => [domain.id, domain] as const),
);

const SOURCE_TABLE_DOMAIN_MAP: Record<string, StorageBusinessDomainId> = {
  actions: "actions_terrain",
  action_photos: "pieces_jointes_photo",
  attachments: "pieces_jointes_document",
  avatars: "donnees_utilisateur",
  badges: "badges_gamification",
  community_events: "actions_terrain",
  conversations: "messages",
  emails: "emails",
  email_messages: "emails",
  event_rsvps: "actions_terrain",
  environmental_impact_snapshots: "socle_estimateur_impact",
  governance_monthly_reports: "socle_estimateur_impact",
  messages: "messages",
  mission_assets: "actions_terrain",
  profiles: "donnees_utilisateur",
  progression_events: "badges_gamification",
  progression_profiles: "badges_gamification",
  reports: "socle_estimateur_impact",
  spots: "actions_terrain",
  users: "donnees_utilisateur",
};

const BUSINESS_DOMAIN_ID_MAP: Record<string, StorageBusinessDomainId> = Object.fromEntries(
  listStorageBusinessDomains().flatMap((domain) => {
    const normalizedId = normalizeToken(domain.id);
    const normalizedLabel = normalizeToken(domain.label);
    const entries: Array<[string, StorageBusinessDomainId]> = [[normalizedId, domain.id]];

    if (normalizedLabel !== normalizedId) {
      entries.push([normalizedLabel, domain.id]);
    }

    return entries;
  }),
);

const BUSINESS_CONTEXT_DOMAIN_MAP: Record<string, StorageBusinessDomainId> = {
  action_document: "pieces_jointes_document",
  action_photo: "pieces_jointes_photo",
  badge_asset: "badges_gamification",
  chat_attachment: "messages",
  chat_document: "messages",
  chat_photo: "messages",
  estimateur_export: "socle_estimateur_impact",
  field_document: "pieces_jointes_document",
  field_media: "actions_terrain",
  field_photo: "pieces_jointes_photo",
  governance_report: "socle_estimateur_impact",
  message_attachment: "messages",
  profile_avatar: "donnees_utilisateur",
  report_export: "socle_estimateur_impact",
};

const METADATA_KEYS = {
  businessDomain: ["businessDomain", "business_domain", "businessDomainId", "business_domain_id"],
  businessContext: ["businessContext", "business_context", "context"],
  sourceTable: ["sourceTable", "source_table", "tableSource", "table_source"],
} as const;

function normalizeToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveDomainIdFromSignal(
  signal: string | null,
  map: Record<string, StorageBusinessDomainId>,
): StorageBusinessDomainId | null {
  if (!signal) {
    return null;
  }

  return map[normalizeToken(signal)] ?? null;
}

function pushUniqueSignal(
  signals: StorageBusinessClassificationSignal[],
  signal: StorageBusinessClassificationSignalType,
  evidence: string | null | undefined,
) {
  if (!evidence || evidence.trim().length === 0) {
    return;
  }

  if (signals.some((item) => item.signal === signal && item.evidence === evidence)) {
    return;
  }

  signals.push({
    signal,
    evidence,
  });
}

function resolveDomainLabel(domainId: StorageBusinessDomainId): string {
  return DOMAIN_BY_ID.get(domainId)?.label ?? domainId;
}

export function buildStorageBusinessMetadata(params: {
  businessDomain?: StorageBusinessDomainId | string | null;
  sourceTable?: string | null;
  businessContext?: string | null;
  extra?: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    ...(params.extra ?? {}),
    ...(params.businessDomain
      ? {
          businessDomain: params.businessDomain,
          business_domain: params.businessDomain,
        }
      : {}),
    ...(params.sourceTable ? { sourceTable: params.sourceTable } : {}),
    ...(params.businessContext ? { businessContext: params.businessContext } : {}),
  };
}

export function extractStorageBusinessClassificationContext(metadata: Record<string, unknown> | null | undefined): {
  businessDomain: string | null;
  sourceTable: string | null;
  businessContext: string | null;
} {
  return {
    businessDomain: readMetadataString(metadata, METADATA_KEYS.businessDomain),
    sourceTable: readMetadataString(metadata, METADATA_KEYS.sourceTable),
    businessContext: readMetadataString(metadata, METADATA_KEYS.businessContext),
  };
}

export function classifyStorageBusinessObject(
  input: StorageBusinessClassificationInput,
): StorageBusinessClassificationResult {
  const metadataContext = extractStorageBusinessClassificationContext(input.metadata);
  const businessDomain = input.businessDomain ?? metadataContext.businessDomain;
  const sourceTable = input.sourceTable ?? metadataContext.sourceTable;
  const businessContext = input.businessContext ?? metadataContext.businessContext;
  const matchedSignals: StorageBusinessClassificationSignal[] = [];

  const businessDomainId = resolveDomainIdFromSignal(
    businessDomain,
    BUSINESS_DOMAIN_ID_MAP,
  );
  if (businessDomainId) {
    pushUniqueSignal(matchedSignals, "businessDomain", businessDomain);
  }

  const businessContextDomainId = resolveDomainIdFromSignal(
    businessContext,
    BUSINESS_CONTEXT_DOMAIN_MAP,
  );
  if (businessContextDomainId) {
    pushUniqueSignal(matchedSignals, "businessContext", businessContext);
  }

  const sourceTableDomainId = resolveDomainIdFromSignal(
    sourceTable,
    SOURCE_TABLE_DOMAIN_MAP,
  );
  if (sourceTableDomainId) {
    pushUniqueSignal(matchedSignals, "sourceTable", sourceTable);
  }

  const baseMatch = classifyStorageBusinessDomain({
    bucketId: input.bucketId,
    name: input.name,
    mimeType: input.mimeType ?? null,
  });
  pushUniqueSignal(matchedSignals, baseMatch.signal, baseMatch.evidence);

  const winningDomainId =
    businessDomainId ?? businessContextDomainId ?? sourceTableDomainId ?? baseMatch.id;
  const winningSignal =
    businessDomainId !== null
      ? ("businessDomain" as const)
      : businessContextDomainId !== null
      ? ("businessContext" as const)
      : sourceTableDomainId !== null
        ? ("sourceTable" as const)
        : baseMatch.signal;
  const winningEvidence =
    businessDomainId !== null
      ? businessDomain ?? baseMatch.evidence
      : businessContextDomainId !== null
      ? businessContext ?? baseMatch.evidence
      : sourceTableDomainId !== null
        ? sourceTable ?? baseMatch.evidence
        : baseMatch.evidence;

  return {
    id: winningDomainId,
    label: resolveDomainLabel(winningDomainId),
    signal: winningSignal,
    evidence: winningEvidence,
    businessDomain,
    sourceTable,
    businessContext,
    matchedSignals,
  };
}
