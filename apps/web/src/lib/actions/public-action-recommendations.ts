import { toActionContract } from "./unified-source/contracts";
import type { ActionRow } from "@/types/database";
import {
  ALL_NEIGHBORHOODS,
  getNeighbors,
  getSuburbsForDistrict,
} from "@/lib/geo/paris-neighborhood";
import { getPublicActionShareKind } from "@/lib/chat/action-sharing";

export type PublicActionRecommendation = {
  id: string;
  title: string;
  actionDate: string;
  eventStartTime: string | null;
  sector: string;
};

type PublicActionTerritory = {
  key: string;
  label: string;
  kind: "zone" | "department";
  adjacentKeys: ReadonlySet<string>;
};

function normalizeTerritoryLabel(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("fr-FR");
}
function resolveCanonicalZone(action: Pick<ActionRow, "location_label" | "department_code">): PublicActionTerritory | null {
  const label = normalizeTerritoryLabel(action.location_label);
  if (!label) return null;

  const matches = ALL_NEIGHBORHOODS.filter((zone) =>
    normalizeTerritoryLabel(zone.name) === label &&
    (!action.department_code || zone.department === action.department_code.trim().toUpperCase()),
  );
  if (matches.length !== 1) return null;

  const zone = matches[0];
  const key = `zone:${zone.department}:${normalizeTerritoryLabel(zone.name)}`;
  const adjacentKeys = new Set<string>();
  const neighbors = [...getNeighbors(zone.name)];
  if (zone.department === "75") {
    const districtNumber = Number.parseInt(zone.name, 10);
    if (Number.isInteger(districtNumber)) neighbors.push(...getSuburbsForDistrict(districtNumber));
  }
  for (const neighbor of neighbors) {
    const neighborMatches = ALL_NEIGHBORHOODS.filter(
      (candidate) => normalizeTerritoryLabel(candidate.name) === normalizeTerritoryLabel(neighbor),
    );
    if (neighborMatches.length === 1) {
      const neighborZone = neighborMatches[0];
      adjacentKeys.add(`zone:${neighborZone.department}:${normalizeTerritoryLabel(neighborZone.name)}`);
    }
  }
  return {
    key,
    label: zone.name,
    kind: "zone",
    adjacentKeys,
  };
}

export function resolveCanonicalPublicActionTerritory(
  action: Pick<ActionRow, "location_label" | "department_code" | "department_name">,
): { key: string; label: string; kind: "zone" | "department" } | null {
  const zone = resolveCanonicalZone(action);
  if (zone) return { key: zone.key, label: zone.label, kind: zone.kind };

  const departmentCode = action.department_code?.trim().toUpperCase() ?? "";
  if (!departmentCode) return null;
  const departmentLabel = action.department_name?.trim() || departmentCode;
  return {
    key: `department:${departmentCode}`,
    label: departmentLabel,
    kind: "department",
  };
}

function territoryForRanking(
  action: Pick<ActionRow, "location_label" | "department_code" | "department_name">,
): PublicActionTerritory | null {
  const zone = resolveCanonicalZone(action);
  if (zone) return zone;

  const departmentCode = action.department_code?.trim().toUpperCase() ?? "";
  if (!departmentCode) return null;
  return {
    key: `department:${departmentCode}`,
    label: action.department_name?.trim() || departmentCode,
    kind: "department",
    adjacentKeys: new Set(),
  };
}

function recommendationRank(
  source: PublicActionTerritory,
  candidate: PublicActionTerritory,
): number | null {
  if (source.key === candidate.key) return 0;
  if (source.kind === "zone" && candidate.kind === "zone" && source.adjacentKeys.has(candidate.key)) {
    return 1;
  }
  return null;
}

function compareRecommendations(
  left: { rank: number; row: ActionRow },
  right: { rank: number; row: ActionRow },
): number {
  if (left.rank !== right.rank) return left.rank - right.rank;
  const dateOrder = left.row.action_date.localeCompare(right.row.action_date);
  if (dateOrder !== 0) return dateOrder;
  const leftTime = left.row.event_start_time ?? "99:99";
  const rightTime = right.row.event_start_time ?? "99:99";
  const timeOrder = leftTime.localeCompare(rightTime);
  if (timeOrder !== 0) return timeOrder;
  return left.row.id.localeCompare(right.row.id);
}

function toRecommendation(row: ActionRow, territory: PublicActionTerritory): PublicActionRecommendation {
  const contract = toActionContract(row);
  return {
    id: row.id,
    title: contract.metadata.preparationData?.actionTitle?.trim() || row.location_label,
    actionDate: row.action_date,
    eventStartTime: row.event_start_time ?? null,
    sector: territory.label,
  };
}

export function derivePublicActionRecommendations(
  source: ActionRow,
  candidates: readonly ActionRow[],
  now = new Date(),
): PublicActionRecommendation[] {
  if (getPublicActionShareKind(source, now) !== "result") return [];
  const sourceTerritory = territoryForRanking(source);
  if (!sourceTerritory) return [];

  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      if (candidate.id === source.id || seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return getPublicActionShareKind(candidate, now) === "invitation" && candidate.access_mode !== "invite_link";
    })
    .map((row) => {
      const territory = territoryForRanking(row);
      if (!territory) return null;
      const rank = recommendationRank(sourceTerritory, territory);
      return rank === null ? null : { rank, row, territory };
    })
    .filter((value): value is { rank: number; row: ActionRow; territory: PublicActionTerritory } => value !== null)
    .sort(compareRecommendations)
    .slice(0, 3)
    .map(({ row, territory }) => toRecommendation(row, territory));
}
