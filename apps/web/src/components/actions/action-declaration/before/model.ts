import {
  EMPTY_ACTION_MEASUREMENT_FIELDS,
  type FormState,
} from "../model";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { ActionPreparationData, ActionStatus } from "@/lib/actions/types";
import type { ActionPreparationContext } from "@/lib/actions/action-preparation-context";
import type { ActiveRole } from "@/lib/domain-language";
import { normalizeParticipantAccounts, parseOrganizerAccounts } from "../payload";
import {
  normalizeAssociationSelectionForPrefill,
} from "@/lib/actions/association-options";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { buildPreparationSummaryDetails } from "./preparation-summary";

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
    activeRole?: ActiveRole;
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
  guidedWorkflow?: boolean;
  guidedReadiness?: "unknown" | "ready" | "blocked";
  preparationContext?: ActionPreparationContext;
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

  const volunteersExpected = source.volunteersCount.trim() === ""
    ? undefined
    : Number(source.volunteersCount);

  return {
    actionTitle: source.actionTitle,
    shortDescription: source.shortDescription,
    communeZoneLabel: source.communeZoneLabel,
    pointDeRendezVous: source.departureLocationLabel,
    zoneCiblePrevue: source.arrivalLocationLabel,
    actionDate: source.actionDate,
    meetingTime: source.meetingTime,
    departureTime: source.departureTime,
    ...(source.plannedObjective ? { plannedObjective: source.plannedObjective } : {}),
    ...(source.placeType ? { placeType: source.placeType } : {}),
    ...(source.estimatedDifficulty ? { estimatedDifficulty: source.estimatedDifficulty } : {}),
    accessibility: source.accessibility,
    accessibilityStatus: source.accessibilityStatus,
    safetyInstructions: source.safetyInstructions,
    recommendedMaterials: source.recommendedMaterials,
    materialsProvided: source.materialsProvided,
    suggestedMaterials: source.suggestedMaterials,
    participantMessage: source.participantMessage,
    logisticsNotes: source.logisticsNotes,
    checklistBeforeDeparture: source.checklistBeforeDeparture,
    ...(typeof volunteersExpected === "number" && Number.isFinite(volunteersExpected)
      ? { volunteersExpected }
      : {}),
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
  const topology = resolveActionRouteTopology({
    topology: preparation.routeTopology,
    arrivalLocationLabel: "arrivalLocationLabel" in source ? source.arrivalLocationLabel : preparation.zoneCiblePrevue,
    recordType: "action",
  });
  const route = topology === "point_to_point"
    ? `${departure} → ${arrival}`
    : `Boucle · ${departure}`;
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
  const volunteers =
    typeof preparation.volunteersExpected === "number"
      ? String(preparation.volunteersExpected)
      : "preparationData" in source
        ? "Non renseigné"
        : source.volunteersCount.trim() || "Non renseigné";
  const safetyInstructions = textValue(
    preparation.safetyInstructions,
    "Aucune consigne principale renseignée",
  );
  const preparationDetails = buildPreparationSummaryDetails(preparation);
  const logisticsNotes = textValue(
    preparation.logisticsNotes,
    "Non renseignée — à vérifier selon le lieu et l'itinéraire",
  );

  return [
    { label: "Itinéraire", value: formatItinerary(source) },
    { label: "État de l'action", value: actionWorkflowStateLabel(source) },
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
    { label: "Informations logistiques", value: logisticsNotes },
    { label: "Bénévoles recherchés", value: volunteers },
    { label: "Consignes principales", value: safetyInstructions },
  ];
}

export function actionWorkflowStateLabel(source: PublicationSummarySource): string {
  if (!("actionPhase" in source)) {
    return "Brouillon";
  }

  if (source.status === "cancelled") return "Action annulée";
  if (source.status === "rejected") return "Pré-action rejetée";
  if (source.actionPhase === "post_action_complete") {
    return source.status === "approved"
      ? "Action finalisée et validée"
      : "Action finalisée, validation en attente";
  }
  if (source.actionPhase === "post_action_draft") {
    return "Formulaire complet en brouillon";
  }
  return source.publishedAt
    ? "Pré-action publiée"
    : "Brouillon de pré-action";
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

export function sanitizePreActionForm(form: FormState): FormState {
  const next: FormState = {
    ...form,
    routeStyle: "souple",
    routeAdjustmentMessage: "",
    notes: "",
    ...EMPTY_ACTION_MEASUREMENT_FIELDS,
    wasteMegotsKg: "",
    wasteMegotsCondition: "propre",
    wastePlastiqueKg: "",
    wasteVerreKg: "",
    wasteMetalKg: "",
    wasteMixteKg: "",
    triQuality: "moyenne",
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
  next.organizerAccounts = parseOrganizerAccounts(next.organizerAccounts).join(", ");
  next.participantAccounts = normalizeParticipantAccounts(next.participantAccounts);
  next.volunteersCount = next.volunteersCount.trim();
  next.childrenCount = next.childrenCount.trim();
  next.adultCount = next.adultCount.trim();
  next.retiredCount = next.retiredCount.trim();
  next.actorName = next.actorName.trim();
  const enteredAssociationName = next.associationName.trim();
  const normalizedAssociation = normalizeAssociationSelectionForPrefill(next.associationName);
  next.associationName = normalizedAssociation ?? next.associationName.trim();
  next.organizerName = next.organizerName.trim();
  if (next.organizerType !== "spontaneous" && !next.organizerName) {
    next.organizerName = enteredAssociationName;
  }
  next.organizerId = next.organizerId?.trim() || null;
  next.durationMinutes = next.durationMinutes.trim();

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
