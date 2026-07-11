"use client";

import { type FormEvent, type ReactNode, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Clock3,
  Loader2,
  Info,
  PencilLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createAction } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import {
  ASSOCIATION_SELECTION_OPTIONS,
  ENTREPRISE_ASSOCIATION_OPTION,
  extractEntrepriseName,
  normalizeAssociationSelectionForPrefill,
} from "@/lib/actions/association-options";
import {
  createInitialFormState,
  buildCreateActionPayload,
  normalizeParticipantAccounts,
} from "./action-declaration/payload";
import { saveDraft, loadDraftSnapshot } from "./action-declaration/draft-storage";
import type { FormState } from "./action-declaration-form.model";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { ActionParticipantPicker } from "./action-participant-picker";

type ActionBeforeDeclarationFormProps = {
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
  initialRecordType?: "action" | "clean_place";
  onReturnToChoice: () => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
};

type SelectOption = {
  value: string;
  label: string;
};

const PLANNED_OBJECTIVE_OPTIONS: SelectOption[] = [
  { value: "repérage", label: "Repérage" },
  { value: "nettoyage", label: "Nettoyage" },
  { value: "collecte_mégots", label: "Collecte mégots" },
  { value: "action_mixte", label: "Action mixte" },
  { value: "sensibilisation", label: "Sensibilisation" },
  { value: "autre", label: "Autre" },
];

const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: "facile", label: "Facile" },
  { value: "moderee", label: "Modérée" },
  { value: "soutenue", label: "Soutenue" },
];

const CREATOR_ROLE_OPTIONS: SelectOption[] = [
  { value: "organisateur", label: "Organisateur" },
  { value: "benevole", label: "Bénévole" },
  { value: "association", label: "Association" },
  { value: "etudiant", label: "Étudiant" },
  { value: "autre", label: "Autre" },
];

const PREPARATION_STATE_OPTIONS: SelectOption[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "pret_a_partager", label: "Prêt à partager" },
  { value: "action_en_cours", label: "Action en cours" },
  { value: "a_completer_apres_action", label: "À compléter après action" },
];

