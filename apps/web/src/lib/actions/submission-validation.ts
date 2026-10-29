import type { CreateActionPayload } from "./types";
import { hasCigaretteButtsMeasurement } from "@/lib/waste/cigarette-butts";
import {
  deriveAdultCountFromTotal,
  getVolunteerActionCompositionValidationMessage,
  hasCompleteVolunteerCategoryData,
  normalizeVolunteerParticipation,
  type VolunteerParticipationInput,
} from "./volunteer-participation";

export type VolunteerActionValidationIssue = {
  field: "volunteersCount" | "volunteerParticipation" | "wasteKg";
  message: string;
};

type VolunteerActionSubmissionLike = Omit<
  Pick<
  CreateActionPayload,
    | "recordType"
    | "submissionMode"
    | "wasteKg"
    | "cigaretteButtsKg"
    | "cigaretteButts"
    | "cigaretteButtsMeasurements"
    | "volunteersCount"
    | "volunteerParticipation"
    | "wasteBreakdown"
  >,
  "volunteerParticipation"
> & {
  volunteerParticipation?: CreateActionPayload["volunteerParticipation"] | VolunteerParticipationInput;
};

export function getVolunteerActionValidationIssues(
  payload: VolunteerActionSubmissionLike,
): VolunteerActionValidationIssue[] {
  if (payload.recordType !== "action" || payload.submissionMode === "quick") {
    return [];
  }

  const issues: VolunteerActionValidationIssue[] = [];
  const participation = payload.volunteerParticipation
    ? normalizeVolunteerParticipation(payload.volunteerParticipation)
    : null;
  const hasCompleteCategoryData = participation
    ? hasCompleteVolunteerCategoryData(participation)
    : false;
  const compositionMessage = getVolunteerActionCompositionValidationMessage({
    volunteersCount: payload.volunteersCount,
    childrenCount: participation?.childrenCount ?? null,
    retiredCount: participation?.retiredCount ?? null,
  });
  if (compositionMessage) {
    issues.push({
      field: "volunteerParticipation",
      message: compositionMessage,
    });
  }
  const hasWasteMeasurement =
    typeof payload.wasteKg === "number" && Number.isFinite(payload.wasteKg);
  const hasAnyCigaretteButtsMeasurement =
    hasCigaretteButtsMeasurement(payload.cigaretteButtsMeasurements) ||
    (typeof payload.cigaretteButts === "number" &&
      Number.isFinite(payload.cigaretteButts));
  const hasCigaretteButtsWeightMeasurement =
    typeof payload.cigaretteButtsKg === "number" &&
    Number.isFinite(payload.cigaretteButtsKg);
  const hasLegacyCigaretteButtsWeightMeasurement =
    typeof payload.wasteBreakdown?.megotsKg === "number" &&
    Number.isFinite(payload.wasteBreakdown.megotsKg);

  if (
    !compositionMessage &&
    hasCompleteCategoryData &&
    participation?.adultCount !==
      deriveAdultCountFromTotal({
        volunteersCount: payload.volunteersCount,
        childrenCount: participation?.childrenCount,
        retiredCount: participation?.retiredCount,
      })
  ) {
    issues.push({
      field: "volunteerParticipation",
      message:
        "Le nombre d’adultes est calculé automatiquement à partir du total, des enfants et des retraités.",
    });
  }

  if (
    !hasWasteMeasurement &&
    !hasAnyCigaretteButtsMeasurement &&
    !hasCigaretteButtsWeightMeasurement &&
    !hasLegacyCigaretteButtsWeightMeasurement
  ) {
    issues.push({
      field: "wasteKg",
      message:
        "Renseignez au moins une mesure de déchets ou de mégots ; 0 reste une mesure valide.",
    });
  }

  return issues;
}
