import type { SupabaseClient } from "@supabase/supabase-js";
import type { GemGrade } from "./types";
import {
  buildGemGradeCatalog,
  computeGemProgression,
  type GemGradeDefinition,
} from "./gem-progression";
import {
  SENSITIVE_ZONE_PROOF_EVENT_TYPE,
  SENSITIVE_ZONE_PROOF_SOURCE_TABLE,
  parseStoredSensitiveZoneQualification,
  type SensitiveZoneQualificationSnapshot,
} from "./sensitive-zone-progression";

export type SensitiveZoneApaisementSummary = {
  eligibleValidatedActions: number;
  sensitiveAreaCount: number;
  sensitiveAreas: string[];
  currentGrade: GemGrade;
  nextGrade: GemGrade | null;
  progressPercent: number;
  currentLabel: string;
  nextLabel: string | null;
};

const SENSITIVE_ZONE_GEM_CONFIG = {
  idPrefix: "sensitive-zone",
  iconVariant: "shield-check",
  tooltip: (definition: GemGradeDefinition) =>
    definition.key.startsWith("pilier-")
      ? "Progression infinie des zones sensibles apaisées"
      : definition.threshold === 0
        ? "Aucune zone sensible apaisée pour le moment"
        : `${definition.threshold} actions validées dans des zones sensibles`,
  visualVariant: (definition: GemGradeDefinition) =>
    definition.threshold < 5 ? "stone" : "precious",
  xp: (definition: GemGradeDefinition) =>
    definition.threshold === 0 ? 0 : 1,
};

export const SENSITIVE_ZONE_GEM_GRADES = buildGemGradeCatalog(
  SENSITIVE_ZONE_GEM_CONFIG,
);

export { deriveSensitiveAreasFromContracts } from "./sensitive-zone-qualification";

export type { SensitiveZoneQualificationSnapshot } from "./sensitive-zone-progression";

export function computeSensitiveZoneApaisementSummary(params: {
  qualifications: readonly SensitiveZoneQualificationSnapshot[];
}): SensitiveZoneApaisementSummary {
  const uniqueQualifications = [
    ...new Map(
      params.qualifications.map((qualification) => [
        qualification.actionId,
        qualification,
      ]),
    ).values(),
  ];
  const sensitiveAreaSet = new Set(
    uniqueQualifications
      .filter((qualification) => qualification.qualified)
      .map((qualification) => qualification.area.trim())
      .filter((area) => area.length > 0),
  );

  const eligibleValidatedActions = uniqueQualifications.filter(
    (qualification) => qualification.qualified,
  );

  const gradeState = computeGemProgression(
    eligibleValidatedActions.length,
    SENSITIVE_ZONE_GEM_CONFIG,
  );

  return {
    eligibleValidatedActions: eligibleValidatedActions.length,
    sensitiveAreaCount: sensitiveAreaSet.size,
    sensitiveAreas: [...sensitiveAreaSet].sort((left, right) =>
      left.localeCompare(right),
    ),
    currentGrade: gradeState.currentGrade,
    nextGrade: gradeState.nextGrade,
    progressPercent: gradeState.progressPercent,
    currentLabel: gradeState.currentLabel,
    nextLabel: gradeState.nextLabel,
  };
}

async function loadSensitiveZoneInputs(
  supabase: SupabaseClient,
  userId: string,
  options?: { qualifications?: SensitiveZoneQualificationSnapshot[] },
): Promise<{
  qualifications: SensitiveZoneQualificationSnapshot[];
}> {
  if (options?.qualifications) {
    return { qualifications: options.qualifications };
  }

  const result = await supabase
    .from("progression_events")
    .select("source_id, metadata")
    .eq("user_id", userId)
    .eq("event_type", SENSITIVE_ZONE_PROOF_EVENT_TYPE)
    .eq("source_table", SENSITIVE_ZONE_PROOF_SOURCE_TABLE)
    .eq("status_phase", "validated")
    .limit(12000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const qualifications = (result.data ?? [])
    .map((row) =>
      parseStoredSensitiveZoneQualification(row.source_id, row.metadata),
    )
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map((row) => row.snapshot);

  return { qualifications };
}

export async function loadSensitiveZoneApaisementSummary(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    qualifications?: SensitiveZoneQualificationSnapshot[];
  },
): Promise<SensitiveZoneApaisementSummary> {
  const { qualifications } =
    await loadSensitiveZoneInputs(supabase, userId, options);

  return computeSensitiveZoneApaisementSummary({
    qualifications,
  });
}

export function createFallbackSensitiveZoneApaisementSummary(): SensitiveZoneApaisementSummary {
  return computeSensitiveZoneApaisementSummary({
    qualifications: [],
  });
}
