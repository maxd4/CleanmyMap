import { buildCreateActionPayload } from "../payload";
import type { FormState } from "../model";
import type { ActionPhotoAsset, ActionVisionEstimate, CreateActionPayload } from "@/lib/actions/types";
import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";
import type { ActionBeforeDeclarationFormProps } from "./model";

export type BeforeValidationField =
  | "actionTitle"
  | "actionDate"
  | "associationName"
  | "organizerType"
  | "departureLocationLabel"
  | "eventStartTime";

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
