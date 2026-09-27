import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { getVolunteerActionValidationIssues } from "@/lib/actions/submission-validation";
import type {
  ActionGeometrySource,
  CreateActionPayload,
} from "@/lib/actions/types";
import {
  OTHER_VOLUNTEER_ASSOCIATION_VALUE,
} from "../payload";
import type { FormState, ValidationIssue } from "../model";

export function normalizeActionDeclarationFormBeforeSubmit(
  form: FormState,
): FormState {
  const normalized = { ...form };
  normalized.routeStyle = "souple";
  normalized.routeTopology = resolveActionRouteTopology({
    topology: normalized.routeTopology,
    arrivalLocationLabel: normalized.arrivalLocationLabel,
    recordType: normalized.recordType,
  });
  if (normalized.recordType === "action" && normalized.routeTopology === "loop") {
    normalized.arrivalLocationLabel = "";
  }
  if (normalized.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE) {
    normalized.associationName = "Action spontanée";
  }
  if (normalized.associationName === "Action spontanée") {
    normalized.organizerAccounts = "";
  }
  if (!normalized.locationLabel.trim() && normalized.departureLocationLabel.trim()) {
    normalized.locationLabel = normalized.departureLocationLabel.trim();
  }
  return normalized;
}

export function getStepOneValidationIssues(form: FormState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!form.organizerType) {
    issues.push({
      field: "organizerType",
      message: "Sélectionnez un type de structure avant l’envoi.",
    });
  }

  if (!form.associationName.trim()) {
    issues.push({
      field: "associationName",
      message: "Renseignez un organisateur après avoir choisi le type de structure.",
    });
  }

  if (
    form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE &&
    !form.actorName.trim()
  ) {
    issues.push({
      field: "associationName",
      message:
        "Renseignez le nom ou pseudo du bénévole avant l’envoi.",
    });
  }

  if (!form.actionDate.trim()) {
    issues.push({
      field: "actionDate",
      message: "Indiquez la date de l’action avant l’envoi.",
    });
  }

  const routeTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel: form.arrivalLocationLabel,
    recordType: form.recordType,
  });

  if (
    form.recordType === "action" &&
    routeTopology === "point_to_point" &&
    !form.arrivalLocationLabel.trim()
  ) {
    issues.push({
      field: "arrivalLocationLabel",
      message: "Indiquez une arrivée pour un parcours départ → arrivée.",
    });
  }

  const timeMessage = getTimeContractValidationMessage({
    actionDurationMinutes: Number(form.durationMinutes),
    startTime: form.eventStartTime,
    endTime: form.eventEndTime,
  });
  if (timeMessage) {
    issues.push({ field: "eventStartTime", message: timeMessage });
  }

  return issues;
}

type SubmissionValidationParams = {
  form: FormState;
  payload: CreateActionPayload;
  isAuthenticated: boolean;
  declarationMode: "complete";
  hasValidDrawing: boolean;
  hasServerRouteInput: boolean;
  isCleanPlaceMode: boolean;
  gpxImport?: FormState["gpxImport"];
  manualDrawingSource: ActionGeometrySource | null;
};

export function getActionDeclarationSubmissionIssues({
  form,
  payload,
  isAuthenticated,
  declarationMode,
  hasValidDrawing,
  hasServerRouteInput,
  isCleanPlaceMode,
  gpxImport,
  manualDrawingSource,
}: SubmissionValidationParams): ValidationIssue[] {
  if (!isAuthenticated) {
    return [
      {
        field: "associationName",
        message: "Connectez-vous pour compléter et envoyer ce formulaire.",
      },
    ];
  }

  const stepOneIssues = getStepOneValidationIssues(form);
  if (stepOneIssues.length > 0) return stepOneIssues;

  const volunteerIssues = getVolunteerActionValidationIssues(payload);
  if (volunteerIssues.length > 0) return volunteerIssues;

  if (
    declarationMode === "complete" &&
    !hasValidDrawing &&
    !hasServerRouteInput &&
    !isCleanPlaceMode
  ) {
    return [
      {
        field: "manualDrawing",
        message:
          "Ajoute un tracé manuel valide ou un aperçu géographique avant l'envoi.",
      },
    ];
  }

  if (gpxImport && manualDrawingSource !== "gpx_import") {
    return [
      {
        field: "gpxImport",
        message:
          "Le tracé GPX sélectionné n’est plus présent. Supprimez-le ou réimportez-le.",
      },
    ];
  }

  return [];
}
