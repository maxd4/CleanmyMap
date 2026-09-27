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

type ResolvedTerritoryPart = {
  code: string;
  name: string;
};

export type ResolvedActionTerritory = {
  commune: ResolvedTerritoryPart | null;
  department: ResolvedTerritoryPart | null;
  region: ResolvedTerritoryPart | null;
  specialTerritory: ResolvedTerritoryPart | null;
  source: "geo.api.gouv.fr" | "persisted_department";
};

function parseTerritoryPart(value: unknown): ResolvedTerritoryPart | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as { code?: unknown; nom?: unknown };
  const code = readStringField(record.code);
  const name = readStringField(record.nom);
  return code && name ? { code, name } : null;
}

function parseCommuneTerritoryPayload(value: unknown): {
  commune: ResolvedTerritoryPart;
  departmentCode: string | null;
  regionCode: string | null;
} | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const first = value[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const record = first as {
    code?: unknown;
    nom?: unknown;
    codeDepartement?: unknown;
    codeRegion?: unknown;
  };
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
  return {
    commune: parsedCommune.commune,
    department,
    region,
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
