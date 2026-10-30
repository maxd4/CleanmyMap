import { getTimeContractValidationMessage } from "@/lib/actions/time-contract";
import { isActionDateInFuture } from "@/lib/actions/temporal";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
  getActionMeasurementValidationIssues,
  getVolunteerActionValidationIssues,
} from "@/lib/actions/submission-validation";
import type {
  ActionGeometrySource,
  CreateActionPayload,
} from "@/lib/actions/types";
import {
  OTHER_VOLUNTEER_ASSOCIATION_VALUE,
} from "../payload";
import type { FormState, ValidationIssue } from "../model";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";
import { getVolunteerActionCompositionValidationMessage } from "@/lib/actions/volunteer-participation";

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
  const isFixedArea = normalizeActionInterventionMode(normalized.interventionMode)?.mode === "fixed_area";
  if (isFixedArea) {
    normalized.arrivalLocationLabel = "";
    normalized.arrivalCoordinates = null;
  }
  if (normalized.recordType === "action" && normalized.routeTopology === "loop") {
    normalized.arrivalLocationLabel = "";
  }
  if (normalized.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE) {
    normalized.associationName = "Action spontanée";
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

  if (form.organizerType === "spontaneous" && !form.organizerAccounts.trim()) {
    issues.push({
      field: "associationName",
      message: "Sélectionnez un compte utilisateur comme organisateur avant la déclaration finale.",
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

  if (isActionDateInFuture(form.actionDate)) {
    issues.push({
      field: "actionDate",
      message: "Une déclaration finale doit concerner une date déjà passée ou aujourd’hui.",
    });
  }

  const routeTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel: form.arrivalLocationLabel,
    recordType: form.recordType,
  });

  if (
    normalizeActionInterventionMode(form.interventionMode)?.mode !== "fixed_area" &&
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
    return [];
  }

  const issues: ValidationIssue[] = [...getStepOneValidationIssues(form)];

  const rawMeasurementFields = [
    ["wasteKg", form.wasteKg],
    ["wasteRecyclablesKg", form.wasteRecyclablesKg],
    ["wasteGlassKg", form.wasteGlassKg],
    ["wasteHouseholdKg", form.wasteHouseholdKg],
    ["wasteOtherKg", form.wasteOtherKg],
    ["wasteMegotsKg", form.wasteMegotsKg],
    ["cigaretteButtsCount", form.cigaretteButtsCount],
    ["cigaretteButtsVolumeLiters", form.cigaretteButtsVolumeLiters],
  ] as const;
  for (const [field, rawValue] of rawMeasurementFields) {
    if (rawValue.trim() && !Number.isFinite(Number(rawValue))) {
      issues.push({
        field,
        message: "Saisissez une mesure numérique valide ou laissez ce champ vide.",
      });
    }
  }

  if (form.recordType === "action") {
    const totalInput = form.volunteersCount.trim();
    const total = Number(totalInput);
    const hasInvalidTotal =
      !totalInput ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > 500;
    if (hasInvalidTotal) {
      issues.push({
        field: "volunteersCount",
        message:
          "Renseignez le nombre total de participants présents (un entier de 1 à 500).",
      });
    } else {
      const compositionMessage = getVolunteerActionCompositionValidationMessage({
        volunteersCount: total,
        childrenCount: form.childrenCount.trim() === "" ? null : Number(form.childrenCount),
        retiredCount: form.retiredCount.trim() === "" ? null : Number(form.retiredCount),
      });
      if (compositionMessage) {
        issues.push({ field: "volunteerParticipation", message: compositionMessage });
      }
    }
  }

  const measurementIssues = getActionMeasurementValidationIssues(payload);
  issues.push(...measurementIssues);

  const volunteerIssues = getVolunteerActionValidationIssues(payload);
  issues.push(...volunteerIssues);

  const explicitGeometryMethod = form.geometryMethod;
  const missingExplicitSource: ValidationIssue | null = explicitGeometryMethod === "manual" && manualDrawingSource !== "manual"
    ? {
        field: "manualDrawing",
        message: "Un dessin manuel valide est requis pour la source cartographique sélectionnée.",
      }
    : explicitGeometryMethod === "gpx_import" && (manualDrawingSource !== "gpx_import" || !gpxImport)
      ? {
          field: "gpxImport",
          message: "Un tracé GPX exploitable est requis pour la source cartographique sélectionnée.",
        }
      : explicitGeometryMethod === "generator" && !payload.preparationData?.operationalRoute?.routes?.length
        ? {
            field: "geometryMethod",
            message: "Le parcours opérationnel du générateur est indisponible. Choisissez une autre source.",
          }
        : null;

  if (missingExplicitSource) {
    issues.push(missingExplicitSource);
  } else if (
    declarationMode === "complete" &&
    !explicitGeometryMethod &&
    !hasValidDrawing &&
    !hasServerRouteInput &&
    !isCleanPlaceMode
  ) {
    issues.push({
      field: "manualDrawing",
      message:
        "Ajoute un tracé manuel valide ou un aperçu géographique avant l'envoi.",
    });
  }

  if (gpxImport && manualDrawingSource !== "gpx_import") {
    issues.push({
      field: "gpxImport",
      message:
        "Le tracé GPX sélectionné n’est plus présent. Supprimez-le ou réimportez-le.",
    });
  }

  return issues.filter((issue, index, allIssues) =>
    allIssues.findIndex(
      (candidate) => candidate.field === issue.field && candidate.message === issue.message,
    ) === index,
  );
}
