export type FunnelRow = {
  at: string;
  user_id: string | null;
  session_id: string;
  step: string;
  mode: string;
  meta?: Record<string, unknown> | null;
};

export type FunnelRouteCount = {
  path: string;
  count: number;
};

export type FunnelSignalAggregate = {
  eventCount: number;
  detailedPageViewCount: number;
  legacyPageViewCount: number;
  sessionCount: number;
  userIds: string[];
  distinctRouteCount: number;
  routeCounts: FunnelRouteCount[];
  earliestAt: string | null;
};

export type FunnelSignalSummary = {
  userId: string | null;
  allTime: FunnelSignalAggregate;
  current: FunnelSignalAggregate;
  previous: FunnelSignalAggregate;
  user: FunnelSignalAggregate | null;
  currentWindowFromMs: number;
  currentWindowUntilMs: number;
  previousWindowFromMs: number;
  previousWindowUntilMs: number;
};

function normalizedDistinct(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function getMetaString(row: FunnelRow, keys: string[]): string | null {
  if (!row.meta) {
    return null;
  }

  for (const key of keys) {
    const value = row.meta[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getFunnelPagePath(row: FunnelRow): string | null {
  return getMetaString(row, ["pagePath", "pathname", "routePath"]);
}

export function countProjectPageViews(rows: FunnelRow[]): number {
  const detailedPageViews = rows.filter((row) => row.step === "page_view").length;
  if (detailedPageViews > 0) {
    return detailedPageViews;
  }

  return rows.filter((row) => row.step === "view_new").length;
}

export function buildTopPageViewRouteCounts(routeCounts: FunnelRouteCount[]): FunnelRouteCount[] {
  return [...routeCounts]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.path.localeCompare(right.path, "fr");
    })
    .slice(0, 5);
}

export function summarizeFunnelRows(rows: FunnelRow[]): FunnelSignalAggregate {
  const routeCounts = new Map<string, number>();
  const distinctRoutes = new Set<string>();
  let earliestAt: string | null = null;

  for (const row of rows) {
    const rowTime = new Date(row.at).getTime();
    if (Number.isFinite(rowTime) && (earliestAt === null || rowTime < new Date(earliestAt).getTime())) {
      earliestAt = new Date(rowTime).toISOString();
    }

    const path = getFunnelPagePath(row);
    if (path && (row.step === "page_view" || row.step === "view_new" || row.step === "start_form")) {
      distinctRoutes.add(path);
    }
    if (path && (row.step === "page_view" || row.step === "view_new")) {
      routeCounts.set(path, (routeCounts.get(path) ?? 0) + 1);
    }
  }

  return {
    eventCount: rows.length,
    detailedPageViewCount: rows.filter((row) => row.step === "page_view").length,
    legacyPageViewCount: rows.filter((row) => row.step === "view_new").length,
    sessionCount: normalizedDistinct(rows.map((row) => row.session_id)).length,
    userIds: normalizedDistinct(rows.map((row) => row.user_id)),
    distinctRouteCount: distinctRoutes.size,
    routeCounts: Array.from(routeCounts.entries()).map(([path, count]) => ({ path, count })),
    earliestAt,
  };
}

function asNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Contrat agrégé funnel invalide: ${field}.`);
  }
  return value;
}

function normalizeAggregate(value: unknown): FunnelSignalAggregate {
  if (!value || typeof value !== "object") {
    throw new Error("Contrat agrégé funnel invalide: agrégat absent.");
  }

  const raw = value as Record<string, unknown>;
  const rawUsers = raw.userIds;
  const rawRoutes = raw.routeCounts;
  if (!Array.isArray(rawUsers) || !Array.isArray(rawRoutes)) {
    throw new Error("Contrat agrégé funnel invalide: dimensions absentes.");
  }

  return {
    eventCount: asNonNegativeInteger(raw.eventCount, "eventCount"),
    detailedPageViewCount: asNonNegativeInteger(raw.detailedPageViewCount, "detailedPageViewCount"),
    legacyPageViewCount: asNonNegativeInteger(raw.legacyPageViewCount, "legacyPageViewCount"),
    sessionCount: asNonNegativeInteger(raw.sessionCount, "sessionCount"),
    userIds: normalizedDistinct(rawUsers.filter((item): item is string => typeof item === "string")),
    distinctRouteCount: asNonNegativeInteger(raw.distinctRouteCount, "distinctRouteCount"),
    routeCounts: rawRoutes.map((item) => {
      if (!item || typeof item !== "object") {
        throw new Error("Contrat agrégé funnel invalide: route absente.");
      }
      const route = item as Record<string, unknown>;
      if (typeof route.path !== "string") {
        throw new Error("Contrat agrégé funnel invalide: chemin absent.");
      }
      return {
        path: route.path,
        count: asNonNegativeInteger(route.count, "route.count"),
      };
    }),
    earliestAt: raw.earliestAt === null || typeof raw.earliestAt === "string" ? raw.earliestAt : null,
  };
}

export function parseFunnelSignalSummary(
  value: unknown,
  params: { userId: string | null; now: string },
): FunnelSignalSummary {
  if (!value || typeof value !== "object") {
    throw new Error("Contrat RPC funnel invalide.");
  }
  const raw = value as Record<string, unknown>;
  const nowMs = new Date(params.now).getTime();
  if (!Number.isFinite(nowMs)) {
    throw new Error("Référence temporelle funnel invalide.");
  }

  return {
    userId: params.userId,
    allTime: normalizeAggregate(raw.allTime),
    current: normalizeAggregate(raw.current),
    previous: normalizeAggregate(raw.previous),
    user: raw.user === null ? null : normalizeAggregate(raw.user),
    currentWindowFromMs: nowMs - 30 * 24 * 60 * 60 * 1000,
    currentWindowUntilMs: nowMs,
    previousWindowFromMs: nowMs - 60 * 24 * 60 * 60 * 1000,
    previousWindowUntilMs: nowMs - 30 * 24 * 60 * 60 * 1000 - 1,
  };
}
