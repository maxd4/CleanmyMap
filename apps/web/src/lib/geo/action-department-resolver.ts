import type { ActionGeometryKind } from "../actions/types.ts";
import { logWarning } from "../logging/failure-log.ts";

export const ACTION_DEPARTMENT_GEO_API_BASE_URL = "https://geo.api.gouv.fr";
export const ACTION_DEPARTMENT_RESOLUTION_TIMEOUT_MS = 2_500;
const ACTION_DEPARTMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const ACTION_DEPARTMENT_CACHE_MAX_ENTRIES = 2_000;

export type Coordinate = readonly [number, number];

export type ActionDepartmentGeometry = {
  kind?: ActionGeometryKind | null;
  coordinates?: readonly Coordinate[] | null;
  geojson?: string | null;
};

export type ActionDepartmentResolutionInput = {
  latitude?: number | null;
  longitude?: number | null;
  geometry?: ActionDepartmentGeometry | null;
};

export type ResolvedDepartment = {
  departmentCode: string;
  departmentName: string;
};

type FetchLike = typeof fetch;

type CachedResolution = {
  expiresAt: number;
  value: ResolvedDepartment | null;
};

const departmentResolutionCache = new Map<string, CachedResolution>();

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isValidLatitude(value[0]) &&
    isValidLongitude(value[1])
  );
}

function normalizeCoordinates(value: unknown): Coordinate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isCoordinate).map(([latitude, longitude]) => [latitude, longitude]);
}

function parseGeoJsonCoordinates(
  geojson: string | null | undefined,
  kind: ActionGeometryKind | null | undefined,
): Coordinate[] {
  if (!geojson) {
    return [];
  }

  try {
    const parsed = JSON.parse(geojson) as {
      type?: unknown;
      coordinates?: unknown;
    };
    const type = parsed.type;
    if (type === "LineString" || kind === "polyline") {
      return normalizeCoordinatesFromGeoJson(parsed.coordinates);
    }
    if (type === "Polygon" || kind === "polygon") {
      const rings = parsed.coordinates;
      return Array.isArray(rings) ? normalizeCoordinatesFromGeoJson(rings[0]) : [];
    }
  } catch {
    return [];
  }
  return [];
}

function normalizeCoordinatesFromGeoJson(value: unknown): Coordinate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((point): point is [number, number] =>
      Array.isArray(point) &&
      point.length >= 2 &&
      isValidLongitude(point[0]) &&
      isValidLatitude(point[1]),
    )
    .map(([longitude, latitude]) => [latitude, longitude]);
}

function withoutClosingPolygonPoint(coordinates: Coordinate[]): Coordinate[] {
  if (coordinates.length < 2) {
    return coordinates;
  }
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first[0] === last[0] && first[1] === last[1]
    ? coordinates.slice(0, -1)
    : coordinates;
}

/**
 * Selects one statistical coordinate without claiming that the whole drawing
 * belongs to the resulting department. Drawing coordinates are [latitude,
 * longitude], matching the canonical action contract.
 */
export function resolveActionDepartmentAnchor(
  input: ActionDepartmentResolutionInput,
): Coordinate | null {
  const geometry = input.geometry ?? null;
  const geometryCoordinates = normalizeCoordinates(
    geometry?.coordinates ??
      parseGeoJsonCoordinates(geometry?.geojson, geometry?.kind),
  );

  if (geometryCoordinates.length > 0 && geometry?.kind === "polyline") {
    return geometryCoordinates[0];
  }

  if (geometryCoordinates.length > 0 && geometry?.kind === "polygon") {
    const polygonCoordinates = withoutClosingPolygonPoint(geometryCoordinates);
    if (polygonCoordinates.length > 0) {
      const total = polygonCoordinates.reduce(
        (accumulator, [latitude, longitude]) => ({
          latitude: accumulator.latitude + latitude,
          longitude: accumulator.longitude + longitude,
        }),
        { latitude: 0, longitude: 0 },
      );
      return [
        total.latitude / polygonCoordinates.length,
        total.longitude / polygonCoordinates.length,
      ];
    }
  }

  if (geometryCoordinates.length > 0 && geometry?.kind === "point") {
    return geometryCoordinates[0];
  }

  if (isValidLatitude(input.latitude) && isValidLongitude(input.longitude)) {
    return [input.latitude, input.longitude];
  }

  return null;
}

