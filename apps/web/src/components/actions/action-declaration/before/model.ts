import type { FormState } from "../form/model";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { ActionPreparationData, ActionStatus } from "@/lib/actions/types";
import { normalizeParticipantAccounts } from "../payload";
import {
  ENTREPRISE_ASSOCIATION_OPTION,
  extractEntrepriseName,
  normalizeAssociationSelectionForPrefill,
} from "@/lib/actions/association-options";

export type SelectOption = {
  value: string;
  label: string;
};

export type ActionBeforeDeclarationFormProps = {
  actorNameOptions: string[];
  defaultActorName: string;
  isAuthenticated: boolean;
  userMetadata: {
    userId: string;
    handle?: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  linkedEventId?: string;
  initialActionId?: string | null;
  initialRecordType?: "action";
  onPassToComplete: (actionId: string) => void | Promise<void>;
  onFormChange?: (form: FormState) => void;
  onActionPersisted?: (actionId: string) => void;
  signInHref?: string;
  signUpHref?: string;
};

export type PublicationSummaryItem = {
  label: string;
  value: string;
};

type PublicationSummarySource = FormState | ActionEditorRecord;

export type ResumablePreAction = Pick<ActionEditorRecord, "actionPhase" | "status">;

export function isResumablePreAction(action: ResumablePreAction): boolean {
  return (
    action.actionPhase === "pre_action" &&
    (action.status === "pending" || action.status === "approved")
  );
}

export type TerminalPreActionStatus = Extract<ActionStatus, "rejected" | "cancelled">;

function preparationDataFrom(source: PublicationSummarySource): ActionPreparationData {
  if ("preparationData" in source) {
    return source.preparationData ?? {};
  }

  return {
    actionTitle: source.actionTitle,
    shortDescription: source.shortDescription,
    communeZoneLabel: source.communeZoneLabel,
    pointDeRendezVous: source.departureLocationLabel,
    zoneCiblePrevue: source.arrivalLocationLabel,
    actionDate: source.actionDate,
    meetingTime: source.meetingTime,
    departureTime: source.departureTime,
    plannedObjective: source.plannedObjective,
    placeType: source.placeType,
    estimatedDifficulty: source.estimatedDifficulty,
    accessibility: source.accessibility,
    safetyInstructions: source.safetyInstructions,
    recommendedMaterials: source.recommendedMaterials,
    participantMessage: source.participantMessage,
    preparationState: source.preparationState,
    logisticsNotes: source.logisticsNotes,
    checklistBeforeDeparture: source.checklistBeforeDeparture,
    volunteersExpected: Number(source.volunteersCount) || undefined,
    groupJoinEnabled: source.groupJoinEnabled,
    expectedWasteCategories: source.wasteCategories,
    operationalRoute: source.operationalRoute ?? undefined,
    routeCalibrationContext: source.routeCalibrationContext ?? undefined,
  };
}

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatWeather(source: PublicationSummarySource): string {
  const preparation = preparationDataFrom(source);
  const weather = preparation.routeCalibrationContext?.plannerSnapshot?.weatherContext;
  if (!weather || weather.status !== "available") {
    return "Non disponible dans les données canoniques de cette action";
  }

  const temperature = weather.summary?.temperatureC;
  return typeof temperature === "number" && Number.isFinite(temperature)
    ? `Prévision disponible · ${temperature} °C`
    : "Prévision disponible";
}

function formatItinerary(source: PublicationSummarySource): string {
  const preparation = preparationDataFrom(source);
  const routeCount = preparation.operationalRoute?.routes.length ?? 0;
  const departure = textValue(
    "departureLocationLabel" in source
      ? source.departureLocationLabel
      : preparation.pointDeRendezVous,
    "Point de départ non renseigné",
  );
  const arrival = textValue(
    "arrivalLocationLabel" in source
      ? source.arrivalLocationLabel
      : preparation.zoneCiblePrevue,
    "Zone cible non renseignée",
  );
  const route = `${departure} → ${arrival}`;
  return routeCount > 0 ? `${route} · ${routeCount} groupe(s)` : route;
}

export function buildPublicationSummary(
  source: PublicationSummarySource,
): PublicationSummaryItem[] {
  const preparation = preparationDataFrom(source);
  const actionDate = "actionDate" in source ? source.actionDate : preparation.actionDate;
  const startTime =
    "eventStartTime" in source
      ? source.eventStartTime ?? preparation.meetingTime ?? preparation.departureTime
      : preparation.meetingTime ?? preparation.departureTime;
  const endTime = "eventEndTime" in source ? source.eventEndTime : undefined;
  const location = textValue(
    "departureLocationLabel" in source
      ? source.departureLocationLabel
      : preparation.pointDeRendezVous ?? preparation.communeZoneLabel,
    "Lieu non renseigné",
  );
  const preparationState = textValue(
    preparation.preparationState,
    "Préparation non renseignée",
  );
  const volunteers =
    "volunteersCount" in source
      ? String(source.volunteersCount)
      : typeof preparation.volunteersExpected === "number"
        ? String(preparation.volunteersExpected)
        : "Non renseigné";
  const safetyInstructions = textValue(
    preparation.safetyInstructions,
    "Aucune consigne principale renseignée",
  );
  const preparationDetails = [
    labelForPreparationState(preparationState as FormState["preparationState"]),
    preparation.recommendedMaterials
      ? `Matériel : ${preparation.recommendedMaterials.trim()}`
      : null,
    preparation.checklistBeforeDeparture
      ? `Checklist : ${preparation.checklistBeforeDeparture.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const logisticsNotes = textValue(
    preparation.logisticsNotes,
    "Non renseignée — à vérifier selon le lieu et l'itinéraire",
  );

  return [
    { label: "Itinéraire", value: formatItinerary(source) },
    {
      label: "Date / heure",
      value: [actionDate, startTime, endTime ? `à ${endTime}` : null]
        .filter(Boolean)
        .join(" · ") || "Date et horaire non renseignés",
    },
    { label: "Lieu", value: location },
    {
      label: "Préparation",
      value: preparationDetails,
    },
    { label: "Météo", value: formatWeather(source) },
    { label: "Formalité Paris", value: logisticsNotes },
    { label: "Bénévoles recherchés", value: volunteers },
    { label: "Consignes principales", value: safetyInstructions },
  ];
}

export type BeforeActionFieldUpdater = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

export const PLANNED_OBJECTIVE_OPTIONS: SelectOption[] = [
  { value: "repérage", label: "Repérage" },
  { value: "nettoyage", label: "Nettoyage" },
  { value: "collecte_mégots", label: "Collecte mégots" },
  { value: "action_mixte", label: "Action mixte" },
  { value: "sensibilisation", label: "Sensibilisation" },
  { value: "autre", label: "Autre" },
];

export const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: "facile", label: "Facile" },
  { value: "moderee", label: "Modérée" },
  { value: "soutenue", label: "Soutenue" },
];

export const CREATOR_ROLE_OPTIONS: SelectOption[] = [
  { value: "organisateur", label: "Organisateur" },
  { value: "benevole", label: "Bénévole" },
  { value: "association", label: "Association" },
  { value: "etudiant", label: "Étudiant" },
  { value: "autre", label: "Autre" },
];

export const PREPARATION_STATE_OPTIONS: SelectOption[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "pret_a_partager", label: "Prêt à partager" },
  { value: "action_en_cours", label: "Action en cours" },
  { value: "a_completer_apres_action", label: "À compléter après action" },
];

export function sanitizePreActionForm(form: FormState): FormState {
  const next: FormState = {
    ...form,
    routeStyle: "souple",
    routeAdjustmentMessage: "",
    notes: "",
    wasteKg: "",
    wasteMeasurementMethod: "",
    wasteRecyclablesKg: "",
    wasteGlassKg: "",
    wasteHouseholdKg: "",
    wasteOtherKg: "",
    wasteUnusualObjects: "",
    wasteSpecialHandlingWaste: "",
    cigaretteButts: "",
    cigaretteButtsCount: "",
    cigaretteButtsCondition: "propre",
    cigaretteButtsVolumeLiters: "",
    wasteMegotsKg: "",
    wasteMegotsCondition: "propre",
    wastePlastiqueKg: "",
    wasteVerreKg: "",
    wasteMetalKg: "",
    wasteMixteKg: "",
    triQuality: "moyenne",
    visionBagsCount: "",
    visionFillLevel: "",
    visionDensity: "",
  };

  next.actionTitle = next.actionTitle.trim();
  next.shortDescription = next.shortDescription.trim();
  next.communeZoneLabel = next.communeZoneLabel.trim();
  next.actionDate = next.actionDate.trim();
  next.meetingTime = next.meetingTime.trim();
  next.departureTime = next.departureTime.trim();
  next.eventStartTime = next.eventStartTime.trim();
  next.eventEndTime = next.eventEndTime.trim();
  next.locationLabel = next.departureLocationLabel.trim() || next.actionTitle;
  next.departureLocationLabel = next.departureLocationLabel.trim();
  next.accessibility = next.accessibility.trim();
  next.safetyInstructions = next.safetyInstructions.trim();
  next.recommendedMaterials = next.recommendedMaterials.trim();
  next.groupJoinEnabled = Boolean(next.groupJoinEnabled);
  next.participantAccounts = normalizeParticipantAccounts(next.participantAccounts);
  next.volunteersCount = next.volunteersCount.trim() || "1";
  next.childrenCount = next.childrenCount.trim();
  next.adultCount = next.adultCount.trim();
  next.retiredCount = next.retiredCount.trim();
  const enterpriseFromAssociation = extractEntrepriseName(next.associationName);
  const normalizedAssociation = normalizeAssociationSelectionForPrefill(next.associationName);
  next.associationName = normalizedAssociation ?? next.associationName.trim();
  if (enterpriseFromAssociation) {
    next.associationName = ENTREPRISE_ASSOCIATION_OPTION;
    next.enterpriseName = enterpriseFromAssociation;
  }
  next.enterpriseName = next.enterpriseName.trim();
  next.actorName = next.actorName.trim();
  next.durationMinutes = next.durationMinutes.trim();

  if (next.associationName !== ENTREPRISE_ASSOCIATION_OPTION) {
    next.enterpriseName = "";
  }

  return next;
}

export function buildPreActionSummaryNote(form: FormState): string | null {
  const chunks = [
    form.actionTitle.trim(),
    form.actionDate.trim(),
    form.departureLocationLabel.trim(),
    form.plannedObjective.trim(),
  ].filter((value) => value.length > 0);
  return chunks.length > 0 ? chunks.join(" · ") : null;
}

export function labelForPreparationState(value: FormState["preparationState"]): string {
  return PREPARATION_STATE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
