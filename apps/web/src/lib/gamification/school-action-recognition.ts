import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import type { ActionVolunteerParticipation } from "@/lib/actions/volunteer-participation";
import type { ActionRow } from "@/types/database";
import { hasCigaretteButtsMeasurement } from "@/lib/waste/cigarette-butts";
import {
  hasDocumentedSorting,
  hasTraceableMeasurement,
  isCurrentActionValidated,
} from "./action-milestones";
import { CURRENT_SCHOOL_COLLECTIVE_RECOGNITIONS } from "./current-milestones";
import type { CurrentSchoolCollectiveRecognitionId } from "./progression-types";

export type SchoolActionRecognitionAssessment = {
  id: CurrentSchoolCollectiveRecognitionId;
  label: string;
  qualified: boolean;
  reason: string;
  evidence: {
    confirmedSchoolFrame: boolean;
    validatedAction: boolean;
    validParticipation: boolean;
    documentedSorting: boolean;
    traceableMeasurement: boolean;
  };
  xpAwarded: 0;
};

export type SchoolActionAttestation = {
  kind: "school_action_attestation";
  version: "school-action-attestation-2026.10-v2";
  actionId: string;
  status: "eligible" | "ineligible";
  isOfficialEducationCertification: false;
  context: "school" | "citizen" | "company" | "unknown";
  verifiedOrganizer: boolean;
  organizerPresence: "structured" | "not_provided";
  action: {
    date: string;
    locationLabel: string;
    totalParticipants: number | null;
    children: number | null;
    adultSupervisors: number | null;
  };
  measuredResults: {
    wasteKg: number | null;
    cigaretteButtsCount: number | null;
    categories: Record<string, number> | null;
    observationsProvided: boolean;
  };
  limits: readonly string[];
  recognitions: readonly SchoolActionRecognitionAssessment[];
};

const UNKNOWN = "Valeur absente : elle reste inconnue et n’est pas projetée.";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function getParticipation(
  _action: ActionRow,
  metadata: ReturnType<typeof extractActionMetadataFromNotes>,
): ActionVolunteerParticipation | null {
  // The preparation split is a forecast. Once the action is finalized, only
  // the canonical composition persisted in the final metadata may qualify.
  return metadata.volunteerParticipation;
}

function hasValidParticipation(
  action: ActionRow,
  participation: ActionVolunteerParticipation | null,
): participation is ActionVolunteerParticipation {
  if (!participation || !isNonNegativeInteger(action.volunteers_count) || action.volunteers_count < 1) {
    return false;
  }

  const counts = [
    participation.childrenCount,
    participation.adultCount,
    participation.retiredCount,
  ];
  return counts.every(isNonNegativeInteger) &&
    counts.reduce((total, count) => total + count, 0) === action.volunteers_count;
}

export function isConfirmedSchoolAction(
  action: ActionRow,
  canonicalOrganizerIds: readonly string[] = [],
): boolean {
  const confirmer = action.school_context_confirmed_by_clerk_id?.trim();
  if (action.action_context !== "school" || action.school_context_confirmed !== true || !confirmer) {
    return false;
  }

  return confirmer === action.created_by_clerk_id || canonicalOrganizerIds.includes(confirmer);
}

/**
 * Single active-projection predicate for school recognitions.
 * The route keeps its own public boundary, while every qualification path
 * reuses this exact lifecycle and visibility contract.
 */
export function isEligibleForSchoolActionRecognition(
  action: ActionRow,
  canonicalOrganizerIds: readonly string[] = [],
): boolean {
  return isConfirmedSchoolAction(action, canonicalOrganizerIds) &&
    action.status === "approved" &&
    action.action_phase === "post_action_complete" &&
    Boolean(action.published_at) &&
    action.moderation_visibility === "visible" &&
    action.access_mode === "public";
}

