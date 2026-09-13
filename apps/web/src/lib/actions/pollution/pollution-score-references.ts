import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type DepartmentPollutionScoreReference,
  type PollutionScoreReferences,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  waste_per_volunteer: number | null;
  butts_per_volunteer: number | null;
  department_code?: string | null;
  department_name?: string | null;
  eligible_action_count?: number | null;
  action_count?: number | null;
  department_references?: unknown;
  departments?: unknown;
};

// The function reads only publicly selectable approved actions. Keep this
// cache limited to this public aggregate; do not reuse it for user-scoped data.
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: PollutionScoreReferences }
  | null = null;
let serverFetchInFlight: Promise<PollutionScoreReferences> | null = null;

function normalizePollutionScoreReferenceRows(
  data: unknown,
): PollutionScoreReferenceRow[] {
  if (Array.isArray(data)) {
    return data as PollutionScoreReferenceRow[];
  }
  if (data) {
    return [data as PollutionScoreReferenceRow];
  }
  return [];
}

function isPositiveFiniteReference(value: number | null | undefined): value is number {
  const candidate = Number(value ?? 0);
  return Number.isFinite(candidate) && candidate > 0;
}

function toDepartmentReference(value: unknown): DepartmentPollutionScoreReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const wastePerVolunteer = Number(
    candidate.wastePerVolunteer ?? candidate.waste_per_volunteer,
  );
  const buttsPerVolunteer = Number(
    candidate.buttsPerVolunteer ?? candidate.butts_per_volunteer,
  );
  const eligibleActionCount = Number(
    candidate.eligibleActionCount ??
      candidate.eligible_action_count ??
      candidate.actionCount ??
      candidate.action_count,
  );

  if (
    !isPositiveFiniteReference(wastePerVolunteer) ||
    !isPositiveFiniteReference(buttsPerVolunteer) ||
    !Number.isFinite(eligibleActionCount) ||
    eligibleActionCount < 0
  ) {
    return null;
  }

  return {
    wastePerVolunteer,
    buttsPerVolunteer,
    eligibleActionCount: Math.trunc(eligibleActionCount),
  };
}

function normalizeDepartmentReferences(
  value: unknown,
): Readonly<Record<string, DepartmentPollutionScoreReference>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, DepartmentPollutionScoreReference>
  >((result, [rawCode, rawReference]) => {
    const code = rawCode.trim();
    const reference = toDepartmentReference(rawReference);
    if (code && reference) {
      result[code] = reference;
    }
    return result;
  }, {});
}

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences> {
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
): Promise<PollutionScoreReferences> {
  const result = await supabase.rpc("action_pollution_score_references");

  if (result.error) {
    throw result.error;
  }

  const rows = normalizePollutionScoreReferenceRows(result.data);
  const row = rows.find((candidate) =>
    isPositiveFiniteReference(candidate?.waste_per_volunteer) &&
    isPositiveFiniteReference(candidate?.butts_per_volunteer) &&
    !candidate?.department_code,
  ) ?? rows[0] ?? null;

  if (
    isPositiveFiniteReference(row?.waste_per_volunteer) &&
    isPositiveFiniteReference(row?.butts_per_volunteer)
  ) {
    const departmentReferences = rows.reduce<
      Record<string, DepartmentPollutionScoreReference>
    >((result, candidate) => {
      const departmentCode = candidate.department_code?.trim();
      const eligibleActionCount =
        candidate.eligible_action_count ?? candidate.action_count;
      const reference = toDepartmentReference({
        waste_per_volunteer: candidate.waste_per_volunteer,
        butts_per_volunteer: candidate.butts_per_volunteer,
        eligible_action_count: eligibleActionCount,
      });
      if (departmentCode && reference) {
        result[departmentCode] = reference;
      }
      return result;
    }, {});

    for (const candidate of rows) {
      const nestedReferences = normalizeDepartmentReferences(
        candidate.department_references,
      );
      const nestedDepartments = normalizeDepartmentReferences(candidate.departments);
      Object.assign(departmentReferences, nestedReferences, nestedDepartments);
    }

    return {
      wastePerVolunteer: Number(row.waste_per_volunteer),
      buttsPerVolunteer: Number(row.butts_per_volunteer),
      ...(Object.keys(departmentReferences).length > 0
        ? { departmentReferences }
        : {}),
    };
  }

  return DEFAULT_POLLUTION_SCORE_REFERENCES;
}
