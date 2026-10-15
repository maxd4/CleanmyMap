import type { SpogomiCategoryRule, SpogomiRegulation } from "./types";

export type SpogomiEventRegulationRow = {
  id: string;
  name: string;
  event_slug: string | null;
  mode: "casual" | "world_cup" | "mixed";
  state: string;
  regulation_version: string;
  regulation_status: "incomplete" | "complete";
  regulation_source_reference: string | null;
  regulation_config: unknown;
  team_size_config: unknown;
  division_id?: string;
};

export type SpogomiCategoryRegulationRow = {
  id: string;
  event_id: string;
  regulation_version: string;
  code: string;
  label: string;
  measurement_kind: SpogomiCategoryRule["measurementKind"];
  unit: string;
  coefficient: number | string | null;
  coefficient_status: SpogomiCategoryRule["coefficientStatus"];
  environmental_category_slug: string | null;
  display_order: number;
  is_complete: boolean;
};

function asConfig(value: unknown): Pick<SpogomiRegulation, "rounding" | "penalties" | "eligibility" | "tiebreakers"> {
  return value && typeof value === "object" ? value as Pick<SpogomiRegulation, "rounding" | "penalties" | "eligibility" | "tiebreakers"> : {};
}

function asTeamSize(value: unknown): SpogomiRegulation["teamSize"] {
  const raw = value && typeof value === "object" ? value as { casual?: { minMembers?: unknown; maxMembers?: unknown } } : {};
  return { casual: { minMembers: typeof raw.casual?.minMembers === "number" ? raw.casual.minMembers : null, maxMembers: typeof raw.casual?.maxMembers === "number" ? raw.casual.maxMembers : null } };
}

export function buildSpogomiRegulation(event: SpogomiEventRegulationRow, categoryRows: SpogomiCategoryRegulationRow[]): SpogomiRegulation {
  const config = asConfig(event.regulation_config);
  return {
    ...(event.division_id ? { divisionId: event.division_id } : {}),
    version: event.regulation_version,
    sourceReference: event.regulation_source_reference,
    status: event.regulation_status,
    teamSize: asTeamSize(event.team_size_config),
    rounding: config.rounding,
    penalties: config.penalties,
    eligibility: config.eligibility,
    tiebreakers: config.tiebreakers,
    categories: categoryRows.slice().sort((left, right) => left.display_order - right.display_order).map((category) => ({
      code: String(category.code), label: String(category.label), measurementKind: category.measurement_kind, unit: String(category.unit),
      coefficient: category.coefficient === null ? null : Number(category.coefficient), coefficientStatus: category.coefficient_status,
      environmentalCategorySlug: category.environmental_category_slug, isComplete: Boolean(category.is_complete) && category.regulation_version === event.regulation_version,
    })),
  };
}
