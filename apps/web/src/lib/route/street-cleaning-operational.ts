import type {
  StreetCleaningOperationalAssignment,
  StreetCleaningOperationalException,
  StreetCleaningOperationalPlan,
  StreetCleaningOperationalCorridorId,
  StreetCleaningOperationalStreet,
  StreetCleaningStreetPass,
} from "./street-cleaning-corridor";

function defaultOperationalStreet(
  streetKey: string,
  label: string | null,
): StreetCleaningOperationalStreet {
  return {
    streetKey,
    label,
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
  const streetByKey = new Map<string, StreetCleaningOperationalStreet>();
  for (const pass of input.passes) {
    if (!streetByKey.has(pass.streetKey)) {
      const exception = input.exceptions?.[pass.streetKey];
      streetByKey.set(
        pass.streetKey,
        exception
          ? {
              streetKey: pass.streetKey,
              label: pass.label,
              corridorCount: exception.corridorCount,
              basis: "documented_exception",
              sourceId: exception.sourceId,
              sourceVersion: exception.sourceVersion,
              note: exception.note,
            }
          : defaultOperationalStreet(pass.streetKey, pass.label),
      );
    }
  }

  const orderedPasses = [...input.passes].sort(
    (left, right) =>
      left.routeOrder - right.routeOrder ||
      left.passOrder - right.passOrder ||
      left.routeId.localeCompare(right.routeId),
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
  let networkOverlap = 0;
  let cleaningCoverageOverlap = 0;
  const warnings: string[] = [];

  for (const pass of orderedPasses) {
    const street = streetByKey.get(pass.streetKey)!;
    const counts = usedByStreet.get(pass.streetKey) ?? new Map();
    usedByStreet.set(pass.streetKey, counts);
    const routeStreetKey = `${pass.routeId}:${pass.streetKey}`;
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
    const sameStreetPreviouslyPassed = orderedPasses.some(
      (other) =>
        other.streetKey === pass.streetKey &&
        (other.routeOrder < pass.routeOrder ||
          (other.routeOrder === pass.routeOrder &&
            other.passOrder < pass.passOrder)),
    );
    if (sameStreetPreviouslyPassed) networkOverlap += 1;
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
      steps?: Array<{ name: string | null; distanceKm: number }>;
    }>;
  };
}): StreetCleaningStreetPass[] {
  if (input.routeGeometry.mode !== "network") return [];
  const passes: StreetCleaningStreetPass[] = [];
  input.routeGeometry.legs.forEach((leg, legIndex) => {
    const namedSteps = (leg.steps ?? []).filter(
      (step) => typeof step.name === "string" && step.name.trim().length > 0,
    );
    const steps = namedSteps.length > 0
      ? namedSteps
      : [{ name: `network-leg-${legIndex + 1}`, distanceKm: leg.distanceKm }];
    const streetsInLeg = new Map<string, { label: string; distanceKm: number }>();
    steps.forEach((step) => {
      const label = step.name!.trim();
      const key = label.toLocaleLowerCase("fr-FR");
      const existing = streetsInLeg.get(key);
      streetsInLeg.set(key, {
        label: existing?.label ?? label,
        distanceKm: (existing?.distanceKm ?? 0) + (Number.isFinite(step.distanceKm) ? Math.max(0, step.distanceKm) : 0),
      });
    });
    [...streetsInLeg.entries()].forEach(([streetKey, street], streetIndex) => {
      passes.push({
        routeId: input.routeId,
        routeOrder: input.routeOrder,
        passOrder: legIndex * 1_000 + streetIndex,
        streetKey,
        label: street.label,
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
