import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readLatestPublicSurfaceSnapshot } from "@/lib/public-surface-snapshots";
import {
  ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  ACTION_COLLECTION_REFERENCE_FORMULA_VERSION,
} from "@/lib/impact/scientific-projection-versions";
import type { ActionContext } from "./action-context";

export { ACTION_COLLECTION_CONTEXT_FORMULA_VERSION };

export type ActionCollectionReferenceAverages = {
  wastePerVolunteer: number | null;
  buttsPerVolunteer: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
  eligibleActionCount: number;
  formulaVersion: string;
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
  wasteReferencePeriod?: string | null;
  buttsReferencePeriod?: string | null;
  wasteReferenceGeneratedAt?: string | null;
  buttsReferenceGeneratedAt?: string | null;
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
  formula_version?: string | null;
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

export function isCurrentActionCollectionReferenceAverage(
  value: ActionCollectionReferenceAverages | null | undefined,
): value is ActionCollectionReferenceAverages {
  return value?.formulaVersion === ACTION_COLLECTION_REFERENCE_FORMULA_VERSION;
}

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
    wastePerVolunteer: toNonNegativeNumber(row.waste_per_volunteer),
    buttsPerVolunteer: toNonNegativeNumber(row.butts_per_volunteer),
    wasteSourceCount,
    buttsSourceCount,
    eligibleActionCount,
    formulaVersion: row.formula_version,
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
  const references = normalizeActionCollectionReferenceAverageRow(row);
  return isCurrentActionCollectionReferenceAverage(references) ? references : null;
}

