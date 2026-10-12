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

export type SpogomiRegulation = {
  version: string;
  sourceReference: string | null;
  status: SpogomiRegulationStatus;
  teamSize: SpogomiTeamSizeConfig;
  categories: SpogomiCategoryRule[];
};

export type SpogomiResultItemInput = {
  measurementKind: SpogomiMeasurementKind;
  unit: string;
  quantity: number;
  provenance: string;
};

export type SpogomiParticipantState = {
  registrationStatus: SpogomiParticipantRegistrationStatus;
  attendanceStatus: SpogomiAttendanceStatus;
  accountLinkStatus: SpogomiAccountLinkStatus;
  clerkId: string | null;
};
