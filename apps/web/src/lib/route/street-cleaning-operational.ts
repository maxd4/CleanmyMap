import type {
  StreetCleaningOperationalAssignment,
  StreetCleaningOperationalException,
  StreetCleaningOperationalPlan,
  StreetCleaningOperationalCorridorId,
  StreetCleaningOperationalStreet,
  StreetCleaningStreetPass,
} from "./street-cleaning-corridor";
import type { RouteGeometryStep } from "./route-contract";

type SegmentCoordinate = readonly [number, number];

type OperationalRouteStep = Pick<RouteGeometryStep, "name" | "distanceKm"> &
  Partial<Pick<RouteGeometryStep, "segmentReference" | "geometry">>;

function normalizeSegmentReference(reference: unknown): string | null {
  if (typeof reference !== "string" || reference.trim().length === 0) {
    return null;
  }
  return `reference:${reference.trim()}`;
}

function isCoordinate(value: unknown): value is SegmentCoordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

function geometrySegmentKey(geometry: readonly SegmentCoordinate[] | undefined): string | null {
  if (!geometry || geometry.length < 2) {
    return null;
  }

  if (!geometry.every(isCoordinate)) {
    return null;
  }

  const points = geometry.map(([latitude, longitude]) => [
    Number(latitude.toFixed(5)),
    Number(longitude.toFixed(5)),
  ] as const);
  const deduplicated = points.filter(
    (point, index) => index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1],
  );
  if (deduplicated.length < 2) {
    return null;
  }

  const forward = deduplicated.map(([latitude, longitude]) => `${latitude},${longitude}`).join(";");
  const reverse = [...deduplicated]
    .reverse()
    .map(([latitude, longitude]) => `${latitude},${longitude}`)
    .join(";");
  return `geometry:${forward < reverse ? forward : reverse}`;
}

/** Derives only from an explicit provider reference or returned step geometry. */
export function deriveStreetCleaningSegmentKey(
  step: Pick<RouteGeometryStep, "segmentReference" | "geometry">,
): string | null {
  return normalizeSegmentReference(step.segmentReference) ?? geometrySegmentKey(step.geometry);
}

function passSegmentKey(pass: StreetCleaningStreetPass): string | null {
  return typeof pass.segmentKey === "string" && pass.segmentKey.trim().length > 0
    ? pass.segmentKey.trim()
    : null;
}

function operationalKeyForPass(
  pass: StreetCleaningStreetPass,
  unknownKey: string,
): string {
  const segmentKey = passSegmentKey(pass);
  return segmentKey ? `segment:${segmentKey}` : unknownKey;
}

function defaultOperationalStreet(
  streetKey: string,
  label: string | null,
  segmentKey: string | null,
): StreetCleaningOperationalStreet {
  return {
    streetKey,
    label,
    segmentKey,
    corridorCount: 2,
    basis: "default_two_corridors",
    sourceId: "planner-operational-assumption",
    sourceVersion: "street-cleaning-operational-corridors-v1",
    note: "Hypothèse opérationnelle : une rue routable dispose de deux corridors ; ce n'est pas une preuve de trottoir.",
  };
}

/**
 * Assigns abstract A/B cleaning capacity without pretending to know left/right.
 * A change is blocked when it would require an unproven or dangerous crossing.
 */
