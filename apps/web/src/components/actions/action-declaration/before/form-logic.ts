import { buildCreateActionPayload } from "../payload";
import type { FormState } from "../model";
import type { ActionPhotoAsset, ActionVisionEstimate, CreateActionPayload } from "@/lib/actions/types";
import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";
import {
  getVolunteerForecastValidationMessage,
  type VolunteerParticipationInput,
} from "@/lib/actions/volunteer-participation";
import type { ActionBeforeDeclarationFormProps } from "./model";
import { toOptionalNumber } from "../payload-numbers";

export type BeforeValidationField =
  | "actionTitle"
  | "actionDate"
  | "associationName"
  | "organizerType"
  | "departureLocationLabel"
  | "eventStartTime"
  | "volunteersCount"
  | "volunteerParticipation";

export type BeforeValidationIssue = {
  field: BeforeValidationField;
  message: string;
};

export function validateBeforeActionForm(form: FormState): BeforeValidationIssue[] {
  const issues: BeforeValidationIssue[] = [];
  if (!form.actionTitle.trim()) issues.push({ field: "actionTitle", message: "Indiquez un titre pour enregistrer le pré-formulaire." });
  if (!form.actionDate.trim()) issues.push({ field: "actionDate", message: "Indiquez la date prévue avant d'enregistrer le pré-formulaire." });
  if (!form.associationName.trim()) issues.push({ field: "associationName", message: "Sélectionnez une structure ou un cadre d'engagement." });
  if (!form.organizerType) issues.push({ field: "organizerType", message: "Sélectionnez un type de structure avant d'enregistrer le pré-formulaire." });
  if (!form.departureLocationLabel.trim()) issues.push({ field: "departureLocationLabel", message: "Indiquez le point de rendez-vous avant d'enregistrer." });
  const timeMessage = getTimeContractValidationMessage({
    actionDurationMinutes: Number(form.durationMinutes),
    startTime: form.eventStartTime,
    endTime: form.eventEndTime,
  });
  if (timeMessage) issues.push({ field: "eventStartTime", message: timeMessage });

  const volunteerForecast = validateVolunteerForecastForm(form);
  issues.push(...volunteerForecast);
  return issues;
}

function parseVolunteerCount(value: string): number | undefined {
  const parsed = toOptionalNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

function validateVolunteerForecastForm(form: FormState): BeforeValidationIssue[] {
  const issues: BeforeValidationIssue[] = [];
  const totalInput = form.volunteersCount.trim();
  const total = parseVolunteerCount(totalInput);

  if (totalInput && (total === undefined || total < 1)) {
    issues.push({
      field: "volunteersCount",
      message: "Le nombre de bénévoles attendus doit être un entier d'au moins 1.",
    });
  }

  const categoryInputs = [form.childrenCount, form.adultCount, form.retiredCount];
  if (!categoryInputs.some((value) => value.trim())) return issues;

  const categories: VolunteerParticipationInput = {
    childrenCount: parseVolunteerCount(form.childrenCount) ?? null,
    adultCount: parseVolunteerCount(form.adultCount) ?? null,
    retiredCount: parseVolunteerCount(form.retiredCount) ?? null,
  };
  const categoryHasInvalidValue = categoryInputs.some(
    (value) => value.trim() !== "" && parseVolunteerCount(value) === undefined,
  );
  if (categoryHasInvalidValue) {
    issues.push({
      field: "volunteerParticipation",
      message: "La répartition doit contenir trois nombres entiers positifs ou nuls.",
    });
    return issues;
  }

  const message = getVolunteerForecastValidationMessage({
    volunteersExpected: totalInput ? total : undefined,
    volunteerParticipation: categories,
  });
  if (message) issues.push({ field: "volunteerParticipation", message });
  return issues;
}

export function buildBeforeActionPayload({
  form,
  linkedEventId,
  userMetadata,
}: {
  form: FormState;
  linkedEventId?: string;
  userMetadata: ActionBeforeDeclarationFormProps["userMetadata"];
}): CreateActionPayload {
  const payload = buildCreateActionPayload({
    form,
    declarationMode: "quick",
    isEntrepriseMode: false,
    effectiveManualDrawingEnabled: false,
    drawingIsValid: false,
    manualDrawing: null,
    linkedEventId,
    photos: [] as ActionPhotoAsset[],
    visionEstimate: null as ActionVisionEstimate | null,
    userMetadata,
  });
  return {
    ...payload,
    actorName:
      userMetadata.displayName?.trim() ||
      userMetadata.handle?.trim() ||
      userMetadata.username?.trim() ||
      userMetadata.userId,
  };
}
