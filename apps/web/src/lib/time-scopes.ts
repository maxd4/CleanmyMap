export type RollingTimeScope = "rolling30d" | "rolling90d" | "rolling365d";

export type TimeScope = "allTime" | "yearToDate" | RollingTimeScope;

export type TimeScopeDefinition = {
  label: {
    fr: string;
    en: string;
  };
  days: number | null;
};

export const TIME_SCOPE_DEFINITIONS: Record<TimeScope, TimeScopeDefinition> = {
  allTime: {
    label: {
      fr: "Depuis la création",
      en: "All time",
    },
    days: null,
  },
  yearToDate: {
    label: {
      fr: "Année en cours",
      en: "Year to date",
    },
    days: null,
  },
  rolling30d: {
    label: {
      fr: "30 jours glissants",
      en: "Rolling 30 days",
    },
    days: 30,
  },
  rolling90d: {
    label: {
      fr: "90 jours glissants",
      en: "Rolling 90 days",
    },
    days: 90,
  },
  rolling365d: {
    label: {
      fr: "365 jours glissants",
      en: "Rolling 365 days",
    },
    days: 365,
  },
};

export function isTimeScope(raw: string | null | undefined): raw is TimeScope {
  return (
    raw === "allTime" ||
    raw === "yearToDate" ||
    raw === "rolling30d" ||
    raw === "rolling90d" ||
    raw === "rolling365d"
  );
}

export function resolveRollingTimeScope(days: number): RollingTimeScope | null {
  const safeDays = Math.trunc(days);
  if (safeDays === 30) {
    return "rolling30d";
  }
  if (safeDays === 90) {
    return "rolling90d";
  }
  if (safeDays === 365) {
    return "rolling365d";
  }
  return null;
}

export function getTimeScopeDays(scope: TimeScope): number | null {
  return TIME_SCOPE_DEFINITIONS[scope].days;
}

export function getTimeScopeLabel(
  scope: TimeScope,
  locale: "fr" | "en" = "fr",
): string {
  return TIME_SCOPE_DEFINITIONS[scope].label[locale];
}

function buildRollingFloorDate(days: number, referenceDate: Date): string {
  const safeDays = Math.max(1, Math.trunc(days));
  const floor = new Date(referenceDate);
  floor.setUTCHours(0, 0, 0, 0);
  floor.setUTCDate(floor.getUTCDate() - (safeDays - 1));
  return floor.toISOString().slice(0, 10);
}

export function getTimeScopeFloorDate(
  scope: TimeScope,
  referenceDate: Date = new Date(),
): string | null {
  if (scope === "allTime") {
    return null;
  }

  if (scope === "yearToDate") {
    return `${referenceDate.getUTCFullYear()}-01-01`;
  }

  const days = getTimeScopeDays(scope);
  if (!days) {
    return null;
  }

  return buildRollingFloorDate(days, referenceDate);
}

export function resolveTimeScopeFromRequest(params: {
  scope: string | null;
  days: string | null;
  fallback?: TimeScope;
}): {
  scope: TimeScope;
  days: number | null;
  isLegacyDays: boolean;
} {
  const fallback = params.fallback ?? "rolling30d";

  if (isTimeScope(params.scope)) {
    return {
      scope: params.scope,
      days: getTimeScopeDays(params.scope),
      isLegacyDays: false,
    };
  }

  const parsedDays = params.days ? Number(params.days) : null;
  if (parsedDays !== null && Number.isFinite(parsedDays) && parsedDays > 0) {
    const rollingScope = resolveRollingTimeScope(parsedDays);
    return {
      scope: rollingScope ?? fallback,
      days: Math.trunc(parsedDays),
      isLegacyDays: true,
    };
  }

  return {
    scope: fallback,
    days: getTimeScopeDays(fallback),
    isLegacyDays: false,
  };
}
