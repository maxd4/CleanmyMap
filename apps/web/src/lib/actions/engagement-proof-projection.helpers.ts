import "server-only";

import { createHash } from "node:crypto";
import type { ActionContext } from "./action-context";
import { ACTION_FIELD_ROLE_OPTIONS, isActionFieldRoleCode, type ActionFieldRoleCode } from "./field-roles";
import { extractActionMetadataFromNotes } from "./metadata";
import {
  getOrganizerTypeLabel,
  isOrganizerType,
  SPONTANEOUS_PENDING_ORGANIZER_LABEL,
  type OrganizerType,
} from "./organizer-type";
import { toIndividualImpactMeasurement } from "./participation/individual-impact";
import { isActionFinalizedForRoleAttestation, type ActionRoleAttestationProvenance } from "./role-attestations";
import type { ActionPreparationData } from "./types";
import type { SpogomiRecognitionKind } from "@/lib/spogomi/recognition";
import type {
  EngagementProofAttestedMission,
  EngagementProofCollectiveActionResults,
  EngagementProofCommunicableOrganization,
  EngagementProofCommunicableReference,
  EngagementProofField,
  EngagementProofMissionCategory,
  EngagementProofMissionCode,
  EngagementProofPersonalDeclarationItem,
} from "./engagement-proof-projection.types";

export type RawParticipantRow = {
  id?: string | null;
  action_id?: string | null;
  user_id?: string | null;
  joined_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  participation_status?: string | null;
  participation_source?: string | null;
  individual_waste_kg?: number | string | null;
  individual_waste_condition?: string | null;
  individual_waste_measurement_method?: string | null;
  individual_waste_normalization_version?: string | null;
  individual_cigarette_butts_count?: number | string | null;
  individual_cigarette_butts_mass_kg?: number | string | null;
  individual_cigarette_butts_condition?: string | null;
  individual_cigarette_butts_provenance?: string | null;
  individual_cigarette_butts_conversion_version?: string | null;
  individual_cigarette_butts_lots?: unknown | null;
  individual_impact_measured_by?: string | null;
  individual_impact_measured_at?: string | null;
};

export type RawActionRow = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  department_code?: string | null;
  department_name?: string | null;
  actor_name?: string | null;
  organizer_name?: string | null;
  organizer_type?: string | null;
  action_context?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
  published_at: string | null;
  cancelled_at?: string | null;
  moderation_visibility?: "visible" | "hidden" | null;
  access_mode?: string | null;
  data_provenance?: "unknown" | "real" | "test" | null;
  duration_minutes?: number | null;
  volunteers_count?: number | null;
  waste_kg?: number | null;
  cigarette_butts?: number | null;
  notes?: string | null;
  preparation_data?: ActionPreparationData | null;
};

export type RawRoleAttestationRow = {
  id: string;
  action_id: string;
  user_id: string;
  role_code: string;
  verification_status: string;
  decided_at: string | null;
  responsibility_provenance: ActionRoleAttestationProvenance;
  provenance_snapshot: Record<string, unknown> | null;
  revision: number;
};

export type RawSpogomiParticipantRow = {
  id: string;
  event_id: string;
  division_id?: string | null;
  clerk_id?: string | null;
  registration_status?: string | null;
  attendance_status?: string | null;
  account_link_status?: string | null;
};

export type RawSpogomiEventRow = {
  id: string;
  action_id?: string | null;
  name?: string | null;
  public_visibility?: string | null;
  state?: string | null;
};

export type RawSpogomiAttestationRow = {
  id: string;
  event_id: string;
  division_id?: string | null;
  participant_id: string;
  kind: string;
  status: string;
  certified_at: string | null;
  evidence_reference: string | null;
  certification_version: string | null;
};

const FIELD_ROLE_LABELS = new Map<ActionFieldRoleCode, string>(
  ACTION_FIELD_ROLE_OPTIONS.map((option) => [option.code, option.label]),
);

const SPOGOMI_ROLE_META: Record<
  SpogomiRecognitionKind,
  { label: string; category: EngagementProofMissionCategory; collectionAttributed: boolean }
