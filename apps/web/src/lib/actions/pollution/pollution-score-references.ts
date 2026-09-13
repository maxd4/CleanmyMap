import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type PollutionScoreReference,
  type PollutionScoreReferences,
  type DepartmentPollutionScoreReference,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  scope?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  waste_per_volunteer?: number | null;
  butts_per_volunteer?: number | null;
  waste_source_count?: number | null;
  butts_source_count?: number | null;
  eligible_action_count?: number | null;
  updated_at?: string | null;
};

const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: PollutionScoreReferences | null }
  | null = null;
let serverFetchInFlight: Promise<PollutionScoreReferences | null> | null = null;

function normalizeRows(data: unknown): PollutionScoreReferenceRow[] {
  if (Array.isArray(data)) {
    return data as PollutionScoreReferenceRow[];
  }
  return data && typeof data === "object"
    ? [data as PollutionScoreReferenceRow]
    : [];
}

function toNonNegativeInteger(value: number | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0 ? candidate : null;
}

function toGlobalReference(row: PollutionScoreReferenceRow): PollutionScoreReference | null {
  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const wasteReference = Number(row.waste_per_volunteer);
  const buttsReference = Number(row.butts_per_volunteer);
  const validWasteReference =
    Number.isFinite(wasteReference) &&
    wasteReference > 0;
  const validButtsReference =
    Number.isFinite(buttsReference) &&
    buttsReference > 0;

  if (
    wasteSourceCount === null ||
    buttsSourceCount === null ||
    (!validWasteReference && !validButtsReference)
  ) {
    return null;
  }

  return {
    wastePerVolunteer: validWasteReference ? wasteReference : null,
    buttsPerVolunteer: validButtsReference ? buttsReference : null,
    wasteSourceCount,
    buttsSourceCount,
  };
}

function toDepartmentReference(
  row: PollutionScoreReferenceRow,
): { code: string; reference: DepartmentPollutionScoreReference } | null {
  const code = typeof row.department_code === "string"
    ? row.department_code.trim().toUpperCase()
    : "";
  const eligibleActionCount = toNonNegativeInteger(row.eligible_action_count);
  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const wasteReference = Number(row.waste_per_volunteer);
  const buttsReference = Number(row.butts_per_volunteer);

  if (
    !code ||
    eligibleActionCount === null ||
    wasteSourceCount === null ||
    buttsSourceCount === null
  ) {
    return null;
  }

  return {
    code,
    reference: {
      departmentName:
        typeof row.department_name === "string" && row.department_name.trim().length > 0
          ? row.department_name.trim()
          : null,
      wastePerVolunteer:
        Number.isFinite(wasteReference) && wasteReference > 0 ? wasteReference : null,
      buttsPerVolunteer:
        Number.isFinite(buttsReference) && buttsReference > 0 ? buttsReference : null,
      wasteSourceCount,
      buttsSourceCount,
      eligibleActionCount,
    },
  };
}

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences | null> {
  if (typeof window !== "undefined") {
    return fetchUncachedActionPollutionScoreReferences(supabase);
  }

  const now = Date.now();
  if (serverCache && serverCache.expiresAt > now) {
    return serverCache.references;
  }
  if (serverFetchInFlight) {
    return serverFetchInFlight;
  }

  serverFetchInFlight = fetchUncachedActionPollutionScoreReferences(supabase)
    .then((references) => {
      serverCache = {
        references,
        expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
      };
      return references;
    })
    .finally(() => {
      serverFetchInFlight = null;
    });

  return serverFetchInFlight;
}

export function invalidateActionPollutionScoreReferencesCache(): void {
  serverCache = null;
}

async function fetchUncachedActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences | null> {
  const result = await supabase.rpc("action_pollution_score_references_v2");

  if (result.error) {
    throw result.error;
  }

  const rows = normalizeRows(result.data);
  const row = rows.find(
    (candidate) =>
      candidate.scope === "global" &&
      candidate.department_code === null &&
      candidate.department_name === null,
  );
  const global = row ? toGlobalReference(row) : null;
  if (!global) {
    return null;
  }

  const departmentReferences = rows.reduce<Record<string, DepartmentPollutionScoreReference>>(
    (references, candidate) => {
      if (candidate.scope !== "department") {
        return references;
      }
      const department = toDepartmentReference(candidate);
      if (department) {
        references[department.code] = department.reference;
      }
      return references;
    },
    {},
  );

  return {
    global,
    departmentReferences,
  };
}