export function planOperationalStreetCorridors(input: {
  passes: readonly StreetCleaningStreetPass[];
  exceptions?: Readonly<Record<string, StreetCleaningOperationalException>>;
}): StreetCleaningOperationalPlan {
  const unknownKeyByPass = new Map<StreetCleaningStreetPass, string>();
  input.passes.forEach((pass, index) => {
    unknownKeyByPass.set(
      pass,
      `unknown:${pass.routeId}:${pass.routeOrder}:${pass.passOrder}:${index}`,
    );
  });
  const operationalKey = (pass: StreetCleaningStreetPass) =>
    operationalKeyForPass(
      pass,
      unknownKeyByPass.get(pass) ?? `unknown:${input.passes.indexOf(pass)}`,
    );
  const streetByKey = new Map<string, StreetCleaningOperationalStreet>();
  for (const pass of input.passes) {
    const key = operationalKey(pass);
    if (!streetByKey.has(key)) {
      const segmentKey = passSegmentKey(pass);
      const exception = segmentKey ? input.exceptions?.[segmentKey] : undefined;
      streetByKey.set(
        key,
        exception
          ? {
              streetKey: pass.streetKey,
              label: pass.label,
              segmentKey,
              corridorCount: exception.corridorCount,
              basis: "documented_exception",
              sourceId: exception.sourceId,
              sourceVersion: exception.sourceVersion,
              note: exception.note,
            }
          : defaultOperationalStreet(pass.streetKey, pass.label, segmentKey),
      );
    }
  }

  const orderedPasses = [...input.passes].sort(
    (left, right) =>
      left.routeOrder - right.routeOrder ||
      left.passOrder - right.passOrder ||
      left.routeId.localeCompare(right.routeId) ||
      (passSegmentKey(left) ?? "").localeCompare(passSegmentKey(right) ?? "") ||
      left.streetKey.localeCompare(right.streetKey) ||
      (left.label ?? "").localeCompare(right.label ?? ""),
  );
  const usedByStreet = new Map<
    string,
    Map<StreetCleaningOperationalCorridorId, number>
  >();
  const lastCorridorByRouteStreet = new Map<
    string,
    StreetCleaningOperationalCorridorId
  >();
  const assignments: StreetCleaningOperationalAssignment[] = [];
  let networkOverlapCount = 0;
  let cleaningCoverageOverlap = 0;
  const warnings: string[] = [];

  for (const pass of orderedPasses) {
    const key = operationalKey(pass);
    const street = streetByKey.get(key)!;
    const counts = usedByStreet.get(key) ?? new Map();
    usedByStreet.set(key, counts);
    const routeStreetKey = `${pass.routeId}:${key}`;
    const previous = lastCorridorByRouteStreet.get(routeStreetKey);
    const crossingStatus = pass.crossingStatus ?? "not_required";
    const wantsSecondCorridor =
      street.corridorCount === 2 &&
      (counts.get("A") ?? 0) > 0 &&
      (counts.get("B") ?? 0) === 0;
    const crossingBlocked = Boolean(
      wantsSecondCorridor &&
        pass.requiresCrossing &&
        crossingStatus !== "not_required" &&
        crossingStatus !== "proven_same_side",
    );
    const corridorId: StreetCleaningOperationalCorridorId = crossingBlocked
      ? previous ?? "A"
      : street.corridorCount === 1
        ? "A"
        : (counts.get("A") ?? 0) <= (counts.get("B") ?? 0)
          ? "A"
          : "B";
    const sameSegmentPreviouslyPassed = orderedPasses.some(
      (other) =>
        operationalKey(other) === key &&
        (other.routeOrder < pass.routeOrder ||
          (other.routeOrder === pass.routeOrder &&
            other.passOrder < pass.passOrder) ||
          (other.routeOrder === pass.routeOrder &&
            other.passOrder === pass.passOrder &&
            other.routeId.localeCompare(pass.routeId) < 0)),
    );
    if (sameSegmentPreviouslyPassed && passSegmentKey(pass)) networkOverlapCount += 1;
    const priorCount = counts.get(corridorId) ?? 0;
    if (priorCount > 0) cleaningCoverageOverlap += 1;
    counts.set(corridorId, priorCount + 1);
    lastCorridorByRouteStreet.set(routeStreetKey, corridorId);
    if (crossingBlocked) {
      warnings.push(
        `${pass.streetKey}: changement de corridor bloqué (${crossingStatus}).`,
      );
    }
    assignments.push({
      routeId: pass.routeId,
      streetKey: pass.streetKey,
      label: pass.label,
      segmentKey: passSegmentKey(pass),
      corridorId,
      geographicSide: "unknown",
      lengthMeters: pass.lengthMeters,
      direction: pass.direction,
      basis: street.basis,
      crossingStatus,
      crossingBlocked,
      pollution: pass.pollution ? { ...pass.pollution } : null,
    });
  }

  const networkOverlap = input.passes.length > 0 && input.passes.every((pass) => passSegmentKey(pass))
    ? networkOverlapCount
    : null;

  return {
    streets: [...streetByKey.values()],
    assignments,
    networkOverlap,
    cleaningCoverageOverlap,
    warnings: [...new Set(warnings)],
  };
}

/** Converts network steps/legs into references, never into sidewalk geometry. */
export function buildStreetCleaningStreetPassesFromGeometry(input: {
  routeId: string;
  routeOrder: number;
  routeGeometry: {
    mode: "network" | "fallback";
    legs: Array<{
      distanceKm: number;
      steps?: OperationalRouteStep[];
    }>;
  };
}): StreetCleaningStreetPass[] {
  if (input.routeGeometry.mode !== "network") return [];
  const passes: StreetCleaningStreetPass[] = [];
  input.routeGeometry.legs.forEach((leg, legIndex) => {
    const namedSteps = (leg.steps ?? []).filter(
      (step) => typeof step.name === "string" && step.name.trim().length > 0,
    );
    const steps: OperationalRouteStep[] = namedSteps.length > 0
      ? namedSteps
      : [{ name: `network-leg-${legIndex + 1}`, distanceKm: leg.distanceKm }];
    const streetsInLeg = new Map<string, {
      label: string;
      distanceKm: number;
      segmentKey: string | null;
    }>();
    steps.forEach((step, stepIndex) => {
      const label = step.name!.trim();
      const segmentKey = deriveStreetCleaningSegmentKey(step);
      const groupingKey = segmentKey ?? `unknown-step-${stepIndex}`;
      const existing = streetsInLeg.get(groupingKey);
      streetsInLeg.set(groupingKey, {
        label: existing?.label ?? label,
        segmentKey,
        distanceKm: (existing?.distanceKm ?? 0) + (Number.isFinite(step.distanceKm) ? Math.max(0, step.distanceKm) : 0),
      });
    });
    [...streetsInLeg.values()].forEach((street, streetIndex) => {
      const streetKey = street.label.toLocaleLowerCase("fr-FR");
      passes.push({
        routeId: input.routeId,
        routeOrder: input.routeOrder,
        passOrder: legIndex * 1_000 + streetIndex,
        streetKey,
        label: street.label,
        segmentKey: street.segmentKey,
        lengthMeters: Number.isFinite(street.distanceKm)
          ? Math.max(0, street.distanceKm * 1_000)
          : null,
        direction:
          legIndex === input.routeGeometry.legs.length - 1
            ? "return"
            : "outbound",
      });
    });
  });
  return passes;
}