> = {
  collector: {
    label: "Participant collecteur certifié (SPOGOMI)",
    category: "collection",
    collectionAttributed: true,
  },
  referee: {
    label: "Arbitre et accompagnement terrain (SPOGOMI)",
    category: "accompaniment_awareness_logistics",
    collectionAttributed: false,
  },
  organizer: {
    label: "Organisation et coordination (SPOGOMI)",
    category: "organization_coordination",
    collectionAttributed: false,
  },
  finish_control: {
    label: "Contrôle d’arrivée et sensibilisation (SPOGOMI)",
    category: "accompaniment_awareness_logistics",
    collectionAttributed: false,
  },
  field_safety: {
    label: "Sécurité et accompagnement terrain (SPOGOMI)",
    category: "accompaniment_awareness_logistics",
    collectionAttributed: false,
  },
  weighing_sorting: {
    label: "Pesée, tri et caractérisation (SPOGOMI)",
    category: "accompaniment_awareness_logistics",
    collectionAttributed: false,
  },
  logistics_support: {
    label: "Support logistique (SPOGOMI)",
    category: "accompaniment_awareness_logistics",
    collectionAttributed: false,
  },
};

const FIELD_ROLE_CATEGORIES: Record<ActionFieldRoleCode, EngagementProofMissionCategory> = {
  organizer_primary: "organization_coordination",
  coorganizer: "organization_coordination",
  group_lead: "accompaniment_awareness_logistics",
  welcome_contact: "accompaniment_awareness_logistics",
  cigarette_bag_lead: "waste_stream_referent",
  recyclable_bag_lead: "waste_stream_referent",
  household_waste_bag_lead: "waste_stream_referent",
  glass_bag_lead: "waste_stream_referent",
};

export function availableField<T>(value: T): EngagementProofField<T> {
  return { status: "available", value, reason: null };
}

export function unavailableField<T>(reason: string): EngagementProofField<T> {
  return { status: "unavailable", value: null, reason };
}

export function errorField<T>(reason: string): EngagementProofField<T> {
  return { status: "error", value: null, reason };
}

export function isCommunicableFinalizedAction(action: RawActionRow): boolean {
  if (action.data_provenance === "test") return false;
  if (action.cancelled_at) return false;
  if (action.access_mode === "invite_link" || action.access_mode === "private_link") return false;
  return isActionFinalizedForRoleAttestation({
    status: action.status,
    action_phase: action.action_phase,
    published_at: action.published_at,
    moderation_visibility: action.moderation_visibility ?? undefined,
  });
}

export function organizerSnapshotMatchesAttestation(
  row: RawRoleAttestationRow,
  userId: string,
): boolean {
  if (row.role_code !== "organizer_primary" && row.role_code !== "coorganizer") {
    return true;
  }
  const snapshot = row.provenance_snapshot?.targetOrganizer;
  if (!snapshot || typeof snapshot !== "object") return false;
  const organizer = snapshot as Record<string, unknown>;
  return (
    organizer.organizer_clerk_id === userId &&
    typeof organizer.is_primary === "boolean" &&
    organizer.is_primary === (row.role_code === "organizer_primary")
  );
}

export function buildFieldRoleAttestedMission(
  row: RawRoleAttestationRow,
  action: RawActionRow,
  userId: string,
): EngagementProofAttestedMission | null {
  if (row.user_id !== userId || row.verification_status !== "confirmed") return null;
  if (!isActionFieldRoleCode(row.role_code)) return null;
  if (!organizerSnapshotMatchesAttestation(row, userId)) return null;

  const roleCode = row.role_code;
  const revision = Number.isInteger(row.revision) && row.revision > 0 ? row.revision : 1;
  return {
    missionId: `action_role:${row.id}`,
    actionId: action.id,
    actionDate: action.action_date,
    roleCode,
    roleLabel: FIELD_ROLE_LABELS.get(roleCode) ?? roleCode,
    missionCategory: FIELD_ROLE_CATEGORIES[roleCode],
    source: "action_role_attestation",
    responsibilityProvenance: row.responsibility_provenance,
    verificationStatus: "confirmed",
    decidedAt: row.decided_at ?? null,
    revision,
    evidenceReference: `action_role_attestation:${row.id}:r${revision}`,
    collectionAttributed: false,
    skillsCertificationClaimed: false,
  };
}

export function isSpogomiRecognitionKind(value: string): value is SpogomiRecognitionKind {
  return Object.prototype.hasOwnProperty.call(SPOGOMI_ROLE_META, value);
}