export function assessSchoolActionRecognitions(input: {
  action: ActionRow;
  canonicalOrganizerIds?: readonly string[];
}): SchoolActionRecognitionAssessment[] {
  const { action, canonicalOrganizerIds = [] } = input;
  const metadata = extractActionMetadataFromNotes(action.notes);
  const confirmedSchoolFrame = isConfirmedSchoolAction(action, canonicalOrganizerIds);
  const validatedAction = isCurrentActionValidated(action);
  const eligibleAction = isEligibleForSchoolActionRecognition(action, canonicalOrganizerIds);
  const participation = getParticipation(action, metadata);
  const validParticipation = hasValidParticipation(action, participation);
  const documentedSorting = hasDocumentedSorting(metadata);
  const traceableMeasurement = hasTraceableMeasurement(action, metadata);
  const base = eligibleAction;

  const results: Record<CurrentSchoolCollectiveRecognitionId, boolean> = {
    school_first_mission: base,
    school_documented_sorting: base && documentedSorting,
    school_field_debrief: base && validParticipation && traceableMeasurement,
  };

  return CURRENT_SCHOOL_COLLECTIVE_RECOGNITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    qualified: results[definition.id],
    reason: results[definition.id]
      ? definition.description
      : definition.id === "school_first_mission"
        ? "Une confirmation scolaire autorisée, une action publique publiée, approuvée et finalisée sont nécessaires."
        : definition.id === "school_documented_sorting"
          ? "Une ventilation canonique multi-flux réellement documentée est nécessaire."
          : "Une répartition de participation valide et une mesure traçable sont nécessaires.",
    evidence: {
      confirmedSchoolFrame,
      validatedAction,
      validParticipation,
      documentedSorting,
      traceableMeasurement,
    },
    xpAwarded: 0,
  }));
}

function measuredCategories(
  metadata: ReturnType<typeof extractActionMetadataFromNotes>,
): Record<string, number> | null {
  if (!hasDocumentedSorting(metadata) || !metadata.wasteBreakdown) return null;
  const entries: Array<[string, number]> = [];
  for (const [key, value] of Object.entries(metadata.wasteBreakdown)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      entries.push([key, value]);
    }
  }
  return Object.fromEntries(entries);
}

export function buildSchoolActionAttestation(input: {
  action: ActionRow;
  canonicalOrganizerIds?: readonly string[];
}): SchoolActionAttestation {
  const { action, canonicalOrganizerIds = [] } = input;
  const metadata = extractActionMetadataFromNotes(action.notes);
  const participation = getParticipation(action, metadata);
  const validParticipation = hasValidParticipation(action, participation);
  const recognitions = assessSchoolActionRecognitions(input);
  const measuredButts = hasCigaretteButtsMeasurement(metadata.cigaretteButtsMeasurements)
    ? metadata.cigaretteButtsMeasurements?.cigaretteButtsCount ?? null
    : null;
  const limits = [
    ...(action.waste_kg === null ? [UNKNOWN] : []),
    ...(measuredButts === null ? ["Les mégots non mesurés restent inconnus ; aucun total n’est déduit des adultes."] : []),
    ...(validParticipation ? [] : ["La participation catégorisée est incomplète ou incohérente."]),
    "Cette attestation est descriptive et ne constitue pas une certification officielle de l’Éducation nationale.",
    "Aucune donnée individuelle d’élève, note, résultat de quiz ou classement n’est exposé.",
  ];

  return {
    kind: "school_action_attestation",
    version: "school-action-attestation-2026.10-v2",
    actionId: action.id,
    status: isEligibleForSchoolActionRecognition(action, canonicalOrganizerIds) ? "eligible" : "ineligible",
    isOfficialEducationCertification: false,
    context: action.action_context ?? "unknown",
    verifiedOrganizer: false,
    organizerPresence: action.organizer_id && action.organizer_type ? "structured" : "not_provided",
    action: {
      date: action.action_date,
      locationLabel: action.location_label,
      totalParticipants: validParticipation ? action.volunteers_count : null,
      children: validParticipation ? participation.childrenCount : null,
      adultSupervisors: validParticipation
        ? (participation.adultCount ?? 0) + (participation.retiredCount ?? 0)
        : null,
    },
    measuredResults: {
      wasteKg: typeof action.waste_kg === "number" && Number.isFinite(action.waste_kg) && action.waste_kg >= 0
        ? action.waste_kg
        : null,
      cigaretteButtsCount: measuredButts,
      categories: measuredCategories(metadata),
      observationsProvided: Boolean(metadata.cleanNotes?.trim()),
    },
    limits,
    recognitions: recognitions.filter((recognition) => recognition.qualified),
  };
}

export function schoolActionRecognitionSourceId(
  actionId: string,
  recognitionId: CurrentSchoolCollectiveRecognitionId,
): string {
  return `school-action-recognition:${actionId}:${recognitionId}`;
}
