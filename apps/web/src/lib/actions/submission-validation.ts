import type { CreateActionPayload } from "./types";

export type VolunteerActionValidationIssue = {
  field: "volunteersCount" | "wasteKg";
  message: string;
};

type VolunteerActionSubmissionLike = Pick<
  CreateActionPayload,
  | "recordType"
  | "submissionMode"
  | "wasteKg"
  | "cigaretteButtsKg"
  | "cigaretteButts"
  | "volunteersCount"
  | "wasteBreakdown"
>;

export function getVolunteerActionValidationIssues(
  payload: VolunteerActionSubmissionLike,
): VolunteerActionValidationIssue[] {
  if (payload.recordType !== "action" || payload.submissionMode === "quick") {
    return [];
  }

  const issues: VolunteerActionValidationIssue[] = [];
  const volunteersCount = Math.trunc(payload.volunteersCount);
  const hasWasteMeasurement =
    typeof payload.wasteKg === "number" && Number.isFinite(payload.wasteKg);
  const hasCigaretteButtsMeasurement =
    typeof payload.cigaretteButts === "number" &&
    Number.isFinite(payload.cigaretteButts);
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
    !hasCigaretteButtsMeasurement &&
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
