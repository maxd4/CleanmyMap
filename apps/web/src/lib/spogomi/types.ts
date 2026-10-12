import type { ActionRouteTopology } from "@/lib/actions/types";

export const SPOGOMI_EVENT_MODES = ["casual", "world_cup"] as const;
export type SpogomiEventMode = (typeof SPOGOMI_EVENT_MODES)[number];

export const SPOGOMI_EVENT_STATES = [
  "draft",
  "registration_open",
  "composition_locked",
  "in_progress",
  "judging",
  "certified",
  "archived",
  "cancelled",
] as const;
export type SpogomiEventState = (typeof SPOGOMI_EVENT_STATES)[number];

export const SPOGOMI_REGULATION_STATUSES = ["incomplete", "complete"] as const;
export type SpogomiRegulationStatus = (typeof SPOGOMI_REGULATION_STATUSES)[number];

export const SPOGOMI_TEAM_COMPOSITION_STATES = [
  "draft",
  "locked",
  "verified",
] as const;
export type SpogomiTeamCompositionState =
  (typeof SPOGOMI_TEAM_COMPOSITION_STATES)[number];

export const SPOGOMI_PARTICIPANT_REGISTRATION_STATUSES = [
  "registered",
  "withdrawn",
] as const;
export type SpogomiParticipantRegistrationStatus =
  (typeof SPOGOMI_PARTICIPANT_REGISTRATION_STATUSES)[number];

export const SPOGOMI_ATTENDANCE_STATUSES = ["unknown", "present", "absent"] as const;
export type SpogomiAttendanceStatus = (typeof SPOGOMI_ATTENDANCE_STATUSES)[number];

export const SPOGOMI_ACCOUNT_LINK_STATUSES = [
  "unlinked",
  "pending",
  "verified",
  "rejected",
] as const;
export type SpogomiAccountLinkStatus = (typeof SPOGOMI_ACCOUNT_LINK_STATUSES)[number];

export const SPOGOMI_SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "provisional",
  "certified",
  "rejected",
  "superseded",
] as const;
export type SpogomiSubmissionStatus = (typeof SPOGOMI_SUBMISSION_STATUSES)[number];

export const SPOGOMI_MEASUREMENT_KINDS = ["mass", "count", "volume"] as const;
export type SpogomiMeasurementKind = (typeof SPOGOMI_MEASUREMENT_KINDS)[number];

export type SpogomiCasualTeamSizeConfig = {
  minMembers: number | null;
  maxMembers: number | null;
};

export type SpogomiTeamSizeConfig = {
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

export type SpogomiRoundingRule = {
  decimals: number;
  mode: "half_up" | "down" | "up";
};

export type SpogomiPenalty = {
  code: string;
  label: string;
  points: number;
};

export type SpogomiEligibilityRule = {
  minimumPresentParticipants: number | null;
  requiresAllCategories: boolean;
};

export type SpogomiTiebreaker = "sporting_score" | "mass_grams" | "counted_objects";

export type SpogomiRegulation = {
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

export const SPOGOMI_IMPORT_FORMATS = ["csv", "tsv", "xlsx", "xls", "ods"] as const;
export type SpogomiImportFormat = (typeof SPOGOMI_IMPORT_FORMATS)[number];

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

export type SpogomiRosterImportSummary = {
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
  ticketDeleted: boolean;
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
    | "ticket_status_unknown"
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
  importKey: string;
};

export type SpogomiTeamDraft = {
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

export type SpogomiOfficialRoute = {
  source: "official_reference";
  fileName: string;
  pointCount: number;
  referenceDistanceKm: number;
  inferredTopology: ActionRouteTopology;
  coordinates: [number, number][];
};
