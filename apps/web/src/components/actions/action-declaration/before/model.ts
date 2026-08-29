import type { FormState } from "../form/model";
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
  isAutoApprovedSubmission?: boolean;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  linkedEventId?: string;
  initialRecordType?: "action";
  onReturnToChoice: () => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
  signInHref?: string;
  signUpHref?: string;
};

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
    wasteKg: "0",
    cigaretteButts: "0",
    cigaretteButtsCount: "",
    cigaretteButtsCondition: "propre",
    wasteMegotsKg: "0",
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
  next.locationLabel = next.departureLocationLabel.trim() || next.actionTitle;
  next.departureLocationLabel = next.departureLocationLabel.trim();
  next.accessibility = next.accessibility.trim();
  next.safetyInstructions = next.safetyInstructions.trim();
  next.recommendedMaterials = next.recommendedMaterials.trim();
  next.groupJoinEnabled = Boolean(next.groupJoinEnabled);
  next.participantAccounts = normalizeParticipantAccounts(next.participantAccounts);
  next.volunteersCount = next.volunteersCount.trim() || "1";
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
