import { buildCreateActionPayload } from "../payload";
import type { FormState } from "../model";
import type { ActionPhotoAsset, ActionVisionEstimate, CreateActionPayload } from "@/lib/actions/types";
import { getTimeContractValidationIssues } from "@/lib/actions/time-contract";
import {
  getVolunteerForecastValidationMessage,
  type VolunteerParticipationInput,
} from "@/lib/actions/volunteer-participation";
import type { ActionBeforeDeclarationFormProps } from "./model";
import { toOptionalNumber } from "../payload-numbers";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";

export type BeforeValidationField =
  | "actionTitle"
  | "actionDate"
  | "associationName"
  | "organizerType"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "meetingTime"
  | "departureTime"
  | "durationMinutes"
  | "eventStartTime"
  | "eventEndTime"
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
  const isFixedArea = normalizeActionInterventionMode(form.interventionMode)?.mode === "fixed_area";
  if (!isFixedArea && form.recordType === "action" && form.routeTopology === "point_to_point" && !form.arrivalLocationLabel.trim()) {
    issues.push({ field: "arrivalLocationLabel", message: "Indiquez l'arrivée pour un parcours départ → arrivée." });
  }
  const durationInput = form.durationMinutes.trim();
  const duration = toOptionalNumber(durationInput);
  if (
    durationInput &&
    (duration === undefined || !Number.isInteger(duration) || duration < 0)
  ) {
    issues.push({
      field: "durationMinutes",
      message: "La durée estimée doit être un nombre entier positif ou nul.",
    });
  }
  const timeIssues = getTimeContractValidationIssues({
    actionDurationMinutes: duration,
    startTime: form.eventStartTime,
    endTime: form.eventEndTime,
    meetingTime: form.meetingTime,
    departureTime: form.departureTime,
  });
  issues.push(...timeIssues);

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
  const isDefaultPostActionComposition =
    !totalInput &&
    form.childrenCount.trim() === "0" &&
    form.adultCount.trim() === "" &&
    form.retiredCount.trim() === "0";
  if (isDefaultPostActionComposition) return issues;
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

function resolveOrganizationLinkFromLocation(): CreateActionPayload["organizationLink"] {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.has("actionId") || params.has("duplicateFrom")) return undefined;
  const organizationId = params.get("organizationId") ?? "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(organizationId)) return undefined;
  const requestedSiteId = params.get("siteId");
  return {
    organizationId,
    siteId: requestedSiteId && uuid.test(requestedSiteId) ? requestedSiteId : null,
  };
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
  const organizationLink = resolveOrganizationLinkFromLocation();
  return {
    ...payload,
    ...(organizationLink ? { organizationLink } : {}),
    actorName:
      userMetadata.displayName?.trim() ||
      userMetadata.handle?.trim() ||
      userMetadata.username?.trim() ||
      userMetadata.userId,
  };
}
