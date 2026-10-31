import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionContext } from "./action-context";

export type ActionCollectionReferenceAverages = {
  wastePerVolunteer: number | null;
  buttsPerVolunteer: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
  eligibleActionCount: number;
  updatedAt: string | null;
};

export type ActionCollectionContextReference = {
  actionContext: ActionContext;
  wastePerEffectiveUnit: number | null;
  buttsPerEffectiveUnit: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
  eligibleActionCount: number;
  formulaVersion: string;
  updatedAt: string | null;
};

export type ActionCollectionContextReferences = Partial<
  Record<ActionContext, ActionCollectionContextReference>
>;

export function deriveContextualCollectionUnits(params: {
  actionContext: ActionContext | null | undefined;
  childrenCount: number | null;
  adultCount: number | null;
  retiredCount: number | null;
}): { wasteUnits: number | null; buttsUnits: number | null } {
  const values = [params.childrenCount, params.adultCount, params.retiredCount];
  if (values.some((value) => value === null || !Number.isInteger(value) || value < 0)) {
    return { wasteUnits: null, buttsUnits: null };
  }
  const children = params.childrenCount as number;
  const adults = params.adultCount as number;
  const retired = params.retiredCount as number;
  if (params.actionContext === "school") {
    if (retired !== 0) return { wasteUnits: null, buttsUnits: null };
    const wasteUnits = adults + 0.45 * children;
    return {
      wasteUnits: wasteUnits > 0 ? wasteUnits : null,
      buttsUnits: adults > 0 ? adults : null,
    };
  }
  if (params.actionContext !== "citizen" && params.actionContext !== "company") {
    return { wasteUnits: null, buttsUnits: null };
  }
  const units = adults + 0.5 * children + 0.5 * retired;
  return { wasteUnits: units > 0 ? units : null, buttsUnits: units > 0 ? units : null };
}

type ActionCollectionReferenceAverageRow = {
  waste_per_volunteer?: number | string | null;
  butts_per_volunteer?: number | string | null;
  waste_source_count?: number | string | null;
  butts_source_count?: number | string | null;
  eligible_action_count?: number | string | null;
  updated_at?: string | null;
};

type ActionCollectionContextReferenceRow = {
  action_context?: string | null;
  waste_per_effective_unit?: number | string | null;
  butts_per_effective_unit?: number | string | null;
  waste_source_count?: number | string | null;
  butts_source_count?: number | string | null;
  eligible_action_count?: number | string | null;
  formula_version?: string | null;
  updated_at?: string | null;
};

const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: ActionCollectionReferenceAverages | null }
  | null = null;
let serverFetchInFlight: Promise<ActionCollectionReferenceAverages | null> | null = null;

function toNonNegativeInteger(value: number | string | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0 ? candidate : null;
}

function toNonNegativeNumber(value: number | string | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
}

export function normalizeActionCollectionReferenceAverageRow(
  row: ActionCollectionReferenceAverageRow | null | undefined,
): ActionCollectionReferenceAverages | null {
  if (!row) {
    return null;
  }

  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const eligibleActionCount = toNonNegativeInteger(row.eligible_action_count);
  if (wasteSourceCount === null || buttsSourceCount === null || eligibleActionCount === null) {
    return null;
  }

  return {
    wastePerVolunteer: toNonNegativeNumber(row.waste_per_volunteer),
    buttsPerVolunteer: toNonNegativeNumber(row.butts_per_volunteer),
    wasteSourceCount,
    buttsSourceCount,
    eligibleActionCount,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function fetchActionCollectionReferenceAverages(
  supabase: SupabaseClient,
): Promise<ActionCollectionReferenceAverages | null> {
  const result = await supabase.rpc("action_collection_reference_averages_v1");
  if (result.error) {
    throw result.error;
  }

  const row = Array.isArray(result.data)
    ? (result.data[0] as ActionCollectionReferenceAverageRow | undefined)
    : (result.data as ActionCollectionReferenceAverageRow | null);
  return normalizeActionCollectionReferenceAverageRow(row);
}

export async function loadActionCollectionReferenceAverages(): Promise<ActionCollectionReferenceAverages | null> {
  const now = Date.now();
  if (serverCache && serverCache.expiresAt > now) {
    return serverCache.references;
  }
  if (serverFetchInFlight) {
    return serverFetchInFlight;
  }

  serverFetchInFlight = fetchActionCollectionReferenceAverages(getSupabaseServerClient(true))
    .then((references) => {
      serverCache = { references, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return references;
    })
    .finally(() => {
      serverFetchInFlight = null;
    });

  return serverFetchInFlight;
}

export function normalizeActionCollectionContextReferenceRow(
  row: ActionCollectionContextReferenceRow | null | undefined,
): ActionCollectionContextReference | null {
  if (!row || !["citizen", "company", "school"].includes(row.action_context ?? "")) {
    return null;
  }
  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const eligibleActionCount = toNonNegativeInteger(row.eligible_action_count);
  if (
    wasteSourceCount === null ||
    buttsSourceCount === null ||
    eligibleActionCount === null ||
    typeof row.formula_version !== "string" ||
    row.formula_version.trim() === ""
  ) {
    return null;
  }
  return {
    actionContext: row.action_context as ActionContext,
    wastePerEffectiveUnit: toNonNegativeNumber(row.waste_per_effective_unit),
    buttsPerEffectiveUnit: toNonNegativeNumber(row.butts_per_effective_unit),
    wasteSourceCount,
    buttsSourceCount,
    eligibleActionCount,
    formulaVersion: row.formula_version,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

async function fetchActionCollectionContextReferenceAverages(
  supabase: SupabaseClient,
): Promise<ActionCollectionContextReferences> {
  const result = await supabase.rpc("action_collection_context_reference_averages_v1");
  if (result.error) throw result.error;
  const references: ActionCollectionContextReferences = {};
  for (const row of Array.isArray(result.data) ? result.data : []) {
    const normalized = normalizeActionCollectionContextReferenceRow(
      row as ActionCollectionContextReferenceRow,
    );
    if (normalized) references[normalized.actionContext] = normalized;
  }
  return references;
}

let contextServerCache:
  | { expiresAt: number; references: ActionCollectionContextReferences }
  | null = null;
let contextServerFetchInFlight: Promise<ActionCollectionContextReferences> | null = null;

export async function loadActionCollectionContextReferenceAverages(): Promise<ActionCollectionContextReferences> {
  const now = Date.now();
  if (contextServerCache && contextServerCache.expiresAt > now) return contextServerCache.references;
  if (contextServerFetchInFlight) return contextServerFetchInFlight;
  contextServerFetchInFlight = fetchActionCollectionContextReferenceAverages(getSupabaseServerClient(true))
    .then((references) => {
      contextServerCache = { references, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return references;
    })
    .finally(() => {
      contextServerFetchInFlight = null;
    });
  return contextServerFetchInFlight;
}

export function invalidateActionCollectionReferenceAveragesCache(): void {
  serverCache = null;
  contextServerCache = null;
}
