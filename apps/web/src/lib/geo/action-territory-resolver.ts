import {
  ACTION_DEPARTMENT_GEO_API_BASE_URL,
  fetchJsonWithTimeout,
  readStringField,
  resolveActionDepartmentAnchor,
  type ActionDepartmentResolutionInput,
  type Coordinate,
  type FetchLike,
} from "./action-department-resolver";
import { logWarning } from "../logging/failure-log";

export const ACTION_ADDRESS_GEO_API_BASE_URL = "https://api-adresse.data.gouv.fr";

type ResolvedTerritoryPart = {
  code: string;
  name: string;
};

export type ResolvedActionTerritory = {
  commune: ResolvedTerritoryPart | null;
  department: ResolvedTerritoryPart | null;
  region: ResolvedTerritoryPart | null;
  /** Municipal arrondissement, only when the official city code is resolved. */
  arrondissement?: ResolvedTerritoryPart | null;
  specialTerritory: ResolvedTerritoryPart | null;
  source: "geo.api.gouv.fr" | "persisted_department";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function parseTerritoryPart(value: unknown): ResolvedTerritoryPart | null {
  if (!isRecord(value)) {
    return null;
  }

  const code = readStringField(value.code);
  const name = readStringField(value.nom);
  return code && name ? { code, name } : null;
}

function parseCommuneTerritoryPayload(value: unknown): {
  commune: ResolvedTerritoryPart;
  departmentCode: string | null;
  regionCode: string | null;
} | null {
  if (!isUnknownArray(value) || value.length === 0) {
    return null;
  }

  const first = value[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const record = isRecord(first) ? first : null;
  if (!record) return null;
  const communeCode = readStringField(record.code);
  const communeName = readStringField(record.nom);
  if (!communeCode || !communeName) {
    return null;
  }

  return {
    commune: { code: communeCode, name: communeName },
    departmentCode: readStringField(record.codeDepartement),
    regionCode: readStringField(record.codeRegion),
  };
}

function specialTerritoryForResolvedParts(
  department: ResolvedTerritoryPart | null,
): ResolvedTerritoryPart | null {
  return department?.code === "75" ? { code: "FR-PARIS", name: "Paris" } : null;
}

const MUNICIPAL_ARRONDISSEMENT_PARENTS = new Map([
  ["75056", { min: 75101, max: 75120, city: "Paris" }],
  ["69123", { min: 69381, max: 69389, city: "Lyon" }],
  ["13055", { min: 13201, max: 13216, city: "Marseille" }],
]);

function parseAddressFeatures(value: unknown): ResolvedTerritoryPart | null {
  if (!isRecord(value) || !Array.isArray(value.features) || value.features.length === 0) {
    return null;
  }
  const feature = value.features[0];
  if (!isRecord(feature) || !isRecord(feature.properties)) return null;
  const cityCode = readStringField(feature.properties.citycode);
  const district = readStringField(feature.properties.district);
  if (!cityCode || !district || !/^\d{5}$/.test(cityCode)) return null;
  return { code: cityCode, name: district };
}

async function resolveMunicipalArrondissement(
  coordinate: Coordinate,
  communeCode: string,
  fetchImpl: FetchLike,
): Promise<ResolvedTerritoryPart | null> {
  const parent = MUNICIPAL_ARRONDISSEMENT_PARENTS.get(communeCode);
  if (!parent) return null;

  const url = new URL(`${ACTION_ADDRESS_GEO_API_BASE_URL}/reverse/`);
  url.searchParams.set("lon", String(coordinate[1]));
  url.searchParams.set("lat", String(coordinate[0]));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("limit", "1");
  try {
    const arrondissement = parseAddressFeatures(
      await fetchJsonWithTimeout(fetchImpl, url.toString()),
    );
    if (!arrondissement) return null;
    const numericCode = Number(arrondissement.code);
    return numericCode >= parent.min && numericCode <= parent.max
      ? arrondissement
      : null;
  } catch {
    return null;
  }
}

async function resolveTerritoryFromCoordinates(
  [latitude, longitude]: Coordinate,
  fetchImpl: FetchLike,
): Promise<ResolvedActionTerritory | null> {
  const communeUrl = new URL(`${ACTION_DEPARTMENT_GEO_API_BASE_URL}/communes`);
  communeUrl.searchParams.set("lat", String(latitude));
  communeUrl.searchParams.set("lon", String(longitude));
  communeUrl.searchParams.set("fields", "nom,code,codeDepartement,codeRegion");
  communeUrl.searchParams.set("format", "json");
  communeUrl.searchParams.set("limit", "1");

  const parsedCommune = parseCommuneTerritoryPayload(
    await fetchJsonWithTimeout(fetchImpl, communeUrl.toString()),
  );
  if (!parsedCommune) {
    return null;
  }

  const department = await resolveNamedTerritoryPart(
    "departements",
    parsedCommune.departmentCode,
    fetchImpl,
  );
  const region = await resolveNamedTerritoryPart(
    "regions",
    parsedCommune.regionCode,
    fetchImpl,
  );
  const arrondissement = await resolveMunicipalArrondissement(
    [latitude, longitude],
    parsedCommune.commune.code,
    fetchImpl,
  );
  return {
    commune: parsedCommune.commune,
    department,
    region,
    ...(arrondissement ? { arrondissement } : {}),
    specialTerritory: specialTerritoryForResolvedParts(
      department ??
        (parsedCommune.departmentCode
          ? { code: parsedCommune.departmentCode, name: parsedCommune.departmentCode }
          : null),
    ),
    source: "geo.api.gouv.fr",
  };
}

async function resolveNamedTerritoryPart(
  endpoint: "departements" | "regions",
  code: string | null,
  fetchImpl: FetchLike,
): Promise<ResolvedTerritoryPart | null> {
  if (!code) {
    return null;
  }
  const url = new URL(
    `${ACTION_DEPARTMENT_GEO_API_BASE_URL}/${endpoint}/${encodeURIComponent(code)}`,
  );
  url.searchParams.set("fields", "nom,code");
  url.searchParams.set("format", "json");
  try {
    return parseTerritoryPart(await fetchJsonWithTimeout(fetchImpl, url.toString()));
  } catch {
    return null;
  }
}

async function resolveActionTerritoryFromCoordinates(
  coordinate: Coordinate,
  options: { fetchImpl?: FetchLike } = {},
): Promise<ResolvedActionTerritory | null> {
  try {
    return await resolveTerritoryFromCoordinates(coordinate, options.fetchImpl ?? fetch);
  } catch (error) {
    logWarning("Geo/ActionTerritory", "Territory resolution failed", {
      latitude: coordinate[0],
      longitude: coordinate[1],
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function resolveActionTerritory(
  input: ActionDepartmentResolutionInput,
  options: { fetchImpl?: FetchLike } = {},
): Promise<ResolvedActionTerritory | null> {
  const anchor = resolveActionDepartmentAnchor(input);
  if (anchor) {
    const resolved = await resolveActionTerritoryFromCoordinates(anchor, options);
    if (resolved) {
      return resolved;
    }
  }

  const departmentCode = input.departmentCode?.trim() ?? "";
  const departmentName = input.departmentName?.trim() ?? "";
  if (!departmentCode || !departmentName) {
    return null;
  }
  const department = { code: departmentCode, name: departmentName };
  return {
    commune: null,
    department,
    region: null,
    specialTerritory: specialTerritoryForResolvedParts(department),
    source: "persisted_department",
  };
}
