export const EVENT_OPS_NOTE_PREFIX = "[EVENT_OPS]";

export const CLEANUP_SUPPORT_LEVELS = ["faible", "moyen", "fort"] as const;
export type CleanupSupportLevel = (typeof CLEANUP_SUPPORT_LEVELS)[number];

export const CLEANUP_WASTE_TYPES = [
  "megots",
  "plastique",
  "verre",
  "metal",
  "mixte",
] as const;
export type CleanupWasteType = (typeof CLEANUP_WASTE_TYPES)[number];

export type CommunityEventOps = {
  capacityTarget: number | null;
  attendanceCount: number | null;
  postMortem: string | null;
  cleanupObjective: string | null;
  cleanupZone: string | null;
  cleanupLogisticsNeeds: string | null;
  cleanupSupportLevel: CleanupSupportLevel | null;
  cleanupWasteTypesExpected: CleanupWasteType[];
};

export type ParsedCommunityEventDescription = {
  plainDescription: string | null;
  ops: CommunityEventOps;
};

function normalizeInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const asInt = Math.trunc(parsed);
  if (asInt < 0) {
    return null;
  }
  return asInt;
}

function normalizePostMortem(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCleanupText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCleanupSupportLevel(
  value: unknown,
): CleanupSupportLevel | null {
  return CLEANUP_SUPPORT_LEVELS.includes(value as CleanupSupportLevel)
    ? (value as CleanupSupportLevel)
    : null;
}

function normalizeCleanupWasteTypes(value: unknown): CleanupWasteType[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((item): item is CleanupWasteType =>
    CLEANUP_WASTE_TYPES.includes(item as CleanupWasteType),
  ))];
}

export function defaultCommunityEventOps(): CommunityEventOps {
  return {
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
    cleanupObjective: null,
    cleanupZone: null,
    cleanupLogisticsNeeds: null,
    cleanupSupportLevel: null,
    cleanupWasteTypesExpected: [],
  };
}

export function parseCommunityEventDescription(
  description: string | null | undefined,
): ParsedCommunityEventDescription {
  const raw = (description ?? "").trim();
  if (!raw) {
    return {
      plainDescription: null,
      ops: defaultCommunityEventOps(),
    };
  }

  const markerIndex = raw.lastIndexOf(EVENT_OPS_NOTE_PREFIX);
  if (markerIndex < 0) {
    return {
      plainDescription: raw,
      ops: defaultCommunityEventOps(),
    };
  }

  const body = raw.slice(0, markerIndex).trim();
  const opsRaw = raw.slice(markerIndex + EVENT_OPS_NOTE_PREFIX.length).trim();
  if (!opsRaw) {
    return {
      plainDescription: body || null,
      ops: defaultCommunityEventOps(),
    };
  }

  try {
    const parsed = JSON.parse(opsRaw) as {
      capacityTarget?: unknown;
      attendanceCount?: unknown;
      postMortem?: unknown;
      cleanupObjective?: unknown;
      cleanupZone?: unknown;
      cleanupLogisticsNeeds?: unknown;
      cleanupSupportLevel?: unknown;
      cleanupWasteTypesExpected?: unknown;
    };
    return {
      plainDescription: body || null,
      ops: {
        capacityTarget: normalizeInt(parsed.capacityTarget),
        attendanceCount: normalizeInt(parsed.attendanceCount),
        postMortem: normalizePostMortem(parsed.postMortem),
        cleanupObjective: normalizeCleanupText(parsed.cleanupObjective),
        cleanupZone: normalizeCleanupText(parsed.cleanupZone),
        cleanupLogisticsNeeds: normalizeCleanupText(parsed.cleanupLogisticsNeeds),
        cleanupSupportLevel: normalizeCleanupSupportLevel(parsed.cleanupSupportLevel),
        cleanupWasteTypesExpected: normalizeCleanupWasteTypes(
          parsed.cleanupWasteTypesExpected,
        ),
      },
    };
  } catch {
    return {
      plainDescription: body || null,
      ops: defaultCommunityEventOps(),
    };
  }
}

