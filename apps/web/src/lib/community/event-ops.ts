export const EVENT_OPS_NOTE_PREFIX = "[EVENT_OPS]";

export type CommunityEventOps = {
  capacityTarget: number | null;
  attendanceCount: number | null;
  postMortem: string | null;
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

export function defaultCommunityEventOps(): CommunityEventOps {
  return {
    capacityTarget: null,
    attendanceCount: null,
    postMortem: null,
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
    };
    return {
      plainDescription: body || null,
      ops: {
        capacityTarget: normalizeInt(parsed.capacityTarget),
        attendanceCount: normalizeInt(parsed.attendanceCount),
        postMortem: normalizePostMortem(parsed.postMortem),
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
  };

  const hasOps =
    normalizedOps.capacityTarget !== null ||
    normalizedOps.attendanceCount !== null ||
    normalizedOps.postMortem !== null;

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
