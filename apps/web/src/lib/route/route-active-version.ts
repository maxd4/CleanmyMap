import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";

const ACTION_ROUTE_VERSIONING_SCHEMA_VERSION =
  "action-route-versioning-v1" as const;

/**
 * The active version is an audit projection of an existing planner snapshot.
 * It deliberately does not copy the planner datasets; the initial snapshot
 * remains the immutable historical proof in routeCalibrationContext.
 */
export type ActionRouteVersionCalculation = {
  snapshotHash: string | null;
  parameters: import("./route-calibration-types").RoutePlannerSnapshot["parameters"];
  engineVersion: string;
  modelVersions: import("./route-calibration-types").RoutePlannerSnapshot["modelVersions"];
  provenance: import("./route-calibration-types").RoutePlannerSnapshot["provenance"];
  weatherContext?: PlannerWeatherContext;
  metrics: {
    distanceKm: number | null;
    walkingMinutes: number | null;
    collectionMinutes: number | null;
    totalMinutes: number | null;
  };
  stops: Array<{
    id: string;
    label: string;
    score: number;
    priorityReason: string;
    sourceFamily?: "observed" | "predicted";
    sourceObservedAt?: string | null;
  }>;
  explanation: string | null;
};

export type ActionRouteVersion = {
  versionId: string;
  appliedAt: string;
  appliedByUserId: string;
  calculation: ActionRouteVersionCalculation;
  operationalRoute: import("./route-operational").OperationalRoute;
};

export type ActionRouteVersioning = {
  schemaVersion: typeof ACTION_ROUTE_VERSIONING_SCHEMA_VERSION;
  active: ActionRouteVersion;
  history: ActionRouteVersion[];
};

export type ActionRouteVersionCalculationOverrides = Partial<
  Pick<ActionRouteVersionCalculation, "snapshotHash" | "metrics" | "stops" | "explanation">
>;

export function buildActionRouteVersionCalculation(
  snapshot: import("./route-calibration-types").RoutePlannerSnapshot,
  overrides: ActionRouteVersionCalculationOverrides = {},
): ActionRouteVersionCalculation {
  const budgets = snapshot.groups
    .map((group) => group.operationalBudget)
    .filter((budget): budget is NonNullable<typeof budget> => Boolean(budget));
  const sumNullable = (values: Array<number | null | undefined>): number | null => {
    const finite = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
    return finite.length > 0 ? finite.reduce((sum, value) => sum + value, 0) : null;
  };

  return {
    snapshotHash: overrides.snapshotHash ?? null,
    parameters: structuredClone(snapshot.parameters),
    engineVersion: snapshot.engineVersion,
    modelVersions: structuredClone(snapshot.modelVersions),
    provenance: structuredClone(snapshot.provenance),
    ...(snapshot.weatherContext
      ? { weatherContext: structuredClone(snapshot.weatherContext) }
      : {}),
    metrics: overrides.metrics ?? {
      distanceKm: snapshot.distance.totalKm,
      walkingMinutes: snapshot.distance.travelMinutes,
      collectionMinutes: sumNullable(budgets.map((budget) => budget.actionMinutes)),
      totalMinutes: sumNullable(budgets.map((budget) => budget.totalMinutes)),
    },
    stops: overrides.stops ?? snapshot.selectedStops.map((stop) => ({
      id: stop.id,
      label: stop.label,
      score: stop.score,
      priorityReason: stop.priorityReason,
      ...(stop.evidence?.family
        ? {
            sourceFamily: stop.evidence.family,
            ...(stop.evidence.family === "observed"
              ? { sourceObservedAt: stop.evidence.observedAt }
              : {}),
          }
        : {}),
    })),
    explanation: overrides.explanation ?? null,
  };
}

function buildActionRouteVersionId(
  snapshot: import("./route-calibration-types").RoutePlannerSnapshot,
  snapshotHash: string | null,
): string {
  const suffix = snapshotHash ? `-${snapshotHash.slice(0, 12)}` : "";
  return `route-v1-${snapshot.generatedAt.replace(/[^0-9A-Za-z]/g, "")}${suffix}`;
}

export function buildActionRouteVersioning(input: {
  snapshot: import("./route-calibration-types").RoutePlannerSnapshot;
  operationalRoute: import("./route-operational").OperationalRoute;
  appliedAt: string;
  appliedByUserId: string;
  snapshotHash: string | null;
  calculation?: ActionRouteVersionCalculation;
}): ActionRouteVersioning {
  const calculation = input.calculation ?? buildActionRouteVersionCalculation(input.snapshot, {
    snapshotHash: input.snapshotHash,
  });
  return {
    schemaVersion: ACTION_ROUTE_VERSIONING_SCHEMA_VERSION,
    active: {
      versionId: buildActionRouteVersionId(input.snapshot, input.snapshotHash),
      appliedAt: input.appliedAt,
      appliedByUserId: input.appliedByUserId,
      calculation,
      operationalRoute: structuredClone(input.operationalRoute),
    },
    history: [],
  };
}

export function isActionRouteVersioning(value: unknown): value is ActionRouteVersioning {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActionRouteVersioning>;
  return (
    candidate.schemaVersion === ACTION_ROUTE_VERSIONING_SCHEMA_VERSION &&
    Boolean(candidate.active) &&
    Array.isArray(candidate.history)
  );
}
