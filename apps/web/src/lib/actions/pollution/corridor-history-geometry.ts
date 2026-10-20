const METERS_PER_DEGREE_LATITUDE = 111_320;

type CorridorPoint = { x: number; y: number };
type Direction = { x: number; y: number };
type Sample = { point: CorridorPoint; direction: Direction };

type ProjectedCorridor = {
  points: CorridorPoint[];
  lengthMeters: number;
};

type CorridorCoverageOptions = {
  sampleSpacingMeters: number;
  maxPointToCorridorDistanceMeters: number;
};

export function isFiniteCoordinatePair(
  coordinate: readonly [number, number],
): boolean {
  const [latitude, longitude] = coordinate;
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceBetweenPoints(
  left: CorridorPoint,
  right: CorridorPoint,
): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function directionBetween(
  left: CorridorPoint,
  right: CorridorPoint,
): Direction {
  const length = distanceBetweenPoints(left, right);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: (right.x - left.x) / length,
    y: (right.y - left.y) / length,
  };
}

function projectCoordinate(
  coordinate: readonly [number, number],
  referenceLatitude: number,
): CorridorPoint {
  const [latitude, longitude] = coordinate;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(0.1, Math.cos(toRadians(referenceLatitude)));
  return {
    x: longitude * metersPerDegreeLongitude,
    y: latitude * METERS_PER_DEGREE_LATITUDE,
  };
}

export function projectPolyline(
  coordinates: readonly [number, number][],
  referenceLatitude: number,
): ProjectedCorridor {
  const points = coordinates.map((coordinate) =>
    projectCoordinate(coordinate, referenceLatitude),
  );
  let lengthMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    lengthMeters += distanceBetweenPoints(points[index - 1], points[index]);
  }
  return { points, lengthMeters };
}

export function resolveReferenceLatitude(
  left: readonly [number, number][],
  right: readonly [number, number][],
): number {
  const coordinates = [...left, ...right];
  return (
    coordinates.reduce((sum, [latitude]) => sum + latitude, 0) /
    Math.max(1, coordinates.length)
  );
}

function samplePolyline(
  polyline: ProjectedCorridor,
  spacingMeters: number,
): Sample[] {
  const samples: Sample[] = [];
  for (let index = 1; index < polyline.points.length; index += 1) {
    const start = polyline.points[index - 1];
    const end = polyline.points[index];
    const segmentLength = distanceBetweenPoints(start, end);
    if (segmentLength === 0) {
      continue;
    }

    const direction = directionBetween(start, end);
    const steps = Math.max(1, Math.ceil(segmentLength / spacingMeters));
    for (let step = 0; step < steps; step += 1) {
      const ratio = step / steps;
      samples.push({
        point: {
          x: start.x + (end.x - start.x) * ratio,
          y: start.y + (end.y - start.y) * ratio,
        },
        direction,
      });
    }
  }

  const lastPoint = polyline.points.at(-1);
  const previousPoint = polyline.points.at(-2);
  if (lastPoint && previousPoint) {
    samples.push({
      point: lastPoint,
      direction: directionBetween(previousPoint, lastPoint),
    });
  }
  return samples;
}

function nearestPointOnPolyline(
  sample: Sample,
  target: ProjectedCorridor,
): { distanceMeters: number; directionAgreement: number } | null {
  let nearest: { distanceMeters: number; directionAgreement: number } | null = null;

  for (let index = 1; index < target.points.length; index += 1) {
    const start = target.points[index - 1];
    const end = target.points[index];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (segmentLengthSquared === 0) {
      continue;
    }

    const projection =
      ((sample.point.x - start.x) * segmentX +
        (sample.point.y - start.y) * segmentY) /
      segmentLengthSquared;
    const ratio = Math.max(0, Math.min(1, projection));
    const closest = {
      x: start.x + segmentX * ratio,
      y: start.y + segmentY * ratio,
    };
    const distanceMeters = distanceBetweenPoints(sample.point, closest);
    const targetDirection = directionBetween(start, end);
    const directionAgreement = Math.abs(
      sample.direction.x * targetDirection.x +
        sample.direction.y * targetDirection.y,
    );
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { distanceMeters, directionAgreement };
    }
  }

  return nearest;
}

export function evaluateCoverage(
  source: ProjectedCorridor,
  target: ProjectedCorridor,
  options: CorridorCoverageOptions,
): { coverageRatio: number; directionAgreement: number } {
  const samples = samplePolyline(source, options.sampleSpacingMeters);
  if (samples.length === 0) {
    return { coverageRatio: 0, directionAgreement: 0 };
  }

  let coveredCount = 0;
  let directionSum = 0;
  for (const sample of samples) {
    const nearest = nearestPointOnPolyline(sample, target);
    if (
      nearest &&
      nearest.distanceMeters <= options.maxPointToCorridorDistanceMeters
    ) {
      coveredCount += 1;
      directionSum += nearest.directionAgreement;
    }
  }

  return {
    coverageRatio: coveredCount / samples.length,
    directionAgreement: coveredCount === 0 ? 0 : directionSum / coveredCount,
  };
}
