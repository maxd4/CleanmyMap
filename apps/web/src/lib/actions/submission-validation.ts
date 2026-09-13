import type { CreateActionPayload } from "./types";
import { hasCigaretteButtsMeasurement } from "@/lib/waste/cigarette-butts";
import {
  hasCompleteVolunteerCategoryData,
  hasVolunteerCategoryData,
  normalizeVolunteerParticipation,
} from "./volunteer-participation";

export type VolunteerActionValidationIssue = {
  field: "volunteersCount" | "volunteerParticipation" | "wasteKg";
  message: string;
};

type VolunteerActionSubmissionLike = Pick<
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
>;

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
  const hasCategoryData = hasVolunteerCategoryData(participation);
  const hasCompleteCategoryData = participation
    ? hasCompleteVolunteerCategoryData(participation)
    : false;
  if (hasCategoryData && !hasCompleteCategoryData) {
    issues.push({
      field: "volunteerParticipation",
      message:
        "Renseignez les trois catégories de bénévoles pour calculer le total.",
    });
  }
  const volunteersCount = Math.trunc(
    participation?.participantsCount ?? payload.volunteersCount,
  );
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

  if (volunteersCount < 1) {
    issues.push({
      field: "volunteersCount",
      message: "Renseignez au moins 1 bénévole.",
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