export async function loadActionCollectionReferenceAverages(): Promise<ActionCollectionReferenceAverages | null> {
  const now = Date.now();
  if (
    serverCache &&
    serverCache.expiresAt > now &&
    isCurrentActionCollectionReferenceAverage(serverCache.references)
  ) {
    return serverCache.references;
  }
  if (serverFetchInFlight) {
    return serverFetchInFlight;
  }

  serverFetchInFlight = fetchActionCollectionReferenceAverages(getSupabaseServerClient(true))
    .then((references) => {
      const current = isCurrentActionCollectionReferenceAverage(references)
        ? references
        : null;
      serverCache = { references: current, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return current;
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

export async function fetchActionCollectionContextReferenceAverages(
  supabase: SupabaseClient,
  params: { asOfDate?: string } = {},
): Promise<ActionCollectionContextReferences> {
  const result = params.asOfDate
    ? await supabase.rpc("action_collection_context_reference_averages_v1", {
        p_as_of_date: params.asOfDate,
      })
    : await supabase.rpc("action_collection_context_reference_averages_v1");
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

export type ActionCollectionContextReferenceSnapshotMetric = {
  value: number | null;
  sourceCount: number;
  period: string | null;
  generatedAt: string | null;
};

export type ActionCollectionContextReferenceSnapshotItem = {
  actionContext: ActionContext;
  waste: ActionCollectionContextReferenceSnapshotMetric;
  butts: ActionCollectionContextReferenceSnapshotMetric;
  eligibleActionCount: number;
  formulaVersion: string;
};

export type ActionCollectionContextReferenceSnapshotPayload = {
  period: string;
  generatedAt: string;
  formulaVersion: typeof ACTION_COLLECTION_CONTEXT_FORMULA_VERSION;
  source: "action_collection_context_reference_averages_v1";
  references: Record<ActionContext, ActionCollectionContextReferenceSnapshotItem>;
};

export const ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY =
  "action-collection-context-references-monthly";
export const ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION =
  "action-collection-context-references-2026.11-v1";

function normalizeSnapshotMetric(
  metric: ActionCollectionContextReferenceSnapshotMetric | null | undefined,
): ActionCollectionContextReferenceSnapshotMetric | null {
  if (!metric || !Number.isInteger(metric.sourceCount) || metric.sourceCount < 0) {
    return null;
  }
  const value = metric.value === null
    ? null
    : toNonNegativeNumber(metric.value);
  if (metric.value !== null && value === null) return null;
  const period = metric.period === null || typeof metric.period === "string"
    ? metric.period
    : null;
  const generatedAt = metric.generatedAt === null || typeof metric.generatedAt === "string"
    ? metric.generatedAt
    : null;
  return { value, sourceCount: metric.sourceCount, period, generatedAt };
}

export function normalizeActionCollectionContextReferenceSnapshotPayload(
  payload: unknown,
): ActionCollectionContextReferenceSnapshotPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const candidate = payload as Partial<ActionCollectionContextReferenceSnapshotPayload>;
  if (
    typeof candidate.period !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(candidate.period) ||
    typeof candidate.generatedAt !== "string" ||
    candidate.formulaVersion !== ACTION_COLLECTION_CONTEXT_FORMULA_VERSION ||
    candidate.source !== "action_collection_context_reference_averages_v1" ||
    !candidate.references ||
    typeof candidate.references !== "object" ||
    Array.isArray(candidate.references)
  ) return null;

  const references = {} as Record<ActionContext, ActionCollectionContextReferenceSnapshotItem>;
  for (const actionContext of ["citizen", "company", "school"] as const) {
    const raw = candidate.references[actionContext] as
      | Partial<ActionCollectionContextReferenceSnapshotItem>
      | undefined;
    const waste = normalizeSnapshotMetric(raw?.waste);
    const butts = normalizeSnapshotMetric(raw?.butts);
    const eligibleActionCount = raw?.eligibleActionCount;
    if (
      !raw ||
      !waste ||
      !butts ||
      typeof eligibleActionCount !== "number" ||
      !Number.isInteger(eligibleActionCount) ||
      eligibleActionCount < 0 ||
      raw.formulaVersion !== ACTION_COLLECTION_CONTEXT_FORMULA_VERSION
    ) return null;
    references[actionContext] = {
      actionContext,
      waste,
      butts,
      eligibleActionCount,
      formulaVersion: raw.formulaVersion,
    };
  }

  return { ...candidate, references } as ActionCollectionContextReferenceSnapshotPayload;
}

function flattenSnapshotReference(
  item: ActionCollectionContextReferenceSnapshotItem,
): ActionCollectionContextReference {
  return {
    actionContext: item.actionContext,
    wastePerEffectiveUnit: item.waste.value,
    buttsPerEffectiveUnit: item.butts.value,
    wasteSourceCount: item.waste.sourceCount,
    buttsSourceCount: item.butts.sourceCount,
    eligibleActionCount: item.eligibleActionCount,
    formulaVersion: item.formulaVersion,
    updatedAt: item.waste.generatedAt ?? item.butts.generatedAt,
    wasteReferencePeriod: item.waste.period,
    buttsReferencePeriod: item.butts.period,
    wasteReferenceGeneratedAt: item.waste.generatedAt,
    buttsReferenceGeneratedAt: item.butts.generatedAt,
  };
}

export function referencesFromActionCollectionContextSnapshot(
  payload: ActionCollectionContextReferenceSnapshotPayload,
): ActionCollectionContextReferences {
  return Object.fromEntries(
    Object.entries(payload.references).map(([actionContext, reference]) => [
      actionContext,
      flattenSnapshotReference(reference),
    ]),
  ) as ActionCollectionContextReferences;
}

let contextServerCache:
  | { expiresAt: number; references: ActionCollectionContextReferences }
  | null = null;
let contextServerFetchInFlight: Promise<ActionCollectionContextReferences> | null = null;

export async function loadActionCollectionContextReferenceAverages(): Promise<ActionCollectionContextReferences> {
  const now = Date.now();
  if (contextServerCache && contextServerCache.expiresAt > now) {
    return Object.fromEntries(
      Object.entries(contextServerCache.references).filter(
        ([, reference]) =>
          reference.formulaVersion === ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      ),
    ) as ActionCollectionContextReferences;
  }
  if (contextServerFetchInFlight) return contextServerFetchInFlight;
  contextServerFetchInFlight = readLatestPublicSurfaceSnapshot<ActionCollectionContextReferenceSnapshotPayload>(
    ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
  )
    .then((snapshot) => {
      const payload = snapshot?.version === ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION &&
        snapshot.snapshotDate === getSnapshotPayloadPeriod(snapshot.payload)
        ? normalizeActionCollectionContextReferenceSnapshotPayload(snapshot.payload)
        : null;
      const current = payload
        ? referencesFromActionCollectionContextSnapshot(payload)
        : {};
      contextServerCache = { references: current, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return current;
    })
    .finally(() => {
      contextServerFetchInFlight = null;
    });
  return contextServerFetchInFlight;
}

function getSnapshotPayloadPeriod(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const period = (payload as { period?: unknown }).period;
  return typeof period === "string" ? period : null;
}

export function invalidateActionCollectionReferenceAveragesCache(): void {
  serverCache = null;
  contextServerCache = null;
}