export function buildSpogomiAttestedMission(params: {
  attestation: RawSpogomiAttestationRow;
  participant: RawSpogomiParticipantRow;
  event: RawSpogomiEventRow;
  action: RawActionRow;
  userId: string;
}): EngagementProofAttestedMission | null {
  const { attestation, participant, event, action, userId } = params;
  if (
    participant.clerk_id !== userId ||
    participant.account_link_status !== "verified" ||
    participant.attendance_status !== "present" ||
    participant.registration_status === "withdrawn"
  ) {
    return null;
  }
  if (
    event.state !== "certified" ||
    event.public_visibility !== "published" ||
    event.action_id !== action.id
  ) {
    return null;
  }
  if (
    attestation.status !== "certified" ||
    !isSpogomiRecognitionKind(attestation.kind) ||
    typeof attestation.evidence_reference !== "string" ||
    attestation.evidence_reference.trim().length === 0
  ) {
    return null;
  }
  if (
    attestation.division_id &&
    participant.division_id &&
    attestation.division_id !== participant.division_id
  ) {
    return null;
  }

  const meta = SPOGOMI_ROLE_META[attestation.kind];
  const version = attestation.certification_version?.trim() || "v1";
  return {
    missionId: `spogomi_role:${attestation.id}`,
    actionId: action.id,
    actionDate: action.action_date,
    roleCode: attestation.kind,
    roleLabel: meta.label,
    missionCategory: meta.category,
    source: "spogomi_recognition_attestation",
    responsibilityProvenance: "spogomi_certified",
    verificationStatus: "confirmed",
    decidedAt: attestation.certified_at ?? null,
    revision: 1,
    evidenceReference: `spogomi_attestation:${attestation.id}:${version}:${attestation.evidence_reference.trim()}`,
    collectionAttributed: meta.collectionAttributed,
    skillsCertificationClaimed: false,
  };
}

function normalizeStructureName(candidate: string | null | undefined): string | null {
  const trimmed = candidate?.trim() ?? "";
  if (!trimmed || trimmed === SPONTANEOUS_PENDING_ORGANIZER_LABEL) return null;
  return trimmed;
}

export function resolveCommunicableOrganization(
  action: RawActionRow,
): EngagementProofField<EngagementProofCommunicableOrganization> {
  const organizerType: OrganizerType | null = isOrganizerType(action.organizer_type)
    ? action.organizer_type
    : null;
  const notesMeta = extractActionMetadataFromNotes(action.notes ?? null);
  const organizerName = normalizeStructureName(action.organizer_name);
  const associationName = normalizeStructureName(notesMeta.associationName);
  const actorName =
    organizerType && organizerType !== "spontaneous"
      ? normalizeStructureName(action.actor_name)
      : null;

  const selected = organizerName
    ? { name: organizerName, provenance: "organizer_name" as const }
    : associationName
      ? { name: associationName, provenance: "association_name" as const }
      : actorName
        ? { name: actorName, provenance: "actor_name" as const }
        : null;

  if (!selected) {
    return unavailableField("communicable_organization_not_declared");
  }

  const normalizedKey = selected.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return availableField({
    organizationKey: `${organizerType ?? "unspecified"}:${normalizedKey || "organization"}`,
    name: selected.name,
    organizerType,
    organizerTypeLabel: getOrganizerTypeLabel(organizerType),
    provenance: selected.provenance,
  });
}

export function resolvePersonalDeclaration(
  row: RawParticipantRow,
  action: RawActionRow,
): EngagementProofField<EngagementProofPersonalDeclarationItem> {
  const measurement = toIndividualImpactMeasurement(row);
  const hasWaste = measurement !== null && measurement.wasteKg !== null;
  const hasButts =
    measurement !== null &&
    (measurement.comparableButtsCount !== null || measurement.cigaretteButtsCount !== null);

  if (!measurement || (!hasWaste && !hasButts)) {
    return unavailableField("no_individual_declaration_recorded");
  }

  const buttsCount = measurement.comparableButtsCount ?? measurement.cigaretteButtsCount;
  return availableField({
    actionId: action.id,
    actionDate: action.action_date,
    wasteKg:
      measurement.wasteKg !== null
        ? availableField(measurement.wasteKg)
        : unavailableField("individual_waste_kg_not_declared"),
    equivalentDryWasteKg:
      measurement.equivalentSecKg !== null
        ? availableField(measurement.equivalentSecKg)
        : unavailableField("individual_dry_equivalent_unavailable"),
    cigaretteButtsCount:
      buttsCount !== null
        ? availableField(buttsCount)
        : unavailableField("individual_cigarette_butts_not_declared"),
    cigaretteButtsProvenance:
      measurement.comparableButtsProvenance ?? measurement.cigaretteButtsProvenance ?? null,
    measuredAt: measurement.measuredAt ?? null,
    verificationLevel: "self_or_action_record_unattested_as_individual_certification",
  });
}

