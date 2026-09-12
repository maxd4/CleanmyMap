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
  const wasteKg = payload.wasteKg ?? 0;
  const cigaretteButts = Math.trunc(payload.cigaretteButts ?? 0);
  const breakdownMegotsKg = payload.wasteBreakdown?.megotsKg ?? 0;

  if (volunteersCount < 1) {
    issues.push({
      field: "volunteersCount",
      message: "Renseignez au moins 1 bénévole.",
    });
  }

  if (wasteKg <= 0 && cigaretteButts <= 0 && breakdownMegotsKg <= 0) {
    issues.push({
      field: "wasteKg",
      message: "Renseignez au moins des déchets ou des mégots non nuls.",
    });
  }

  return issues;
}
