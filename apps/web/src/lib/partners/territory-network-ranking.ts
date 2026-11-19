import { haversineDistanceKm, type GeodesicCoordinate } from "@/lib/geo/geodesic-distance";
import type {
  TerritoryLocationSelection,
  UserLocationPreferences,
} from "@/lib/user-location-preference";
import type { TerritoryEntry } from "./territory-network-catalog";
import { TERRITORY_NETWORK_CATALOG } from "./territory-network-catalog.data";

export type TerritoryRankingSource = "gps" | "account_preferences" | "default_insee";

export interface RankedTerritoriesResult {
  suggestions: [TerritoryEntry, TerritoryEntry];
  remaining: TerritoryEntry[];
  rankingSource: TerritoryRankingSource;
  isGeodesicApproximation: boolean;
}

export function normalizeTerritorySearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchTerritories(
  query: string,
  entries: readonly TerritoryEntry[] = TERRITORY_NETWORK_CATALOG,
): TerritoryEntry[] {
  const normalized = normalizeTerritorySearchText(query);
  if (!normalized) {
    return [...entries];
  }
  return entries.filter((entry) => {
    const haystack = [
      entry.code,
      entry.nameFr,
      entry.nameEn,
      entry.countryNameFr,
      entry.countryCode,
      entry.id,
    ]
      .map(normalizeTerritorySearchText)
      .join(" ");
    return haystack.includes(normalized);
  });
}

function compareTerritoriesDeterministically(
  left: TerritoryEntry,
  right: TerritoryEntry,
): number {
  const leftIsFrench = left.countryCode === "FR";
  const rightIsFrench = right.countryCode === "FR";
  if (leftIsFrench !== rightIsFrench) {
    return leftIsFrench ? -1 : 1;
  }
  if (leftIsFrench && rightIsFrench) {
    const leftNum = Number.parseInt(left.code, 10);
    const rightNum = Number.parseInt(right.code, 10);
    if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum) && leftNum !== rightNum) {
      return leftNum - rightNum;
    }
    return left.code.localeCompare(right.code, "fr");
  }
  return left.code.localeCompare(right.code, "fr") || left.nameFr.localeCompare(right.nameFr, "fr");
}

export function resolveTerritoryFromLocationSelection(
  selection: TerritoryLocationSelection | null,
  entries: readonly TerritoryEntry[] = TERRITORY_NETWORK_CATALOG,
): TerritoryEntry | null {
  if (!selection) {
    return null;
  }

  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  if (selection.country === "FR") {
    // Paris / Lyon / Marseille arrondissements map reliably to their COG region.
    if (selection.arrondissementCity === "Paris" || selection.arrondissement !== null) {
      if (selection.arrondissementCity === "Lyon") {
        return byId.get("FR:REG:84") ?? null;
      }
      if (selection.arrondissementCity === "Marseille") {
        return byId.get("FR:REG:93") ?? null;
      }
      return byId.get("FR:REG:11") ?? null;
    }

    const adminCode = selection.administrativeCode?.trim() ?? "";
    if (selection.level === "region" && adminCode) {
      const normalizedCode = adminCode.replace(/^FR[-:]/i, "");
      const directRegion = byId.get(`FR:REG:${normalizedCode}`) ?? byId.get(`FR:COM:${normalizedCode}`);
      if (directRegion) {
        return directRegion;
      }
    }

    if (adminCode && /^(975|977|978|984|986|987|988|989)$/.test(adminCode)) {
      return byId.get(`FR:COM:${adminCode}`) ?? null;
    }

    const labelNorm = normalizeTerritorySearchText(
      `${selection.label} ${selection.subtitle ?? ""}`,
    );
    const frenchMatch = entries.find(
      (entry) =>
        entry.countryCode === "FR" &&
        labelNorm.includes(normalizeTerritorySearchText(entry.nameFr)),
    );
    return frenchMatch ?? null;
  }

  // Foreign country: match OIF subdivision or Francophone subdivision first, then OIF country code; never infer a French region.
  const adminCode = selection.administrativeCode?.trim().toUpperCase() ?? "";
  if (adminCode) {
    const subMatch =
      byId.get(`OIF:${adminCode}`) ??
      byId.get(`OIF:${selection.country}-${adminCode}`) ??
      byId.get(`SUB:${adminCode}`) ??
      byId.get(`SUB:${selection.country}-${adminCode}`);
    if (subMatch) {
      return subMatch;
    }
  }

  const labelNorm = normalizeTerritorySearchText(
    `${selection.label} ${selection.subtitle ?? ""}`,
  );
  const subdivisionMatch = entries.find(
    (entry) =>
      entry.countryCode === selection.country &&
      (entry.adminLevel === "oif_subdivision" ||
        entry.adminLevel === "subdivision_francophone") &&
      labelNorm.includes(
        normalizeTerritorySearchText(entry.nameFr.replace(/\s*\(canton\)/i, "")),
      ),
  );
  if (subdivisionMatch) {
    return subdivisionMatch;
  }

  return byId.get(`OIF:${selection.country}`) ?? null;
}

