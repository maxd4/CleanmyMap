import "server-only";

import type { ActionContext } from "./action-context";
import type { ActionFieldRoleCode } from "./field-roles";
import type { OrganizerType } from "./organizer-type";
import type { ActionRoleAttestationProvenance } from "./role-attestations";
import type { SpogomiRecognitionKind } from "@/lib/spogomi/recognition";

export type EngagementProofAvailabilityStatus = "available" | "unavailable" | "error";

export type EngagementProofField<T> = {
  status: EngagementProofAvailabilityStatus;
  value: T | null;
  reason: string | null;
};

export type EngagementProofMissionSource =
  | "action_role_attestation"
  | "spogomi_recognition_attestation";

export type EngagementProofMissionCode = ActionFieldRoleCode | SpogomiRecognitionKind;

export type EngagementProofMissionCategory =
  | "organization_coordination"
  | "accompaniment_awareness_logistics"
  | "waste_stream_referent"
  | "collection";

export type EngagementProofVerifiedHours = {
  status: "unavailable";
  totalHours: null;
  reason:
    | "individual_attendance_duration_not_measured"
    | "action_duration_not_individual_proof";
};

export type EngagementProofCommunicableOrganization = {
  organizationKey: string;
  name: string;
  organizerType: OrganizerType | null;
  organizerTypeLabel: string;
  provenance: "organizer_name" | "association_name" | "actor_name";
};

export type EngagementProofAttestedMission = {
  missionId: string;
  actionId: string;
  actionDate: string;
  roleCode: EngagementProofMissionCode;
  roleLabel: string;
  missionCategory: EngagementProofMissionCategory;
  source: EngagementProofMissionSource;
  responsibilityProvenance:
    | ActionRoleAttestationProvenance
    | "spogomi_certified";
  verificationStatus: "confirmed";
  decidedAt: string | null;
  revision: number;
  evidenceReference: string;
  collectionAttributed: boolean;
  skillsCertificationClaimed: false;
};

export type EngagementProofPersonalDeclarationItem = {
  actionId: string;
  actionDate: string;
  wasteKg: EngagementProofField<number>;
  equivalentDryWasteKg: EngagementProofField<number>;
  cigaretteButtsCount: EngagementProofField<number>;
  cigaretteButtsProvenance: "counted" | "measured" | "derived" | "unknown" | null;
  measuredAt: string | null;
  verificationLevel: "self_or_action_record_unattested_as_individual_certification";
};

export type EngagementProofCollectiveActionResults = {
  actionDurationMinutes: EngagementProofField<number>;
  volunteersCount: EngagementProofField<number>;
  collectiveWasteKg: EngagementProofField<number>;
  collectiveCigaretteButtsCount: EngagementProofField<number>;
  individualAttributionAllowed: false;
};

export type EngagementProofCommunicableReference = {
  referenceCode: string;
  actionId: string;
  actionDate: string;
  locationLabel: string;
  organizationName: string | null;
  presenceConfirmed: true;
  attestedMissionCodes: EngagementProofMissionCode[];
  sourceRevisionFingerprint: string;
};

export type EngagementProofParticipationItem = {
  actionId: string;
  actionDate: string;
  actionTitle: string | null;
  locationLabel: string;
  departmentCode: string | null;
  departmentName: string | null;
  actionContext: ActionContext | null;
  presence: {
    status: "confirmed";
    confirmedAt: string;
    participationSource: string;
    provenanceTable: "action_participants";
  };
  organization: EngagementProofField<EngagementProofCommunicableOrganization>;
  attestedMissions: EngagementProofAttestedMission[];
  verifiedHours: EngagementProofVerifiedHours;
  personalDeclaration: EngagementProofField<EngagementProofPersonalDeclarationItem>;
  collectiveResults: EngagementProofCollectiveActionResults;
  communicableReference: EngagementProofCommunicableReference;
};

export type EngagementProofPeriodItem = {
  periodKey: string;
  periodKind: "year" | "month";
  startDate: string;
  endDate: string;
  confirmedParticipationsCount: number;
  attestedMissionsCount: number;
  distinctOrganizationsCount: number;
  verifiedHours: EngagementProofVerifiedHours;
};

export type EngagementProofOrganizationSummary = {
  organizationKey: string;
  name: string;
  organizerType: OrganizerType | null;
  organizerTypeLabel: string;
  confirmedParticipationsCount: number;
  attestedMissionsCount: number;
  firstActionDate: string;
  lastActionDate: string;
  actionIds: string[];
};

export type EngagementProofDistinctSections = {
  presenceConfirmed: EngagementProofField<{
    confirmedActionCount: number;
    firstActionDate: string | null;
    lastActionDate: string | null;
  }>;
  attestedMissions: EngagementProofField<{
    attestedMissionCount: number;
    actionsWithAttestedMissionCount: number;
    items: EngagementProofAttestedMission[];
  }>;
  verifiedHours: EngagementProofVerifiedHours;
  personalDeclarations: EngagementProofField<{
    declaredActionCount: number;
    items: EngagementProofPersonalDeclarationItem[];
    disclaimer: string;
  }>;
  collectiveResults: EngagementProofField<{
    actionsWithCollectiveDataCount: number;
    collectiveActionDurationMinutesTotal: EngagementProofField<number>;
    collectiveWasteKgTotal: EngagementProofField<number>;
    collectiveCigaretteButtsTotal: EngagementProofField<number>;
    disclaimer: string;
  }>;
};

export type EngagementProofSourceStates = {
  actionParticipants: EngagementProofAvailabilityStatus;
  actions: EngagementProofAvailabilityStatus;
  actionRoleAttestations: EngagementProofAvailabilityStatus;
  spogomiEquivalence: EngagementProofAvailabilityStatus;
};

export type EngagementProofPrivacyAndMethodology = {
  evaluationMode: "live_on_read_no_cache_no_counter";
  ownerScopedOnly: true;
  peerPersonalDataDisclosed: false;
  reviewerIdentitiesDisclosed: false;
  sensitiveAdministrativeOrMigratoryDataCollected: false;
  individualHoursDeducedFromActionDuration: false;
  certifiedSkillsDeducedFromRoles: false;
  nonCollectorMissionsAttributeZeroCollectionFictitiously: false;
  unavailableDataTurnedIntoZero: false;
};

export type PersonalEngagementProofProjection = {
  status: EngagementProofAvailabilityStatus;
  generatedAt: string;
  ownerUserId: string;
  sourceStates: EngagementProofSourceStates;
  errorReason: string | null;
  periods: EngagementProofField<{
    overallStartDate: string | null;
    overallEndDate: string | null;
    byYear: EngagementProofPeriodItem[];
    byMonth: EngagementProofPeriodItem[];
  }>;
  participations: EngagementProofField<EngagementProofParticipationItem[]>;
  missions: EngagementProofField<EngagementProofAttestedMission[]>;
  organizations: EngagementProofField<EngagementProofOrganizationSummary[]>;
  communicableReferences: EngagementProofField<EngagementProofCommunicableReference[]>;
  distinctions: EngagementProofDistinctSections;
  privacyAndMethodology: EngagementProofPrivacyAndMethodology;
};
