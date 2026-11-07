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
import {
  deriveVolunteerCountFromForm,
  getFinalVolunteerCompositionValidationMessage,
} from "@/lib/actions/volunteer-participation";
import { toOptionalNumber } from "../payload-numbers";
import {
  calculateCigaretteButtsLotsTotalCount,
  getCigaretteButtsLotsTotalLimitMessage,
  MAX_CIGARETTE_BUTTS_COUNT,
  MAX_CIGARETTE_BUTTS_LOTS,
} from "@/lib/waste/cigarette-butts";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste/measurement";

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
    actionDurationMinutes: toOptionalNumber(form.durationMinutes),
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

function getMeasurementIssues(form: FormState): ValidationIssue[] {
  const fields = [
    ["wasteKg", form.wasteKg], ["wasteRecyclablesKg", form.wasteRecyclablesKg],
    ["wasteGlassKg", form.wasteGlassKg], ["wasteHouseholdKg", form.wasteHouseholdKg],
    ["wasteOtherKg", form.wasteOtherKg], ["wasteMegotsKg", form.wasteMegotsKg],
    ["cigaretteButtsCount", form.cigaretteButtsCount], ["cigaretteButtsVolumeLiters", form.cigaretteButtsVolumeLiters],
  ] as const;
  const issues = fields.flatMap(([field, value]) => value.trim() && !Number.isFinite(Number(value))
    ? [{ field: field as ValidationIssue["field"], message: "Saisissez une mesure numérique valide ou laissez ce champ vide." }]
    : []);
  for (const value of Object.values(form.wasteCharacterizationKg)) {
    if (value?.trim() && !Number.isFinite(Number(value))) {
      issues.push({ field: "wasteCharacterizationKg", message: "Saisissez une masse caractérisée numérique ou laissez le champ vide." });
    }
  }
  if (form.cigaretteButtsLots === null) return issues;
  if (form.cigaretteButtsLots.length > MAX_CIGARETTE_BUTTS_LOTS) {
    issues.push({ field: "cigaretteButtsLots", message: `Limitez les collectes de mégots à ${MAX_CIGARETTE_BUTTS_LOTS} lots.` });
  }
  const seen = new Set<string>();
  const calculableLots = [] as Array<{
    id: string;
    source: "count" | "mass_kg" | "volume_l";
    value: number;
    condition: "propre" | "humide" | "mouille";
  }>;
  for (const lot of form.cigaretteButtsLots) {
    const value = lot.value.trim();
    const numericValue = Number(value);
    if (!lot.id.trim() || seen.has(lot.id.trim())) {
      issues.push({ field: "cigaretteButtsLots", message: "Chaque lot de mégots doit avoir un identifiant unique." });
    }
    seen.add(lot.id.trim());
    if (!value || !Number.isFinite(numericValue) || numericValue < 0) {
      issues.push({ field: "cigaretteButtsLots", message: "Chaque lot de mégots doit contenir une valeur numérique non négative." });
      continue;
    }
    if (lot.source === "count" && (!Number.isInteger(numericValue) || numericValue > MAX_CIGARETTE_BUTTS_COUNT)) {
      issues.push({ field: "cigaretteButtsLots", message: `Un lot compté doit être un entier compris entre 0 et ${MAX_CIGARETTE_BUTTS_COUNT}.` });
      continue;
    }
    if (lot.source !== "count" && numericValue > ACTION_MEASUREMENT_MAX_KG) {
      issues.push({ field: "cigaretteButtsLots", message: `La masse ou le volume d’un lot doit rester inférieur ou égal à ${ACTION_MEASUREMENT_MAX_KG}.` });
      continue;
    }
    calculableLots.push({ id: lot.id.trim(), source: lot.source, value: numericValue, condition: lot.condition });
  }
  if (calculableLots.length === form.cigaretteButtsLots.length) {
    const totalMessage = getCigaretteButtsLotsTotalLimitMessage(
      calculateCigaretteButtsLotsTotalCount(calculableLots),
    );
    if (totalMessage) {
      issues.push({ field: "cigaretteButtsLots", message: totalMessage });
    }
  }
  return issues;
}

function getParticipantIssues(form: FormState): ValidationIssue[] {
  if (form.recordType !== "action") return [];
  const compositionInput = {
    adultCount: form.adultCount,
    retiredCount: form.retiredCount,
    childrenCount: form.childrenCount,
  };
  const compositionMessage = getFinalVolunteerCompositionValidationMessage(compositionInput);
  if (compositionMessage) {
    return [{ field: "volunteerParticipation", message: compositionMessage }];
  }
  return deriveVolunteerCountFromForm(compositionInput) === null
    ? [{ field: "volunteerParticipation", message: "La composition des participants est incomplète." }]
    : [];
}

function getGeometryIssues(params: Pick<SubmissionValidationParams, "form" | "payload" | "declarationMode" | "hasValidDrawing" | "hasServerRouteInput" | "isCleanPlaceMode" | "gpxImport" | "manualDrawingSource">): ValidationIssue[] {
  const { form, payload, declarationMode, hasValidDrawing, hasServerRouteInput, isCleanPlaceMode, gpxImport, manualDrawingSource } = params;
  const explicitGeometryMethod = form.geometryMethod;
  const missingSource: ValidationIssue | null = explicitGeometryMethod === "manual" && manualDrawingSource !== "manual"
    ? { field: "manualDrawing", message: "Un dessin manuel valide est requis pour la source cartographique sélectionnée." }
    : explicitGeometryMethod === "gpx_import" && (manualDrawingSource !== "gpx_import" || !gpxImport)
      ? { field: "gpxImport", message: "Un tracé GPX exploitable est requis pour la source cartographique sélectionnée." }
      : explicitGeometryMethod === "generator" && !payload.preparationData?.operationalRoute?.routes?.length
        ? { field: "geometryMethod", message: "Le parcours opérationnel du générateur est indisponible. Choisissez une autre source." }
        : null;
  const issues: ValidationIssue[] = missingSource ? [missingSource] : declarationMode === "complete" && !explicitGeometryMethod && !hasValidDrawing && !hasServerRouteInput && !isCleanPlaceMode
    ? [{ field: "manualDrawing", message: "Ajoute un tracé manuel valide ou un aperçu géographique avant l'envoi." }]
    : [];
  if (gpxImport && manualDrawingSource !== "gpx_import") issues.push({ field: "gpxImport", message: "Le tracé GPX sélectionné n’est plus présent. Supprimez-le ou réimportez-le." });
  return issues;
}

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

  issues.push(...getMeasurementIssues(form), ...getParticipantIssues(form));

  const measurementIssues = getActionMeasurementValidationIssues(payload);
  issues.push(...measurementIssues);

  const volunteerIssues = getVolunteerActionValidationIssues(payload);
  issues.push(...volunteerIssues);

  issues.push(...getGeometryIssues({ form, payload, declarationMode, hasValidDrawing, hasServerRouteInput, isCleanPlaceMode, gpxImport, manualDrawingSource }));

  return issues.filter((issue, index, allIssues) =>
    allIssues.findIndex(
      (candidate) => candidate.field === issue.field && candidate.message === issue.message,
    ) === index,
  );
}
