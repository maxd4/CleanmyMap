export type SpogomiDivisionType = "casual" | "world_cup";
export type SpogomiEventMode = SpogomiDivisionType | "mixed";

export type SpogomiDivision = {
  id: string;
  event_id: string;
  division_type: SpogomiDivisionType;
  division_key: SpogomiDivisionType;
  regulation_version?: string;
  regulation_status?: SpogomiRegulationStatus;
  regulation_source_reference?: string | null;
  regulation_config?: unknown;
  team_size_config?: unknown;
};

export function spogomiDivisionTypesForMode(mode: SpogomiEventMode): SpogomiDivisionType[] {
  return mode === "mixed" ? ["casual", "world_cup"] : [mode];
}

export function spogomiModeLabel(mode: SpogomiEventMode): string {
  const divisionTypes = spogomiDivisionTypesForMode(mode);
  return divisionTypes.length === 2 ? "Casual & World Cup" : divisionTypes[0] === "world_cup" ? "World Cup" : "Casual";
}
export type SpogomiEventState =
  | "draft"
  | "registration_open"
  | "composition_locked"
  | "in_progress"
  | "judging"
  | "certified"
  | "archived"
  | "cancelled";
type SpogomiRegulationStatus = "incomplete" | "complete";
type SpogomiTeamCompositionState = "draft" | "locked" | "verified";
type SpogomiParticipantRegistrationStatus = "registered" | "withdrawn";
type SpogomiAttendanceStatus = "unknown" | "present" | "absent";
type SpogomiAccountLinkStatus = "unlinked" | "pending" | "verified" | "rejected";
export type SpogomiSubmissionStatus =
  | "draft"
  | "submitted"
  | "provisional"
  | "certified"
  | "rejected"
  | "superseded";
type SpogomiMeasurementKind = "mass" | "count" | "volume";

type SpogomiCasualTeamSizeConfig = {
  minMembers: number | null;
  maxMembers: number | null;
};

type SpogomiTeamSizeConfig = {
  casual: SpogomiCasualTeamSizeConfig;
};

export type SpogomiCategoryRule = {
  code: string;
  label: string;
  measurementKind: SpogomiMeasurementKind;
  unit: string;
  coefficient: number | null;
  coefficientStatus: "unknown" | "confirmed" | "not_applicable";
  environmentalCategorySlug: string | null;
  isComplete: boolean;
};

type SpogomiRoundingRule = {
  decimals: number;
  mode: "half_up" | "down" | "up";
};

type SpogomiPenalty = {
  code: string;
  label: string;
  points: number;
};

type SpogomiEligibilityRule = {
  minimumPresentParticipants: number | null;
  requiresAllCategories: boolean;
};

type SpogomiTiebreaker = "sporting_score" | "mass_grams" | "counted_objects";

export type SpogomiRegulation = {
  divisionId?: string;
  version: string;
  sourceReference: string | null;
  status: SpogomiRegulationStatus;
  teamSize: SpogomiTeamSizeConfig;
  categories: SpogomiCategoryRule[];
  rounding?: SpogomiRoundingRule;
  penalties?: SpogomiPenalty[];
  eligibility?: SpogomiEligibilityRule;
  tiebreakers?: SpogomiTiebreaker[];
};

export type SpogomiResultItemInput = {
  measurementKind: SpogomiMeasurementKind;
  unit: string;
  quantity: number | null;
  massGrams?: number | null;
  objectCount?: number | null;
  measurementMethod?: string | null;
  provenance: string;
  arbitrationComment?: string | null;
};

export type SpogomiCompetitionInput = {
  regulation: SpogomiRegulation;
  items: Array<SpogomiResultItemInput & { categoryCode: string }>;
  presentParticipants: number;
  submissionStatus?: SpogomiSubmissionStatus;
  appliedPenalties?: SpogomiPenalty[];
};

export type SpogomiPhysicalTotals = {
  massGrams: number | null;
  countedObjects: number | null;
  countedButts: number | null;
  buttMassGrams: number | null;
  presentParticipants: number;
};

export type SpogomiCompetitionResult = {
  physicalTotals: SpogomiPhysicalTotals;
  officialScore: number | null;
  scoreStatus: "official" | "preview" | "unavailable";
  appliedPenalties: SpogomiPenalty[];
  comparableForButtsPerParticipant: boolean;
  buttsPerParticipant: number | null;
  ineligibleReason: string | null;
};

