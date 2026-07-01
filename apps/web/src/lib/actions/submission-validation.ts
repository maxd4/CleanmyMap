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

function toNumber(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getVolunteerActionValidationIssues(
  payload: VolunteerActionSubmissionLike,
): VolunteerActionValidationIssue[] {
  if (payload.recordType !== "action" || payload.submissionMode === "quick") {
    return [];
  }

  const issues: VolunteerActionValidationIssue[] = [];
  const volunteersCount = Math.trunc(toNumber(payload.volunteersCount));
  const wasteKg = toNumber(payload.wasteKg);
  const cigaretteButts = Math.trunc(toNumber(payload.cigaretteButts));
  const breakdownMegotsKg = toNumber(payload.wasteBreakdown?.megotsKg);

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
