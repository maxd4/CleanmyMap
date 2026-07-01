"use client";

import { type FormEvent, type ReactNode, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Clock3,
  Loader2,
  PencilLine,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createAction } from "@/lib/actions/http";
import { trackFunnel } from "@/lib/analytics/funnel-client";
import { PLACE_TYPE_FORM_OPTIONS } from "@/lib/actions/place-type-options";
import { createInitialFormState, buildCreateActionPayload } from "./action-declaration/payload";
import { saveDraft, loadDraftSnapshot } from "./action-declaration/draft-storage";
import { ActionDeclarationIdentityFields } from "./action-declaration-form.identity-fields";
import type { FormState } from "./action-declaration-form.model";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";

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
  onPassToComplete: () => void;
};

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
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-emerald-950">
      <span className="flex items-center gap-2">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs font-normal leading-5 text-emerald-900/58">{hint}</span> : null}
    </label>
  );
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
  return snapshot?.form ?? fallback;
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
  const hasTrackedStartRef = useRef(false);

  const actClasses = getBlockClasses("act");
  const isEntrepriseMode = form.associationName === "Entreprise";
  const summaryNote = useMemo(() => {
    const chunks = [
      form.locationLabel.trim(),
      form.departureLocationLabel.trim(),
      form.routeAdjustmentMessage.trim(),
      form.notes.trim(),
    ].filter((value) => value.length > 0);
    return chunks.length > 0 ? chunks.join(" · ") : null;
  }, [form.departureLocationLabel, form.locationLabel, form.notes, form.routeAdjustmentMessage]);

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

    const nextForm = { ...form, [key]: value };
    if (key === "routeStyle") {
      nextForm.routeStyle = "souple";
    }
    if (key === "associationName" && value === "Action spontanée") {
      nextForm.organizerAccounts = "";
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
    if (!form.actionDate.trim()) {
      issues.push("Indiquez la date prévue avant de publier le pré-formulaire.");
    }
    if (!form.associationName.trim()) {
      issues.push("Sélectionnez une structure ou un cadre d'engagement.");
    }
    if (!form.locationLabel.trim()) {
      issues.push("Renseignez le lieu prévu pour l'action.");
    }

    if (issues.length > 0) {
      setValidationIssues(issues);
      setErrorMessage(issues[0] ?? "Complétez les informations connues avant de continuer.");
      setSubmissionState("error");
      return;
    }

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "quick",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode,
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
      saveDraft(form);
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
    if (form) {
      saveDraft(form);
    }
    onPassToComplete();
  };

  if (submissionState === "success") {
    return (
      <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/96">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CmmPill tone="emerald" size="sm">
                    Succès
                  </CmmPill>
                  <span className="text-sm font-semibold text-emerald-950">Pré-formulaire publié</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                  Le formulaire avant action est prêt
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-emerald-900/68">
                  Les bénévoles peuvent déjà consulter ce pré-formulaire, rejoindre l'action et compléter
                  les informations utiles avant le départ terrain.
                </p>
                {summaryNote ? (
                  <div className="rounded-[1.4rem] border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm text-emerald-950">
                    {summaryNote}
                  </div>
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
                <CmmButton tone="secondary" variant="pill" size="md" href="/sections/rejoindre-un-formulaire">
                  Voir la page groupe
                </CmmButton>
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
                Préparer un formulaire de groupe
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-emerald-900/72 md:text-[0.98rem]">
                Renseignez uniquement ce qui est déjà connu avant le départ terrain. Le pré-formulaire reste
                visible dans la page Formulaire de groupe et pourra ensuite être complété dans le parcours
                complet sans casser le formulaire actuel.
              </p>
            </div>
            <div className="max-w-sm rounded-[1.5rem] border border-emerald-200/80 bg-[#F3FBF6] px-4 py-3 text-sm leading-6 text-emerald-900/76 shadow-sm">
              <p className="font-bold text-emerald-950">Préparation légère</p>
              <p className="mt-1">
                Aucun décompte final n&apos;est validé ici. Ce formulaire sert seulement à préparer la mise en
                groupe avant le terrain.
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-6">
                <SectionLabel
                  icon={ClipboardList}
                  title="Identité et cadre"
                  subtitle="Qui prépare le formulaire, dans quel cadre, et à quelle date l'action est prévue."
                />
                <ActionDeclarationIdentityFields
                  resolvedActorOptions={actorNameOptions}
                  recordType={form.recordType}
                  actorName={form.actorName}
                  associationName={form.associationName}
                  enterpriseName={form.enterpriseName}
                  organizerAccounts={form.organizerAccounts}
                  onActorNameChange={(value) => updateField("actorName", value)}
                  onAssociationNameChange={(value) => updateField("associationName", value)}
                  onEnterpriseNameChange={(value) => updateField("enterpriseName", value)}
                  onOrganizerAccountsChange={(value) => updateField("organizerAccounts", value)}
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-[1.4rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.groupJoinEnabled}
                    onChange={(event) => updateField("groupJoinEnabled", event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-950">Ouvrir le formulaire de groupe</p>
                    <p className="text-xs leading-5 text-emerald-900/66">
                      Les bénévoles pourront rejoindre ce pré-formulaire avant ou pendant l&apos;action.
                    </p>
                  </div>
                </label>
              </div>
            </CmmCard>

            <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
              <div className="space-y-4">
                <SectionLabel
                  icon={Sparkles}
                  title="Informations connues"
                  subtitle="Lieu prévu, rendez-vous, type d&apos;action, durée estimée et effectif prévu si vous les avez déjà."
                />

                <div className="space-y-4">
                  <FieldShell
                    label="Lieu prévu"
                    hint="Adresse, lieu de rendez-vous ou repère principal de l'action."
                  >
                    <input
                      type="text"
                      value={form.locationLabel}
                      onChange={(event) => updateField("locationLabel", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Parc des Buttes-Chaumont"
                    />
                  </FieldShell>

                  <FieldShell
                    label="Point de rendez-vous"
                    hint="Lieu de départ ou repère pour la coordination."
                  >
                    <input
                      type="text"
                      value={form.departureLocationLabel}
                      onChange={(event) => updateField("departureLocationLabel", event.target.value)}
                      className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      placeholder="Ex. Entrée principale, côté métro"
                    />
                  </FieldShell>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Type de lieu">
                      <select
                        value={form.placeType}
                        onChange={(event) => updateField("placeType", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                      >
                        {PLACE_TYPE_FORM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>

                    <FieldShell label="Durée estimée">
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

                  <FieldShell label="Effectif prévu">
                    <div className="relative">
                      <Users size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/45" />
                      <input
                        type="number"
                        min="1"
                        value={form.volunteersCount}
                        onChange={(event) => updateField("volunteersCount", event.target.value)}
                        className="w-full rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] py-3 pl-10 pr-4 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                        placeholder="12"
                      />
                    </div>
                  </FieldShell>
                </div>
              </div>
            </CmmCard>
          </div>

          <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/95">
            <div className="space-y-4">
              <SectionLabel
                icon={PencilLine}
                title="Objectif, consignes et contexte"
                subtitle="Décrivez ce que les bénévoles doivent savoir avant de partir: objectif, accès, précautions et informations de coordination."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <FieldShell label="Objectif / contexte">
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className="min-h-[144px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Nettoyage préparatoire avant l'arrivée du public, mise en sécurité du site, coordination avec la mairie..."
                  />
                </FieldShell>

                <FieldShell
                  label="Consignes, accès et précautions"
                  hint="Rendez-vous, accès terrain, équipement conseillé, points de vigilance."
                >
                  <textarea
                    value={form.routeAdjustmentMessage}
                    onChange={(event) => updateField("routeAdjustmentMessage", event.target.value)}
                    className="min-h-[144px] w-full rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 text-sm font-medium text-emerald-950 outline-none transition focus:border-emerald-400 focus:bg-white"
                    placeholder="Ex. Gants recommandés, accès par la porte nord, point de collecte près du kiosque..."
                  />
                </FieldShell>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3 text-sm leading-6 text-emerald-950">
                <span className="font-bold">Bon à savoir.</span> Ce pré-formulaire reste léger. Les données de
                collecte complètes seront ajoutées ensuite via le formulaire complet.
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
                Le bouton de publication crée un pré-formulaire visible dans la page Formulaire de groupe.
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