function SectionLabel({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-[#ECF8EF] px-3 py-1.5 shadow-sm">
          <Icon size={14} className="text-emerald-700" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-950/75">
            Pré-action
          </span>
        </div>
        <span className="h-px flex-1 bg-gradient-to-r from-emerald-200/80 to-transparent" />
      </div>
      <div>
        <h3 className="text-lg font-black tracking-tight text-emerald-950">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900/68">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldShell({
  label,
  children,
  hint,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-emerald-950">
      <span className="flex items-center gap-2">{label}</span>
      {children}
      {hint ? <span className="block text-xs font-normal leading-5 text-emerald-900/58">{hint}</span> : null}
    </label>
  );
}

function SelectShell({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function GroupJoinPublishCard({
  checked,
  onChange,
  showHelp,
  onToggleHelp,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  showHelp: boolean;
  onToggleHelp: () => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-emerald-950">Publier en tant que formulaire de groupe</p>
            <button
              type="button"
              onClick={onToggleHelp}
              aria-label={showHelp ? "Masquer l'aide" : "Afficher l'aide"}
              aria-expanded={showHelp}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50"
            >
              <Info size={12} />
            </button>
          </div>
          <p className="text-xs leading-5 text-emerald-900/66">
            Les autres membres pourront voir l&apos;action et envoyer une demande pour la rejoindre.
          </p>
        </div>
      </label>
      {showHelp ? (
        <p className="mt-3 rounded-2xl border border-emerald-200/70 bg-white/90 px-3 py-2 text-xs leading-5 text-emerald-900/72">
          Cette option ne publie pas les champs de récolte finale. Elle rend seulement le pré-formulaire visible dans
          la page Formulaire de groupe.
        </p>
      ) : null}
    </div>
  );
}

function sanitizePreActionForm(form: FormState): FormState {
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
  next.plannedObjective = next.plannedObjective;
  next.estimatedDifficulty = next.estimatedDifficulty;
  next.accessibility = next.accessibility.trim();
  next.safetyInstructions = next.safetyInstructions.trim();
  next.recommendedMaterials = next.recommendedMaterials.trim();
  next.creatorRole = next.creatorRole;
  next.preparationState = next.preparationState;
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
  next.placeType = next.placeType;
  next.durationMinutes = next.durationMinutes.trim();

  if (next.associationName !== ENTREPRISE_ASSOCIATION_OPTION) {
    next.enterpriseName = "";
  }

  return next;
}

function buildPrefillForm(
  actorNameOptions: string[],
  defaultActorName: string,
  initialRecordType: "action" | "clean_place",
): FormState {
  const fallback = createInitialFormState(
    actorNameOptions.includes(defaultActorName)
      ? defaultActorName
      : actorNameOptions[0] ?? defaultActorName,
    initialRecordType,
  );

  const snapshot = loadDraftSnapshot(fallback, initialRecordType);
  return sanitizePreActionForm(snapshot?.form ?? fallback);
}

function labelForPreparationState(value: FormState["preparationState"]): string {
  return (
    PREPARATION_STATE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function ActionBeforeDeclarationForm({
  actorNameOptions,
  defaultActorName,
  isAuthenticated,
  isAutoApprovedSubmission = false,
  userMetadata,
  linkedEventId,
  initialRecordType = "action",
  onReturnToChoice,
  onPassToComplete,
}: ActionBeforeDeclarationFormProps) {
  const resolvedDefaultActorName = actorNameOptions.includes(defaultActorName)
    ? defaultActorName
    : (actorNameOptions[0] ?? userMetadata.userId);
  const [form, setForm] = useState<FormState>(() =>
    buildPrefillForm(actorNameOptions, resolvedDefaultActorName, initialRecordType),
  );
  const [submissionState, setSubmissionState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showGroupJoinHelp, setShowGroupJoinHelp] = useState(false);
  const hasTrackedStartRef = useRef(false);

  const actClasses = getBlockClasses("act");
  const shareLink = createdId
    ? `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(createdId)}`
    : null;
  const summaryNote = useMemo(() => {
    const chunks = [
      form.actionTitle.trim(),
      form.actionDate.trim(),
      form.departureLocationLabel.trim(),
      form.plannedObjective.trim(),
    ].filter((value) => value.length > 0);
    return chunks.length > 0 ? chunks.join(" · ") : null;
  }, [
    form.actionDate,
    form.actionTitle,
    form.departureLocationLabel,
    form.plannedObjective,
  ]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackFunnel("start_form", "quick", {
        source: "action_before_declaration_form",
        recordType: form.recordType,
        routePath: typeof window !== "undefined" ? window.location.pathname : null,
        formVariant: "quick",
        linkedEventId: linkedEventId ?? null,
      }).catch(() => undefined);
    }

    const nextForm = sanitizePreActionForm({ ...form, [key]: value } as FormState);
    if (key === "routeStyle") {
      nextForm.routeStyle = "souple";
    }
    if (key === "associationName" && value !== ENTREPRISE_ASSOCIATION_OPTION) {
      nextForm.enterpriseName = "";
    }

    setForm(nextForm);
    saveDraft(nextForm);
    if (submissionState === "error") {
      setSubmissionState("idle");
      setErrorMessage(null);
      setValidationIssues([]);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submissionState === "pending") {
      return;
    }

    const issues: string[] = [];
    if (!form.actionTitle.trim()) {
      issues.push("Indiquez un titre pour publier le pré-formulaire.");
    }
    if (!form.actionDate.trim()) {
      issues.push("Indiquez la date prévue avant de publier le pré-formulaire.");
    }
    if (!form.associationName.trim()) {
      issues.push("Sélectionnez une structure ou un cadre d'engagement.");
    }
    if (!form.departureLocationLabel.trim()) {
      issues.push("Indiquez le point de rendez-vous avant de publier.");
    }

    if (issues.length > 0) {
      setValidationIssues(issues);
      setErrorMessage(issues[0] ?? "Complétez les informations connues avant de continuer.");
      setSubmissionState("error");
      return;
    }

    const normalizedForm = sanitizePreActionForm(form);
    const payload = buildCreateActionPayload({
      form: normalizedForm,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: normalizedForm.associationName === ENTREPRISE_ASSOCIATION_OPTION,
      linkedEventId,
      photos: [] as ActionPhotoAsset[],
      visionEstimate: null as ActionVisionEstimate | null,
      userMetadata,
    });

    setSubmissionState("pending");
    setErrorMessage(null);
    setValidationIssues([]);

    try {
      const result = await createAction(payload);
      setCreatedId(result.id);
      setSubmissionState("success");
      saveDraft(normalizedForm);
      await trackFunnel("submit_success", "quick", {
        source: "action_before_declaration_form",
        createdId: result.id,
        isAuthenticated,
        isAdminLikeSubmission: isAutoApprovedSubmission,
      });
    } catch (error: unknown) {
      setSubmissionState("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de publier le pré-formulaire pour le moment.",
      );
    }
  }

  const onContinueComplete = () => {
    if (!createdId) {
      return;
    }
    saveDraft(sanitizePreActionForm(form));
    void onPassToComplete(createdId);
  };

  if (submissionState === "success") {
    const isGroupFormPublished = form.groupJoinEnabled;
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/96">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmPill tone="emerald" size="sm">
                    {isGroupFormPublished ? "Publié" : "Enregistré"}
                  </CmmPill>
                  <span className="text-sm font-semibold text-emerald-950">
                    {isGroupFormPublished ? "Pré-formulaire publié" : "Pré-formulaire enregistré"}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                  Le formulaire avant action est prêt
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-emerald-900/68">
                  {isGroupFormPublished
                    ? "Les bénévoles peuvent déjà consulter ce pré-formulaire, rejoindre l'action et compléter les informations utiles avant le départ terrain."
                    : "Le pré-formulaire est enregistré avec les informations utiles avant le terrain. Vous pourrez le publier ensuite si vous souhaitez ouvrir le formulaire de groupe."}
                </p>
                {summaryNote ? (
                  <div className="rounded-[1.4rem] border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950">
                    {summaryNote}
                  </div>
                ) : null}
                {shareLink && isGroupFormPublished ? (
                  <p className="text-xs text-emerald-900/60">
                    Lien de partage du formulaire de groupe: <span className="font-mono">{shareLink}</span>
                  </p>
                ) : null}
                {createdId ? (
                  <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <CmmButton tone="primary" variant="pill" size="md" onClick={onContinueComplete}>
                  Passer au formulaire complet
                  <ArrowRight size={14} />
                </CmmButton>
                {shareLink && isGroupFormPublished ? (
                  <CmmButton
                    tone="secondary"
                    variant="pill"
                    size="md"
                    href={shareLink}
                  >
                    Ouvrir le formulaire de groupe
                  </CmmButton>
                ) : null}
                <CmmButton tone="tertiary" variant="pill" size="md" onClick={onReturnToChoice}>
                  <ArrowLeft size={14} />
                  Retour au choix
                </CmmButton>
              </div>
            </div>
          </CmmCard>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <CmmPill tone="emerald" size="sm" className="tracking-[0.18em]">
                Déclarer avant l&apos;action
              </CmmPill>
              <h1 className="text-[clamp(2rem,4vw,3.15rem)] font-black tracking-tighter text-emerald-950">
                Préparer le formulaire de groupe
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-emerald-900/72 md:text-[0.98rem]">
                Renseignez uniquement les informations utiles avant le terrain. Les champs de récolte,
                de bilan final et de validation restent réservés au formulaire complet.
              </p>
            </div>
            <div className="max-w-sm rounded-[1.5rem] border border-emerald-200/80 bg-[#F3FBF6] px-4 py-3 text-sm leading-6 text-emerald-900/76 shadow-sm">
              <p className="font-bold text-emerald-950">Statut du formulaire</p>
              <p className="mt-1 text-emerald-950">Pré-action — les données de collecte seront ajoutées après le terrain.</p>
              <p className="mt-1">{labelForPreparationState(form.preparationState)}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-900/60">
                Le lien de partage du formulaire de groupe sera créé après publication.
              </p>
            </div>
          </div>
        </CmmCard>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-6"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-6">
                <SectionLabel
                  icon={ClipboardList}
                  title="Identité et partage"
                  subtitle="Qui porte le formulaire, dans quel cadre, et si le groupe peut rejoindre l'action."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Référent ou créateur">
                    <select
                      value={form.actorName}
                      onChange={(event) => updateField("actorName", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    >
                      {actorNameOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="Structure ou cadre">
                    <select
                      value={form.associationName}
                      onChange={(event) => updateField("associationName", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    >
                      {ASSOCIATION_SELECTION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  {form.associationName === ENTREPRISE_ASSOCIATION_OPTION ? (
                    <FieldShell label="Nom de l'entreprise" hint="Utilisé pour nommer le cadre d'engagement.">
                      <input
                        type="text"
                        value={form.enterpriseName}
                        onChange={(event) => {
                          const enterpriseName = event.target.value;
                          updateField("enterpriseName", enterpriseName);
                        }}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Veolia"
                        maxLength={100}
                      />
                    </FieldShell>
                  ) : null}

                  <SelectShell
                    label="Rôle du créateur"
                    value={form.creatorRole}
                    onChange={(value) => updateField("creatorRole", value as FormState["creatorRole"])}
                    options={CREATOR_ROLE_OPTIONS}
                  />

                  <SelectShell
                    label="Statut du formulaire"
                    value={form.preparationState}
                    onChange={(value) =>
                      updateField("preparationState", value as FormState["preparationState"])
                    }
                    options={PREPARATION_STATE_OPTIONS}
                  />
                </div>

                <ActionParticipantPicker
                  currentUserId={userMetadata.userId}
                  value={form.participantAccounts}
                  onChange={(next) => updateField("participantAccounts", next)}
                  description="Ajoutez des membres connus avant de publier le pré-formulaire ou de passer au formulaire complet."
                />

                <GroupJoinPublishCard
                  checked={form.groupJoinEnabled}
                  onChange={(next) => updateField("groupJoinEnabled", next)}
                  showHelp={showGroupJoinHelp}
                  onToggleHelp={() => setShowGroupJoinHelp((current) => !current)}
                />
              </div>
            </CmmCard>

            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-4">
                <SectionLabel
                  icon={Sparkles}
                  title="Action prévue"
                  subtitle="Le contenu nécessaire avant le terrain, sans les champs de récolte réelle."
                />

                <div className="space-y-4">
                  <FieldShell label="Titre de l'action" hint="Nom affiché dans le formulaire de groupe.">
                    <input
                      type="text"
                      value={form.actionTitle}
                      onChange={(event) => updateField("actionTitle", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Nettoyage des berges de la Seine"
                    />
                  </FieldShell>

                  <FieldShell label="Description courte" hint="Quelques lignes pour expliquer le contexte.">
                    <textarea
                      value={form.shortDescription}
                      onChange={(event) => updateField("shortDescription", event.target.value)}
                      className="min-h-[118px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Préparation d'une action de collecte et repérage du site..."
                    />
                  </FieldShell>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Commune ou zone concernée" hint="Ville, quartier ou secteur principal.">
                      <input
                        type="text"
                        value={form.communeZoneLabel}
                        onChange={(event) => updateField("communeZoneLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Paris 15e, berges nord"
                      />
                    </FieldShell>

                  <FieldShell
                      label="Point de rendez-vous précis"
                      hint="Adresse, entrée ou repère exact avant le départ."
                    >
                      <input
                        type="text"
                        value={form.departureLocationLabel}
                        onChange={(event) => updateField("departureLocationLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Entrée principale, côté métro"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell
                      label="Zone cible prévue"
                      hint="Périmètre visé en quelques mots."
                    >
                      <input
                        type="text"
                        value={form.arrivalLocationLabel}
                        onChange={(event) => updateField("arrivalLocationLabel", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Parc rive gauche, quais nord"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Nombre de bénévoles attendus"
                      hint="Estimation avant départ, pas le nombre final."
                    >
                      <input
                        type="number"
                        min="0"
                        value={form.volunteersCount}
                        onChange={(event) => updateField("volunteersCount", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="8"
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell
                      label="Localisation du rendez-vous"
                      hint="Facultatif si l'adresse suffit."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="number"
                          step="any"
                          value={form.latitude}
                          onChange={(event) => updateField("latitude", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="Latitude"
                        />
                        <input
                          type="number"
                          step="any"
                          value={form.longitude}
                          onChange={(event) => updateField("longitude", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="Longitude"
                        />
                      </div>
                    </FieldShell>

                    <FieldShell
                      label="Message pour les participants"
                      hint="Visible par les personnes qui rejoignent le formulaire de groupe."
                    >
                      <textarea
                        value={form.participantMessage}
                        onChange={(event) => updateField("participantMessage", event.target.value)}
                        className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="Ex. Merci d'arriver 10 minutes avant, prévoir des chaussures fermées."
                      />
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FieldShell label="Date prévue">
                      <input
                        type="date"
                        value={form.actionDate}
                        onChange={(event) => updateField("actionDate", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Heure de rendez-vous">
                      <input
                        type="time"
                        value={form.meetingTime}
                        onChange={(event) => updateField("meetingTime", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Heure de départ prévue">
                      <input
                        type="time"
                        value={form.departureTime}
                        onChange={(event) => updateField("departureTime", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </FieldShell>

                    <FieldShell label="Durée estimée" hint="Estimation avant départ.">
                      <div className="relative">
                        <Clock3 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/45" />
                        <input
                          type="number"
                          min="0"
                          value={form.durationMinutes}
                          onChange={(event) => updateField("durationMinutes", event.target.value)}
                          className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] py-3 pl-10 pr-4 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                          placeholder="60"
                        />
                      </div>
                    </FieldShell>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectShell
                      label="Type d'action prévue"
                      value={form.plannedObjective}
                      onChange={(value) => updateField("plannedObjective", value as FormState["plannedObjective"])}
                      options={PLANNED_OBJECTIVE_OPTIONS}
                    />

                    <SelectShell
                      label="Type de zone"
                      value={form.placeType}
                      onChange={(value) => updateField("placeType", value)}
                      options={PLACE_TYPE_FORM_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    />

                    <SelectShell
                      label="Niveau de difficulté estimé"
                      value={form.estimatedDifficulty}
                      onChange={(value) =>
                        updateField("estimatedDifficulty", value as FormState["estimatedDifficulty"])
                      }
                      options={DIFFICULTY_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            </CmmCard>
          </div>

          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
            <div className="space-y-4">
              <SectionLabel
                icon={PencilLine}
                title="Préparation et sécurité"
                subtitle="Consignes, matériel et accessibilité avant publication."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <FieldShell label="Accessibilité">
                  <textarea
                    value={form.accessibility}
                    onChange={(event) => updateField("accessibility", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Accessible PMR partiellement, escalier à éviter..."
                  />
                </FieldShell>

                <FieldShell label="Consignes de sécurité">
                  <textarea
                    value={form.safetyInstructions}
                    onChange={(event) => updateField("safetyInstructions", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Ne pas traverser la voie ferrée, rester en groupe, gilets visibles..."
                  />
                </FieldShell>
              </div>

                <FieldShell label="Matériel conseillé">
                  <textarea
                    value={form.recommendedMaterials}
                    onChange={(event) => updateField("recommendedMaterials", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Gants, sacs, pinces, chasubles, eau..."
                  />
                </FieldShell>

                <FieldShell label="Commentaire logistique">
                  <textarea
                    value={form.logisticsNotes}
                    onChange={(event) => updateField("logisticsNotes", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Accès, transport, météo à surveiller, lieu de repli, risques connus..."
                  />
                </FieldShell>

                <FieldShell label="Checklist avant départ">
                  <textarea
                    value={form.checklistBeforeDeparture}
                    onChange={(event) => updateField("checklistBeforeDeparture", event.target.value)}
                    className="min-h-[132px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Matériel prêt, groupe informé, point de rendez-vous confirmé, sécurité rappelée."
                  />
                </FieldShell>

                <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3 text-sm leading-6 text-emerald-950">
                  <span className="font-bold">Bon à savoir.</span> Ce pré-formulaire ne comprend pas de
                tracé GPS, de récolte réelle, de photos de collecte, de bilan final ni de score d&apos;impact.
              </div>
            </div>
          </CmmCard>

          {validationIssues.length > 0 || errorMessage ? (
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-[#FFF7F8] px-4 py-3 text-sm leading-6 text-rose-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={16} className="text-rose-500" />
                Le pré-formulaire n&apos;a pas encore pu être publié
              </div>
              {validationIssues.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800/80">
                  {validationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
              {errorMessage ? <p className="mt-2 text-xs text-rose-800/80">{errorMessage}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200/70 bg-white/90 px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-950">Pré-formulaire avant action</p>
              <p className="text-xs leading-5 text-emerald-900/66">
                La publication crée un pré-formulaire visible dans la page Formulaire de groupe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CmmButton tone="secondary" variant="pill" size="md" onClick={onReturnToChoice} type="button">
                <ArrowLeft size={14} />
                Retour au choix
              </CmmButton>
              <CmmButton tone="primary" variant="pill" size="md" type="submit" disabled={submissionState === "pending"}>
                {submissionState === "pending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Publication...
                  </>
                ) : (
                  <>
                    Publier le pré-formulaire
                    <ArrowRight size={14} />
                  </>
                )}
              </CmmButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