export function resolveCollectiveActionResults(
  action: RawActionRow,
): EngagementProofCollectiveActionResults {
  const durationDeclared = action.preparation_data?.durationMinutesDeclared;
  const durationMinutes =
    typeof action.duration_minutes === "number" &&
    Number.isFinite(action.duration_minutes) &&
    action.duration_minutes > 0 &&
    durationDeclared !== false
      ? action.duration_minutes
      : null;

  const volunteersCount =
    typeof action.volunteers_count === "number" &&
    Number.isFinite(action.volunteers_count) &&
    action.volunteers_count > 0
      ? action.volunteers_count
      : null;

  const collectiveWasteKg =
    typeof action.waste_kg === "number" &&
    Number.isFinite(action.waste_kg) &&
    action.waste_kg >= 0
      ? action.waste_kg
      : null;

  const collectiveButts =
    typeof action.cigarette_butts === "number" &&
    Number.isFinite(action.cigarette_butts) &&
    action.cigarette_butts >= 0
      ? action.cigarette_butts
      : null;

  return {
    actionDurationMinutes:
      durationMinutes !== null
        ? availableField(durationMinutes)
        : unavailableField("collective_action_duration_not_recorded"),
    volunteersCount:
      volunteersCount !== null
        ? availableField(volunteersCount)
        : unavailableField("collective_volunteers_count_not_recorded"),
    collectiveWasteKg:
      collectiveWasteKg !== null
        ? availableField(collectiveWasteKg)
        : unavailableField("collective_waste_kg_not_recorded"),
    collectiveCigaretteButtsCount:
      collectiveButts !== null
        ? availableField(collectiveButts)
        : unavailableField("collective_cigarette_butts_not_recorded"),
    individualAttributionAllowed: false,
  };
}

export function buildCommunicableReference(params: {
  userId: string;
  action: RawActionRow;
  organization: EngagementProofField<EngagementProofCommunicableOrganization>;
  missions: readonly EngagementProofAttestedMission[];
}): EngagementProofCommunicableReference {
  const missionCodes: EngagementProofMissionCode[] = params.missions.map(
    (mission) => mission.roleCode,
  );
  // This hashes an authenticated user ID and proof metadata into a deterministic
  // reference fingerprint; it is not password material or an authentication secret.
  // codeql[js/insufficient-password-hash]
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        userId: params.userId,
        actionId: params.action.id,
        actionDate: params.action.action_date,
        missions: params.missions.map((mission) => ({
          id: mission.missionId,
          code: mission.roleCode,
          rev: mission.revision,
          ref: mission.evidenceReference,
        })),
      }),
      "utf8",
    )
    .digest("hex");

  const shortHash = fingerprint.slice(0, 12).toUpperCase();
  const dateCompact = params.action.action_date.slice(0, 10).replace(/[^0-9]/g, "");
  return {
    referenceCode: `CMM-ENG-${dateCompact || "00000000"}-${shortHash}`,
    actionId: params.action.id,
    actionDate: params.action.action_date,
    locationLabel: params.action.location_label,
    organizationName: params.organization.value?.name ?? null,
    presenceConfirmed: true,
    attestedMissionCodes: missionCodes,
    sourceRevisionFingerprint: fingerprint,
  };
}

export function resolveActionTitle(action: RawActionRow): string | null {
  const title = action.preparation_data?.actionTitle?.trim() ?? "";
  return title.length > 0 ? title : null;
}

export function resolveActionContextValue(action: RawActionRow): ActionContext | null {
  return action.action_context === "citizen" ||
    action.action_context === "company" ||
    action.action_context === "school"
    ? action.action_context
    : null;
}
