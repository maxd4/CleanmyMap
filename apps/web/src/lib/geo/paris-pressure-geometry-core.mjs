const LONGITUDE_KM = 73;
const LATITUDE_KM = 111;
const EPSILON = 1e-10;

function isFiniteCoordinate(coordinate) {
  return Array.isArray(coordinate) &&
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1]);
}

function isValidRing(ring) {
  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isFiniteCoordinate)) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function isValidPolygonCoordinates(coordinates) {
  return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(isValidRing);
}

export function isValidParisPressureGeometry(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.type === "Polygon") return isValidPolygonCoordinates(geometry.coordinates);
  return geometry.type === "MultiPolygon" && geometry.coordinates.length > 0 &&
    geometry.coordinates.every(isValidPolygonCoordinates);
}

function pointOnSegment(point, start, end) {
  const cross = (point.longitude - start[0]) * (end[1] - start[1]) -
    (point.latitude - start[1]) * (end[0] - start[0]);
  if (Math.abs(cross) > EPSILON) return false;
  return point.longitude >= Math.min(start[0], end[0]) - EPSILON &&
    point.longitude <= Math.max(start[0], end[0]) + EPSILON &&
    point.latitude >= Math.min(start[1], end[1]) - EPSILON &&
    point.latitude <= Math.max(start[1], end[1]) + EPSILON;
}

function ringContains(point, ring) {
  let inside = false;
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if (pointOnSegment(point, start, end)) return "boundary";
    const crosses = (start[1] > point.latitude) !== (end[1] > point.latitude) &&
      point.longitude < ((end[0] - start[0]) * (point.latitude - start[1])) /
        (end[1] - start[1]) + start[0];
    if (crosses) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

function polygonContains(point, rings) {
  const [outer, ...holes] = rings;
  if (ringContains(point, outer) === "outside") return false;
  return !holes.some((hole) => ringContains(point, hole) === "inside");
}

export function pointInParisPressureGeometry(point, geometry) {
  if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude) ||
      !isValidParisPressureGeometry(geometry)) return false;
  return geometry.type === "Polygon"
    ? polygonContains(point, geometry.coordinates)
    : geometry.coordinates.some((polygon) => polygonContains(point, polygon));
}

function ringAreaKm2(ring) {
  const origin = ring[0];
  let area = 0;
  for (let index = 1; index < ring.length - 1; index += 1) {
    const first = ring[index];
    const second = ring[index + 1];
    const ax = (first[0] - origin[0]) * LONGITUDE_KM;
    const ay = (first[1] - origin[1]) * LATITUDE_KM;
    const bx = (second[0] - origin[0]) * LONGITUDE_KM;
    const by = (second[1] - origin[1]) * LATITUDE_KM;
    area += (ax * by - bx * ay) / 2;
  }
  return Math.abs(area);
}

function polygonAreaKm2(rings) {
  const [outer, ...holes] = rings;
  return Math.max(0, ringAreaKm2(outer) - holes.reduce((sum, hole) => sum + ringAreaKm2(hole), 0));
}

export function parisPressureGeometryAreaKm2(geometry) {
  if (!isValidParisPressureGeometry(geometry)) return null;
  const area = geometry.type === "Polygon"
    ? polygonAreaKm2(geometry.coordinates)
    : geometry.coordinates.reduce((sum, polygon) => sum + polygonAreaKm2(polygon), 0);
  return area > 0 && Number.isFinite(area) ? area : null;
}
