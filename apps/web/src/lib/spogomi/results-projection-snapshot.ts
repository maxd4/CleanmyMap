import type { SpogomiResultsSource } from "./results-projection";

export type SpogomiPublicationSourceSnapshot = {
  event: {
    id: string;
    regulationVersion: string;
    regulationStatus: string;
    regulationSourceReference: string | null;
    regulationConfig: unknown;
    teamSizeConfig: unknown;
  };
  divisions: Array<{
    id: string;
    type: string;
    regulationVersion?: string;
    regulationStatus?: string;
    regulationSourceReference?: string | null;
    regulationConfig?: unknown;
    teamSizeConfig?: unknown;
  }>;
  categories: Array<{ id: string; divisionId?: string; regulationVersion: string; code: string; measurementKind: string; unit: string; coefficient: string | null; coefficientStatus: string; environmentalCategorySlug: string | null; isComplete: boolean }>;
  teams: Array<{ id: string; divisionId?: string; teamNumber: number; compositionState: string; certifiedSubmissionId: string | null }>;
  submissions: Array<{ id: string; divisionId?: string; teamId: string; version: number; status: string; submittedAt: string | null; regulationVersion: string }>;
  items: Array<{ id: string; divisionId?: string; submissionId: string; categoryRuleId: string; measurementKind: string; unit: string; quantity: string | null; massGrams: string | null; objectCount: string | null; measurementMethod: string | null; provenance: string; sourceReference: string | null }>;
  participants: Array<{ id: string; divisionId?: string; teamId: string | null; registrationStatus: string; attendanceStatus: string }>;
};

export function buildPublicationSourceSnapshot(source: SpogomiResultsSource): SpogomiPublicationSourceSnapshot {
  const snapshotNumber = (value: unknown): string | null => value === null || value === undefined ? null : String(value);
  return {
    event: { id: source.event.id, regulationVersion: source.event.regulationVersion, regulationStatus: source.event.regulationStatus, regulationSourceReference: source.event.regulationSourceReference, regulationConfig: source.event.regulationConfig, teamSizeConfig: source.event.teamSizeConfig },
    divisions: (source.event.divisions ?? []).map((division) => ({ id: division.id, type: division.division_type, regulationVersion: division.regulation_version, regulationStatus: division.regulation_status, regulationSourceReference: division.regulation_source_reference, regulationConfig: division.regulation_config, teamSizeConfig: division.team_size_config })),
    categories: source.categories.map((row) => ({ id: row.id, divisionId: row.division_id, regulationVersion: row.regulation_version, code: row.code, measurementKind: row.measurement_kind, unit: row.unit, coefficient: snapshotNumber(row.coefficient), coefficientStatus: row.coefficient_status, environmentalCategorySlug: row.environmental_category_slug, isComplete: row.is_complete })),
    teams: source.teams.map((row) => ({ id: row.id, divisionId: row.division_id, teamNumber: row.team_number, compositionState: row.composition_state, certifiedSubmissionId: row.certified_submission_id })),
    submissions: source.submissions.map((row) => ({ id: row.id, divisionId: row.division_id, teamId: row.team_id, version: row.version, status: row.status, submittedAt: row.submitted_at, regulationVersion: row.regulation_version ?? "" })),
    items: source.items.map((row) => ({ id: String(row.id ?? ""), divisionId: typeof row.division_id === "string" ? row.division_id : undefined, submissionId: String(row.submission_id ?? ""), categoryRuleId: String(row.category_rule_id ?? ""), measurementKind: String(row.measurement_kind ?? ""), unit: String(row.unit ?? ""), quantity: snapshotNumber(row.quantity), massGrams: snapshotNumber(row.mass_grams), objectCount: snapshotNumber(row.object_count), measurementMethod: typeof row.measurement_method === "string" ? row.measurement_method : null, provenance: typeof row.provenance === "string" ? row.provenance : "", sourceReference: typeof row.source_reference === "string" ? row.source_reference : null })),
    participants: source.participants.map((row) => ({ id: row.id, divisionId: row.division_id, teamId: row.team_id, registrationStatus: row.registration_status, attendanceStatus: row.attendance_status })),
  };
}