function cacheKey([latitude, longitude]: Coordinate): string {
  return `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

function readCachedResolution(key: string): ResolvedDepartment | null | undefined {
  const cached = departmentResolutionCache.get(key);
  if (!cached) {
    return undefined;
  }
  if (cached.expiresAt <= Date.now()) {
    departmentResolutionCache.delete(key);
    return undefined;
  }
  return cached.value;
}

function writeCachedResolution(key: string, value: ResolvedDepartment | null): void {
  if (departmentResolutionCache.size >= ACTION_DEPARTMENT_CACHE_MAX_ENTRIES) {
    const oldestKey = departmentResolutionCache.keys().next().value;
    if (oldestKey) {
      departmentResolutionCache.delete(oldestKey);
    }
  }
  departmentResolutionCache.set(key, {
    expiresAt: Date.now() + ACTION_DEPARTMENT_CACHE_TTL_MS,
    value,
  });
}

async function fetchJsonWithTimeout(
  fetchImpl: FetchLike,
  url: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACTION_DEPARTMENT_RESOLUTION_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Geo API HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function readStringField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseCommunePayload(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const first = value[0];
  if (!first || typeof first !== "object") {
    return null;
  }
  return readStringField((first as { codeDepartement?: unknown }).codeDepartement);
}

function parseDepartmentPayload(value: unknown): ResolvedDepartment | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as { code?: unknown; nom?: unknown };
  const departmentCode = readStringField(record.code);
  const departmentName = readStringField(record.nom);
  return departmentCode && departmentName ? { departmentCode, departmentName } : null;
}

async function resolveFromCoordinates(
  [latitude, longitude]: Coordinate,
  fetchImpl: FetchLike,
): Promise<ResolvedDepartment | null> {
  const communeUrl = new URL(`${ACTION_DEPARTMENT_GEO_API_BASE_URL}/communes`);
  communeUrl.searchParams.set("lat", String(latitude));
  communeUrl.searchParams.set("lon", String(longitude));
  communeUrl.searchParams.set("fields", "nom,code,codeDepartement");
  communeUrl.searchParams.set("format", "json");
  communeUrl.searchParams.set("limit", "1");

  const codeDepartement = parseCommunePayload(
    await fetchJsonWithTimeout(fetchImpl, communeUrl.toString()),
  );
  if (!codeDepartement) {
    return null;
  }

  const departmentUrl = new URL(
    `${ACTION_DEPARTMENT_GEO_API_BASE_URL}/departements/${encodeURIComponent(codeDepartement)}`,
  );
  departmentUrl.searchParams.set("fields", "nom,code");
  departmentUrl.searchParams.set("format", "json");

  return parseDepartmentPayload(
    await fetchJsonWithTimeout(fetchImpl, departmentUrl.toString()),
  );
}

export async function resolveActionDepartmentFromCoordinates(
  coordinate: Coordinate,
  options: { fetchImpl?: FetchLike } = {},
): Promise<ResolvedDepartment | null> {
  const key = cacheKey(coordinate);
  const cached = readCachedResolution(key);
  if (cached !== undefined && !options.fetchImpl) {
    return cached;
  }

  try {
    const value = await resolveFromCoordinates(coordinate, options.fetchImpl ?? fetch);
    if (!options.fetchImpl) {
      writeCachedResolution(key, value);
    }
    return value;
  } catch (error) {
    logWarning("Geo/ActionDepartment", "Department resolution failed", {
      latitude: coordinate[0],
      longitude: coordinate[1],
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function resolveActionDepartment(
  input: ActionDepartmentResolutionInput,
  options: { fetchImpl?: FetchLike } = {},
): Promise<ResolvedDepartment | null> {
  const anchor = resolveActionDepartmentAnchor(input);
  return anchor ? resolveActionDepartmentFromCoordinates(anchor, options) : null;
}

export async function resolveActionDepartmentForPersistence(
  input: ActionDepartmentResolutionInput & {
    departmentCode?: string | null;
    departmentName?: string | null;
  },
  options: { fetchImpl?: FetchLike } = {},
): Promise<{ departmentCode: string | null; departmentName: string | null }> {
  const explicitCode = readStringField(input.departmentCode);
  const explicitName = readStringField(input.departmentName);
  if (explicitCode && explicitName) {
    return { departmentCode: explicitCode, departmentName: explicitName };
  }

  const resolved = await resolveActionDepartment(input, options);
  return resolved
    ? resolved
    : { departmentCode: explicitCode, departmentName: explicitName };
}