export function mergeCommunityEventOps(
  base: CommunityEventOps,
  patch: Partial<CommunityEventOps>,
): CommunityEventOps {
  return {
    capacityTarget:
      patch.capacityTarget === undefined
        ? base.capacityTarget
        : (normalizeInt(patch.capacityTarget) ?? null),
    attendanceCount:
      patch.attendanceCount === undefined
        ? base.attendanceCount
        : (normalizeInt(patch.attendanceCount) ?? null),
    postMortem:
      patch.postMortem === undefined
        ? base.postMortem
        : normalizePostMortem(patch.postMortem),
    cleanupObjective:
      patch.cleanupObjective === undefined
        ? base.cleanupObjective
        : normalizeCleanupText(patch.cleanupObjective),
    cleanupZone:
      patch.cleanupZone === undefined
        ? base.cleanupZone
        : normalizeCleanupText(patch.cleanupZone),
    cleanupLogisticsNeeds:
      patch.cleanupLogisticsNeeds === undefined
        ? base.cleanupLogisticsNeeds
        : normalizeCleanupText(patch.cleanupLogisticsNeeds),
    cleanupSupportLevel:
      patch.cleanupSupportLevel === undefined
        ? base.cleanupSupportLevel
        : normalizeCleanupSupportLevel(patch.cleanupSupportLevel),
    cleanupWasteTypesExpected:
      patch.cleanupWasteTypesExpected === undefined
        ? base.cleanupWasteTypesExpected
        : normalizeCleanupWasteTypes(patch.cleanupWasteTypesExpected),
  };
}

export function serializeCommunityEventDescription(
  plainDescription: string | null | undefined,
  ops: CommunityEventOps,
): string | null {
  const cleanBody = (plainDescription ?? "").trim();
  const normalizedOps = {
    capacityTarget: normalizeInt(ops.capacityTarget),
    attendanceCount: normalizeInt(ops.attendanceCount),
    postMortem: normalizePostMortem(ops.postMortem),
    cleanupObjective: normalizeCleanupText(ops.cleanupObjective),
    cleanupZone: normalizeCleanupText(ops.cleanupZone),
    cleanupLogisticsNeeds: normalizeCleanupText(ops.cleanupLogisticsNeeds),
    cleanupSupportLevel: normalizeCleanupSupportLevel(ops.cleanupSupportLevel),
    cleanupWasteTypesExpected: normalizeCleanupWasteTypes(
      ops.cleanupWasteTypesExpected,
    ),
  };

  const hasOps =
    normalizedOps.capacityTarget !== null ||
    normalizedOps.attendanceCount !== null ||
    normalizedOps.postMortem !== null ||
    normalizedOps.cleanupObjective !== null ||
    normalizedOps.cleanupZone !== null ||
    normalizedOps.cleanupLogisticsNeeds !== null ||
    normalizedOps.cleanupSupportLevel !== null ||
    normalizedOps.cleanupWasteTypesExpected.length > 0;

  if (!hasOps) {
    return cleanBody || null;
  }

  const serializedOps = JSON.stringify(normalizedOps);
  return cleanBody
    ? `${cleanBody}\n${EVENT_OPS_NOTE_PREFIX}${serializedOps}`
    : `${EVENT_OPS_NOTE_PREFIX}${serializedOps}`;
}

export function standardPostMortemTemplate(): string {
  return [
    "Objectif:",
    "Ce qui a bien fonctionne:",
    "Ce qui a bloque:",
    "Actions correctives:",
    "Responsables + echeance:",
  ].join("\n");
}

export function formatCleanupSupportLabel(
  level: CleanupSupportLevel | null,
): string {
  if (level === "faible") {
    return "Soutien léger";
  }
  if (level === "moyen") {
    return "Soutien modéré";
  }
  if (level === "fort") {
    return "Soutien renforcé";
  }
  return "Soutien à préciser";
}

export function formatCleanupWasteTypeLabel(type: CleanupWasteType): string {
  if (type === "megots") return "Mégots";
  if (type === "plastique") return "Plastique";
  if (type === "verre") return "Verre";
  if (type === "metal") return "Métal";
  return "Mixte";
}

export function formatCleanupWasteTypesLabel(
  types: CleanupWasteType[],
): string {
  if (types.length === 0) {
    return "Déchets à préciser";
  }
  return types.map((type) => formatCleanupWasteTypeLabel(type)).join(", ");
}
