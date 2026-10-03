import type {
  ActionGeometryKind,
  ActionMapItem,
} from "@/lib/actions/types";
import type { GeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";

type CoordinatePair = [number, number];

type ActionMapGeometryMetric = {
  kind: "length" | "area" | null;
  value: number | null;
  label: string | null;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function computeCoordinateDistanceMeters(
  left: CoordinatePair,
  right: CoordinatePair,
): number {
  const deltaLat = toRadians(right[0] - left[0]);
  const deltaLng = toRadians(right[1] - left[1]);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(left[0])) *
      Math.cos(toRadians(right[0])) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  return 2 * 6_371_000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computePolylineLengthMeters(
  coordinates: CoordinatePair[],
): number | null {
  if (coordinates.length < 2) {
    return null;
  }

  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += computeCoordinateDistanceMeters(
      coordinates[index - 1],
      coordinates[index],
    );
  }

  return total;
}

function projectCoordinate(
  coordinate: CoordinatePair,
  metersPerDegreeLng: number,
  metersPerDegreeLat: number,
): CoordinatePair {
  const [latitude, longitude] = coordinate;
  return [longitude * metersPerDegreeLng, latitude * metersPerDegreeLat];
}

function computePolygonAreaSquareMeters(
  coordinates: CoordinatePair[],
): number | null {
  if (coordinates.length < 3) {
    return null;
  }

  const meanLatitude =
    coordinates.reduce((sum, [latitude]) => sum + latitude, 0) /
    coordinates.length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    111_320 * Math.max(0.1, Math.cos(toRadians(meanLatitude)));
  const projected = coordinates.map((coordinate) =>
    projectCoordinate(coordinate, metersPerDegreeLng, metersPerDegreeLat),
  );

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const [x1, y1] = projected[index];
    const [x2, y2] = projected[(index + 1) % projected.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function formatDistanceValue(kilometers: number): string {
  if (kilometers >= 1) {
    return `${kilometers.toFixed(1).replace(".", ",")} km`;
  }
  return `${Math.round(kilometers * 1000)} m`;
}

function formatAreaValue(squareMeters: number): string {
  if (squareMeters >= 10_000) {
    return `${(squareMeters / 10_000).toFixed(1).replace(".", ",")} ha`;
  }
  return `${Math.round(squareMeters)} m²`;
}

function resolveDistanceKm(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

type PolylineMetricContext = {
  targetDistanceKm: number | null;
  networkDistanceKm: number | null;
  observedDistanceKm: number | null;
  derivedDistanceKm: number | null;
};

function resolvePolylineMetricContext(
  item: ActionMapItem,
  coordinates: CoordinatePair[],
): PolylineMetricContext {
  const preparationData = item.contract?.metadata.preparationData;
  return {
    targetDistanceKm: resolveDistanceKm(preparationData?.routeTargetDistanceKm),
    networkDistanceKm: resolveDistanceKm(preparationData?.routeNetworkDistanceKm),
    observedDistanceKm: resolveDistanceKm(
      preparationData?.routeObservedDistanceKm ??
        preparationData?.gpxImport?.observedDistanceKm,
    ),
    derivedDistanceKm: computePolylineLengthMeters(coordinates),
  };
}

function buildLengthMetric(
  distanceKm: number | null,
  label: string | null,
): ActionMapGeometryMetric {
  return {
    kind: "length",
    value: distanceKm === null ? null : distanceKm * 1000,
    label: distanceKm === null ? null : label,
  };
}

function resolveObservedPolylineMetric(
  context: PolylineMetricContext,
): ActionMapGeometryMetric {
  const distanceKm = context.observedDistanceKm ??
    (context.derivedDistanceKm === null ? null : context.derivedDistanceKm / 1000);
  return buildLengthMetric(
    distanceKm,
    distanceKm === null ? null : `Distance observée · ${formatDistanceValue(distanceKm)}`,
  );
}

function resolveNetworkPolylineMetric(
  context: PolylineMetricContext,
): ActionMapGeometryMetric {
  const { networkDistanceKm, targetDistanceKm } = context;
  return buildLengthMetric(
    networkDistanceKm ?? targetDistanceKm,
    networkDistanceKm !== null
      ? `Distance du parcours reconstruit · ${formatDistanceValue(networkDistanceKm)}`
      : targetDistanceKm === null
        ? null
        : `Distance cible · ${formatDistanceValue(targetDistanceKm)}`,
  );
}

function resolveEstimatedPolylineMetric(
  context: PolylineMetricContext,
): ActionMapGeometryMetric {
  const { networkDistanceKm, targetDistanceKm } = context;
  if (networkDistanceKm === null) {
    return buildLengthMetric(
      targetDistanceKm,
      targetDistanceKm === null
        ? null
        : `Distance cible · ${formatDistanceValue(targetDistanceKm)}`,
    );
  }

  const targetLabel = targetDistanceKm === null
    ? ""
    : ` · Distance cible · ${formatDistanceValue(targetDistanceKm)}`;
  return buildLengthMetric(
    networkDistanceKm,
    `Parcours estimé · ${formatDistanceValue(networkDistanceKm)}${targetLabel}`,
  );
}

function resolveIndicativePolylineMetric(
  context: PolylineMetricContext,
): ActionMapGeometryMetric {
  const distanceKm = context.networkDistanceKm ??
    (context.derivedDistanceKm === null ? null : context.derivedDistanceKm / 1000);
  return buildLengthMetric(
    distanceKm,
    distanceKm === null
      ? null
      : `Distance indicative à vol d’oiseau · ${formatDistanceValue(distanceKm)}`,
  );
}

function resolveDeclaredPolylineMetric(
  context: PolylineMetricContext,
  presentation: GeometryPresentation,
): ActionMapGeometryMetric {
  const distanceKm = context.derivedDistanceKm === null
    ? null
    : context.derivedDistanceKm / 1000;
  return buildLengthMetric(
    distanceKm,
    distanceKm === null
      ? null
      : `${presentation.label} · ${formatDistanceValue(distanceKm)}`,
  );
}

function resolvePolylineMetric(
  coordinates: CoordinatePair[],
  item: ActionMapItem,
  presentation: GeometryPresentation,
): ActionMapGeometryMetric {
  const context = resolvePolylineMetricContext(item, coordinates);
  switch (presentation.variant) {
    case "observed":
      return resolveObservedPolylineMetric(context);
    case "network":
      return resolveNetworkPolylineMetric(context);
    case "estimated":
      return resolveEstimatedPolylineMetric(context);
    case "indicative":
      return resolveIndicativePolylineMetric(context);
    default:
      return resolveDeclaredPolylineMetric(context, presentation);
  }
}

function resolvePolygonMetric(
  coordinates: CoordinatePair[],
  presentation: GeometryPresentation,
): ActionMapGeometryMetric {
  const areaSquareMeters = computePolygonAreaSquareMeters(coordinates);
  return {
    kind: "area",
    value: areaSquareMeters,
    label:
      areaSquareMeters === null
        ? null
        : `${presentation.label} · ${formatAreaValue(areaSquareMeters)}`,
  };
}

function resolveMultiLineMetric(
  item: ActionMapItem,
): ActionMapGeometryMetric {
  const coverage = item.contract?.metadata.preparationData?.observedCoverage;
  const traceCount = Math.max(0, Math.trunc(Number(coverage?.traceCount) || 0));
  return {
    kind: null,
    value: null,
    label: traceCount > 0
      ? `Couverture observée · ${traceCount} traces · distances individuelles conservées`
      : "Couverture observée · distance cumulée non calculée",
  };
}

export function resolveGeometryMetric(
  kind: ActionGeometryKind | "point" | null,
  coordinates: CoordinatePair[],
  item: ActionMapItem,
  presentation: GeometryPresentation,
): ActionMapGeometryMetric {
  if (kind === "polyline") {
    return resolvePolylineMetric(coordinates, item, presentation);
  }
  if (kind === "multiline") {
    return resolveMultiLineMetric(item);
  }
  if (kind === "polygon") {
    return resolvePolygonMetric(coordinates, presentation);
  }
  return { kind: null, value: null, label: null };
}