export type SpogomiParticipantState = {
  registrationStatus: SpogomiParticipantRegistrationStatus;
  attendanceStatus: SpogomiAttendanceStatus;
  accountLinkStatus: SpogomiAccountLinkStatus;
  clerkId: string | null;
};

export type SpogomiImportFormat = "csv" | "tsv" | "xlsx" | "xls" | "ods";

export type SpogomiRosterMappingConfidence = "exact" | "high" | "suggested" | "ambiguous" | "missing";

export type SpogomiRosterColumnDiagnostic = {
  field: SpogomiRosterColumn;
  selectedHeader: string | null;
  confidence: SpogomiRosterMappingConfidence;
  candidates: string[];
  required: boolean;
  status: "recognized" | "optional_absent" | "ambiguous";
};

export type SpogomiRosterSheetCandidate = {
  index: number;
  name: string;
  headerRow: number | null;
  recognizedFieldCount: number;
  confidence: SpogomiRosterMappingConfidence;
  rowCount: number;
};

type SpogomiRosterImportSummary = {
  created: number;
  unchanged: number;
  changed: number;
  conflicts: number;
  excluded: number;
};

export type SpogomiRosterColumn =
  | "name"
  | "participantLastName"
  | "participantFirstName"
  | "group"
  | "sourceRowId"
  | "ticketReference"
  | "orderReference"
  | "orderAlternativeReference"
  | "ticketStatus"
  | "ticketDeleted";

export type SpogomiRosterColumnMapping = Partial<
  Record<SpogomiRosterColumn, string>
>;

export type SpogomiRosterRow = {
  rowNumber: number;
  name: string | null;
  groupPreference: string | null;
  sourceRowId: string | null;
  externalReference: string | null;
  orderReference: string | null;
  orderAlternativeReference: string | null;
  ticketStatus: string | null;
  ticketDeleted: boolean | null;
  ticketDeletedRaw?: string | null;
  sourceSystem: "manual_roster" | "cachan_ticketing";
  sourceFingerprint: string;
};

export type SpogomiRosterRowError = {
  rowNumber: number;
  code:
    | "name_required"
    | "name_too_long"
    | "row_too_wide"
    | "invalid_source_row_id"
    | "ticket_reference_required"
    | "order_reference_required"
    | "ticket_reference_collision"
    | "ambiguous_identifier"
    | "formula_or_active_content"
    | "row_excluded"
    | "ambiguous_mapping"
    | "header_not_found"
    | "ticket_status_missing"
    | "ticket_status_pending"
    | "ticket_status_unknown"
    | "ticket_deletion_missing"
    | "ticket_deletion_unknown";
  message: string;
};

export type SpogomiRosterPreview = {
  format: SpogomiImportFormat;
  fileName: string;
  contentHash: string;
  headers: string[];
  unknownHeaders: string[];
  mapping: SpogomiRosterColumnMapping;
  rows: SpogomiRosterRow[];
  errors: SpogomiRosterRowError[];
  probableDuplicateRowNumbers: number[][];
  sourceSystem: "manual_roster" | "cachan_ticketing";
  cancelledRowNumbers: number[];
  changedRowNumbers?: number[];
  conflictRowNumbers?: number[];
  encoding: "utf-8" | "windows-1252" | "binary";
  sheetName: string | null;
  headerRow: number;
  sheetCandidates: SpogomiRosterSheetCandidate[];
  columnDiagnostics: SpogomiRosterColumnDiagnostic[];
  missingFields: SpogomiRosterColumn[];
  ambiguousFields: SpogomiRosterColumn[];
  rowsRead: number;
  ignoredRowNumbers: number[];
  requiresExplicitSelection: boolean;
  importSummary?: SpogomiRosterImportSummary;
  rowEffects?: Record<string, "created" | "unchanged" | "changed" | "conflict" | "excluded">;
  importKey: string;
};

type SpogomiTeamDraft = {
  draftKey: string;
  teamNumber: number;
  participantIds: string[];
  compositionState: SpogomiTeamCompositionState;
  explanation: "same_order_trio" | "remainder_repacked";
};

export type SpogomiTeamFormation = {
  teams: SpogomiTeamDraft[];
  unassignedParticipantIds: string[];
  reasons: Record<string, "group_exceeds_team_size" | "team_size_required" | "incomplete_team" | "casual_bounds_no_fit">;
  explanation: string[];
};
