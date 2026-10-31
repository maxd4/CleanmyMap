import { z } from "zod";
import type { CreateActionPayload } from "./types";
import { actionMeasurementSchemaFields } from "@/lib/validation/action-measurements";
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

export type ActionMeasurementValidationField =
  | "wasteKg"
  | "wasteRecyclablesKg"
  | "wasteGlassKg"
  | "wasteHouseholdKg"
  | "wasteOtherKg"
  | "wasteMegotsKg"
  | "cigaretteButtsCount"
  | "cigaretteButtsVolumeLiters";

export type ActionMeasurementValidationIssue = {
  field: ActionMeasurementValidationField;
  message: string;
};

const actionMeasurementSchema = z.object(actionMeasurementSchemaFields);

function mapMeasurementPathToField(
  path: PropertyKey[],
): ActionMeasurementValidationField | null {
  const pathKey = path.join(".");
  switch (pathKey) {
    case "wasteKg":
      return "wasteKg";
    case "wasteBreakdown.recyclablesKg":
      return "wasteRecyclablesKg";
    case "wasteBreakdown.glassKg":
      return "wasteGlassKg";
    case "wasteBreakdown.householdWasteKg":
      return "wasteHouseholdKg";
    case "wasteBreakdown.otherWasteKg":
      return "wasteOtherKg";
    case "cigaretteButtsMeasurements.cigaretteButtsMassKg":
    case "cigaretteButtsMassKg":
    case "cigaretteButtsKg":
      return "wasteMegotsKg";
    case "cigaretteButtsMeasurements.cigaretteButtsCount":
    case "cigaretteButtsCount":
    case "cigaretteButts":
      return "cigaretteButtsCount";
    case "cigaretteButtsMeasurements.cigaretteButtsVolumeLiters":
    case "cigaretteButtsVolumeLiters":
      return "cigaretteButtsVolumeLiters";
    default:
      return null;
  }
}

function messageForMeasurementField(
  field: ActionMeasurementValidationField,
): string {
  switch (field) {
    case "wasteKg":
    case "wasteRecyclablesKg":
    case "wasteGlassKg":
    case "wasteHouseholdKg":
    case "wasteOtherKg":
      return "La masse de déchets doit être comprise entre 0 et 100 000 kg et respecter une résolution de 0,1 kg.";
    case "wasteMegotsKg":
      return "La masse de mégots doit être comprise entre 0 et 100 000 kg.";
    case "cigaretteButtsCount":
      return "Le nombre de mégots doit être un entier compris entre 0 et 5 000 000.";
    case "cigaretteButtsVolumeLiters":
      return "Le volume de mégots doit être compris entre 0 et 100 000 litres.";
  }
}

export function getActionMeasurementValidationIssues(
  payload: CreateActionPayload,
): ActionMeasurementValidationIssue[] {
  const result = actionMeasurementSchema.safeParse(payload);
  if (result.success) return [];

  const issues = new Map<string, ActionMeasurementValidationIssue>();
  for (const issue of result.error.issues) {
    const field = mapMeasurementPathToField(issue.path);
    if (!field) continue;
    const mappedIssue = { field, message: messageForMeasurementField(field) };
    issues.set(`${field}:${mappedIssue.message}`, mappedIssue);
  }
  return [...issues.values()];
}

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
  const measurements = getVolunteerMeasurementFlags(payload);

  if (hasInconsistentAdultCount(payload, participation, compositionMessage, hasCompleteCategoryData)) {
    issues.push({
      field: "volunteerParticipation",
      message:
        "Le nombre d’adultes est calculé automatiquement à partir du total, des enfants et des retraités.",
    });
  }

  if (
    !measurements.hasWasteMeasurement &&
    !measurements.hasAnyCigaretteButtsMeasurement &&
    !measurements.hasCigaretteButtsWeightMeasurement &&
    !measurements.hasLegacyCigaretteButtsWeightMeasurement
  ) {
    issues.push({
      field: "wasteKg",
      message:
        "Renseignez au moins une mesure de déchets ou de mégots ; 0 reste une mesure valide.",
    });
  }

  return issues;
}

function hasInconsistentAdultCount(
  payload: VolunteerActionSubmissionLike,
  participation: ReturnType<typeof normalizeVolunteerParticipation> | null,
  compositionMessage: string | null,
  hasCompleteCategoryData: boolean,
): boolean {
  if (compositionMessage || !hasCompleteCategoryData || !participation) return false;
  return participation.adultCount !== deriveAdultCountFromTotal({
    volunteersCount: payload.volunteersCount,
    childrenCount: participation.childrenCount,
    retiredCount: participation.retiredCount,
  });
}

function getVolunteerMeasurementFlags(payload: VolunteerActionSubmissionLike) {
  return {
    hasWasteMeasurement: typeof payload.wasteKg === "number" && Number.isFinite(payload.wasteKg),
    hasAnyCigaretteButtsMeasurement: hasCigaretteButtsMeasurement(payload.cigaretteButtsMeasurements) ||
      (typeof payload.cigaretteButts === "number" && Number.isFinite(payload.cigaretteButts)),
    hasCigaretteButtsWeightMeasurement: typeof payload.cigaretteButtsKg === "number" && Number.isFinite(payload.cigaretteButtsKg),
    hasLegacyCigaretteButtsWeightMeasurement: typeof payload.wasteBreakdown?.megotsKg === "number" &&
      Number.isFinite(payload.wasteBreakdown.megotsKg),
  };
}