export function rankTerritoriesByContext({
  gpsCoords = null,
  locationPreferences = null,
  entries = TERRITORY_NETWORK_CATALOG,
}: {
  gpsCoords?: GeodesicCoordinate | null;
  locationPreferences?: UserLocationPreferences | null;
  entries?: readonly TerritoryEntry[];
}): RankedTerritoriesResult {
  const sortedDefault = [...entries].sort(compareTerritoriesDeterministically);

  // Priority a: GPS coordinates (populated territories only; uninhabited 984/989 excluded)
  if (gpsCoords) {
    const withDistance = entries
      .filter(
        (entry): entry is TerritoryEntry & { representativePoint: [number, number] } =>
          entry.hasPermanentPopulation && entry.representativePoint !== null,
      )
      .map((entry) => ({
        entry,
        distanceKm: haversineDistanceKm(gpsCoords, entry.representativePoint),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (withDistance.length >= 2) {
      const first = withDistance[0].entry;
      const second =
        withDistance.find(
          (item) =>
            item.entry.id !== first.id &&
            haversineDistanceKm(first.representativePoint, item.entry.representativePoint) >= 1,
        )?.entry ?? withDistance[1].entry;
      const suggestionIds = new Set([first.id, second.id]);
      return {
        suggestions: [first, second],
        remaining: sortedDefault.filter((item) => !suggestionIds.has(item.id)),
        rankingSource: "gps",
        isGeodesicApproximation: true,
      };
    }
  }

  // Priority b: Clerk canonical residence & work preferences
  const resolvedSuggestions: TerritoryEntry[] = [];
  if (locationPreferences) {
    const residenceTerritory = resolveTerritoryFromLocationSelection(
      locationPreferences.residence,
      entries,
    );
    const workTerritory = resolveTerritoryFromLocationSelection(
      locationPreferences.work,
      entries,
    );
    for (const candidate of [residenceTerritory, workTerritory]) {
      if (candidate && !resolvedSuggestions.some((item) => item.id === candidate.id)) {
        resolvedSuggestions.push(candidate);
      }
    }
  }

  const rankingSource: TerritoryRankingSource =
    resolvedSuggestions.length > 0 ? "account_preferences" : "default_insee";

  // Complete up to 2 distinct suggestions deterministically
  for (const fallback of sortedDefault) {
    if (resolvedSuggestions.length >= 2) {
      break;
    }
    if (!resolvedSuggestions.some((item) => item.id === fallback.id)) {
      resolvedSuggestions.push(fallback);
    }
  }

  const suggestions: [TerritoryEntry, TerritoryEntry] = [
    resolvedSuggestions[0],
    resolvedSuggestions[1],
  ];
  const suggestionIds = new Set(suggestions.map((item) => item.id));

  return {
    suggestions,
    remaining: sortedDefault.filter((item) => !suggestionIds.has(item.id)),
    rankingSource,
    isGeodesicApproximation: false,
  };
}
