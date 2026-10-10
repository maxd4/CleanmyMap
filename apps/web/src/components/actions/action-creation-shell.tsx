"use client";

import { startTransition, useCallback, useEffect, useState, type ComponentProps, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardList, CloudSun, FileWarning, Map, Navigation, Users } from "lucide-react";
import { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import { ActionDeclarationForm } from "./action-declaration/form";
import { ActionDayView } from "./action-day-view";
import { ActionCreationLegalPanel } from "./action-creation-legal-panel";
import { RouteSection } from "@/components/sections/rubriques/route";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import { INACTIVE_LOCAL_DEV_AUTH, type LocalDevAuthState } from "@/lib/auth/effective-auth-contract";
import { cn } from "@/lib/utils";
import { buildActionCreationSectionHref, buildActionCreationSpaceHref, buildActionCreationTabHref, buildActionWorkflowStepHref, type ActionCreationPanelId, type ActionCreationSectionId, type ActionCreationSpace, type ActionCreationSubsectionId, type ActionCreationTab } from "@/lib/actions/action-creation-routes";
import { ACTION_CREATION_SECTIONS, ACTION_CREATION_SECTION_LABELS, ACTION_CREATION_SECTION_STATUS_LABELS, createActionCreationSectionState, loadActionCreationSectionState, saveActionCreationSectionState, setActionCreationSectionStatus, type ActionCreationSectionState } from "@/lib/actions/action-creation-sections";
import { ACTION_WORKFLOW_STEPS, ACTION_WORKFLOW_STEP_LABELS, ACTION_WORKFLOW_STATUS_LABELS, createActionWorkflowState, loadActionWorkflowState, markActionWorkflowStep, saveActionWorkflowState, setActionWorkflowStepStatus, type ActionWorkflowState, type ActionWorkflowStepId } from "@/lib/actions/action-workflow";
import { updateAction } from "@/lib/actions/http";
import type { FormState } from "./action-declaration/model";
import {
  resolvePreparationSelection,
  type ActionPreparationPersistenceStatus,
  type ActionPreparationContext,
  type PreparationSelection,
} from "@/lib/actions/action-preparation-context";
import { useActionPreparationContext } from "./action-preparation-context-hook";
import { useActionCreationPreparationSync } from "./use-action-creation-preparation-sync";
import { JoinActionTabs } from "@/components/sections/rubriques/rejoindre-une-action.tabs";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { isRouteInterventionMode } from "@/lib/actions/intervention-mode";

type ActionCreationShellProps = Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted"> & {
  initialPanel: ActionCreationPanelId;
  initialSection?: ActionCreationSectionId;
  initialSubsection?: ActionCreationSubsectionId;
  initialTab?: ActionCreationTab;
  initialSpace?: ActionCreationSpace;
  tabSearchParams?: Record<string, string | string[] | undefined>;
  localDevAuth?: LocalDevAuthState;
  sectionsEnabled?: boolean;
};

const PANEL_TO_STEP: Record<ActionCreationPanelId, ActionWorkflowStepId> = {
  itineraire: "itineraire",
  meteo: "preparation",
  formalites: "paris",
  "pre-formulaire": "preformulaire",
};

type ActionCreationSectionFormProps = Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted">;

function ActionLifecycleNavigation({
  actionId,
  activeSpace,
  searchParams,
  fr,
}: {
  actionId: string | null;
  activeSpace: ActionCreationSpace;
  searchParams?: Record<string, string | string[] | undefined>;
  fr: boolean;
}) {
  if (!actionId) {
    return <JoinActionTabs activeTab="before" ariaLabel={fr ? "Onglets du parcours d’action" : "Action flow tabs"} idPrefix="action-creation-tab" tabs={[{ id: "before", label: fr ? "Organiser" : "Organize", panelId: "action-creation-tabpanel-before" }, { id: "after", label: fr ? "Déclarer une action réalisée" : "Report a completed action", panelId: "action-creation-tabpanel-after" }]} buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, searchParams)} />;
  }

  return <JoinActionTabs activeTab={activeSpace} ariaLabel={fr ? "Espaces de l’action" : "Action spaces"} idPrefix="action-creation-space" tabs={[{ id: "prepare", label: fr ? "Préparer" : "Prepare", panelId: "action-creation-panel-prepare" }, { id: "day", label: fr ? "Jour J" : "Action day", panelId: "action-creation-panel-day" }, { id: "bilan", label: fr ? "Bilan" : "Review", panelId: "action-creation-panel-bilan" }]} buildHref={(space) => buildActionCreationSpaceHref(space as ActionCreationSpace, { ...(searchParams ?? {}), actionId })} />;
}

function ActionCreationSectionNavigation({
  state,
  fr,
  onSelect,
}: {
  state: ActionCreationSectionState;
  fr: boolean;
  onSelect: (section: ActionCreationSectionId) => void;
}) {
  return (
    <nav aria-label={fr ? "Sections de l’action" : "Action sections"} data-testid="action-creation-section-nav">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {ACTION_CREATION_SECTIONS.map((section, index) => {
          const labels = ACTION_CREATION_SECTION_LABELS[section];
          const status = state.statuses[section];
          const statusLabel = ACTION_CREATION_SECTION_STATUS_LABELS[status][fr ? "fr" : "en"];
          const active = state.activeSection === section;
          return (
            <li key={section}>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                aria-describedby={`action-creation-section-description-${section}`}
                onClick={() => onSelect(section)}
                className={cn("flex min-h-16 w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", active ? "border-emerald-500 bg-emerald-50" : "border-emerald-100 bg-white/85 hover:border-emerald-300 hover:bg-emerald-50/60")}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black", status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 text-emerald-800")}>{status === "done" ? <Check size={15} aria-hidden="true" /> : index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-emerald-950">{labels[fr ? "fr" : "en"]}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-emerald-900/70">{statusLabel}</span>
                  <span id={`action-creation-section-description-${section}`} className="mt-1 block text-xs leading-5 text-emerald-900/60">{labels.description[fr ? "fr" : "en"]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ActionCreationContextPreview({
  fr,
  actionId,
  form,
  activeSection,
}: {
  fr: boolean;
  actionId: string | null;
  form: Partial<FormState>;
  activeSection: ActionCreationSectionId;
}) {
  const valueOrFallback = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  return (
    <aside className="space-y-4" aria-label={fr ? "Aperçu contextuel de l’action" : "Action context preview"} data-testid="action-creation-context-preview">
      <CmmCard tone="emerald" variant="outlined" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{fr ? "Aperçu" : "Preview"}</p><h2 className="mt-1 text-lg font-black text-emerald-950">{valueOrFallback(form.actionTitle, fr ? "Votre action" : "Your action")}</h2></div><Map size={20} className="text-emerald-600" aria-hidden="true" /></div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Objectif" : "Objective"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.shortDescription, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Lieu" : "Place"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.departureLocationLabel || form.locationLabel, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Date" : "Date"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.actionDate, fr ? "À préciser" : "To specify")}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{fr ? "Organisateur" : "Organizer"}</dt><dd className="mt-1 text-emerald-950">{valueOrFallback(form.organizerName, fr ? "À préciser" : "To specify")}</dd></div>
          </dl>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900/75"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><span>{fr ? `Section active : ${ACTION_CREATION_SECTION_LABELS[activeSection].fr}. Les modifications restent sur la même action.` : `Active section: ${ACTION_CREATION_SECTION_LABELS[activeSection].en}. Changes stay on the same action.`}</span></div>
          {actionId ? <p className="text-xs font-mono text-emerald-900/55">{fr ? "Référence" : "Reference"}: {actionId}</p> : null}
        </div>
      </CmmCard>
      <CmmCard tone="emerald" variant="muted" size="sm">
        <div className="flex items-start gap-2 text-sm text-emerald-900/75"><Users size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><p>{fr ? "Vous pouvez changer de section à tout moment. Une section incomplète reste à compléter." : "You can change sections at any time. An incomplete section remains to be completed."}</p></div>
      </CmmCard>
    </aside>
  );
}

function ActionCreationSectionContent({
  activeSection,
  currentActionId,
  initialSubsection,
  draftContext,
  preparationContext,
  formalitiesReadiness,
  formProps,
  formSnapshot,
  initialPanel,
  localDevAuth,
  onActionPersisted,
  onFormChange,
  onFormalitiesReadiness,
  onPassToComplete,
  onPreparationValidated,
  onPreparationSelection,
  onPreparationContextChange,
  preparationPersistenceStatus,
}: {
  activeSection: ActionCreationSectionId;
  currentActionId: string | null;
  initialSubsection?: ActionCreationSubsectionId;
  draftContext: { locationLabel?: string; actionDate?: string; departureTime?: string; contextReady?: boolean };
  preparationContext: ActionPreparationContext;
  formalitiesReadiness: "unknown" | "ready" | "blocked";
  formProps: ActionCreationSectionFormProps;
  formSnapshot: Partial<FormState>;
  initialPanel: ActionCreationPanelId;
  localDevAuth: LocalDevAuthState;
  onActionPersisted: (actionId: string) => void;
  onFormChange: (form: FormState) => void;
  onFormalitiesReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
  onPreparationValidated: (validated: boolean) => void;
  onPreparationSelection: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationContextChange: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
  preparationPersistenceStatus: ActionPreparationPersistenceStatus;
}) {
  const form = (
    <ActionBeforeDeclarationForm
      {...formProps}
      initialActionId={currentActionId}
      activeSection={activeSection}
      preparationContext={preparationContext}
      guidedWorkflow
      guidedReadiness={formalitiesReadiness}
      onFormChange={onFormChange}
      onActionPersisted={onActionPersisted}
      onFormalitiesReadiness={onFormalitiesReadiness}
      onPassToComplete={onPassToComplete}
    />
  );

  return (
    <div className="space-y-4">
      {form}
      {activeSection === "terrain" ? (
        <div data-active-subsection={initialSubsection ?? "terrain"}>
          <div className="grid gap-4 xl:grid-cols-2">
            <CmmCard tone="emerald" variant="glass" size="lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Navigation size={18} className="text-emerald-700" aria-hidden="true" /><h3 className="text-lg font-black text-emerald-950">Carte et itinéraire</h3></div>
                <p className="cmm-text-body cmm-text-primary">L’itinéraire reste optionnel et réutilise le planificateur existant.</p>
                {(() => {
                  const selectedMode = formSnapshot.interventionMode?.mode
                    ?? (initialPanel === "itineraire" || initialSubsection === "route" ? "itinerary" : "fixed_area");
                  return isRouteInterventionMode(selectedMode) ? <EffectiveAuthStateProvider localDevAuth={localDevAuth}><RouteSection actionId={currentActionId} /></EffectiveAuthStateProvider> : <p data-testid="fixed-area-route-state" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">Mode zone fixe actif : la carte et le rendez-vous suffisent. Le planificateur d’itinéraire reste fermé.</p>;
                })()}
              </div>
            </CmmCard>
            <CmmCard tone="emerald" variant="glass" size="lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2"><CloudSun size={18} className="text-emerald-700" aria-hidden="true" /><h3 className="text-lg font-black text-emerald-950">Météo et créneau</h3></div>
                <p className="cmm-text-body cmm-text-primary">Les prévisions restent consultatives et ne modifient l’action qu’après un choix explicite.</p>
                <WeatherSection draftContext={draftContext} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} onPreparationSelection={onPreparationSelection} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />
              </div>
            </CmmCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionCreationSectionsView({
  state,
  fr,
  content,
  formSnapshot,
  currentActionId,
  activeSpace,
  transitionError,
  actionCreationSearchParams,
  onSelect,
  onNext,
  onPrevious,
}: {
  state: ActionCreationSectionState;
  fr: boolean;
  content: ReactNode;
  formSnapshot: Partial<FormState>;
  currentActionId: string | null;
  activeSpace: ActionCreationSpace;
  transitionError: string | null;
  actionCreationSearchParams?: Record<string, string | string[] | undefined>;
  onSelect: (section: ActionCreationSectionId) => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const activeSection = state.activeSection;
  const index = ACTION_CREATION_SECTIONS.indexOf(activeSection);
  return <div data-testid="action-creation-shell" data-workflow-section={activeSection} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="pointer-events-none absolute inset-0 exhaustive-only"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" /></div><div className="cmm-page-width relative space-y-5"><CmmCard tone="emerald" variant="glass" size="sm"><PageHeader tone="emerald" title={fr ? "Organiser une action" : "Organize an action"} subtitle={fr ? "Préparez la même action, section par section, puis vérifiez-la avant publication." : "Prepare the same action section by section, then review it before publishing."} className="!gap-2" /></CmmCard><ActionLifecycleNavigation actionId={currentActionId} activeSpace={activeSpace} fr={fr} searchParams={actionCreationSearchParams} /><ActionCreationSectionNavigation state={state} fr={fr} onSelect={onSelect} />{transitionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{transitionError}</p> : null}<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"><main aria-labelledby={`action-creation-section-${activeSection}`} className="min-w-0 space-y-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">{activeSection === "terrain" ? <Map size={18} /> : activeSection === "equipe" ? <Users size={18} /> : activeSection === "verification" ? <CheckCircle2 size={18} /> : <ClipboardList size={18} />}</span><div><h2 id={`action-creation-section-${activeSection}`} className="text-xl font-black text-emerald-950">{ACTION_CREATION_SECTION_LABELS[activeSection][fr ? "fr" : "en"]}</h2><p className="cmm-text-body cmm-text-primary mt-1">{ACTION_CREATION_SECTION_LABELS[activeSection].description[fr ? "fr" : "en"]}</p></div></div>{content}<div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-3"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" disabled={index === 0} onClick={onPrevious}><ArrowLeft size={14} />{fr ? "Section précédente" : "Previous section"}</CmmButton>{index < ACTION_CREATION_SECTIONS.length - 1 ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onNext}>{fr ? "Section suivante" : "Next section"}<ArrowRight size={14} /></CmmButton> : null}</div></main><ActionCreationContextPreview fr={fr} actionId={currentActionId} form={formSnapshot} activeSection={activeSection} /></div></div></div>;
}

function useActionCreationSectionState(initialActionId: string | null, initialSection: ActionCreationSectionId): [ActionCreationSectionState, Dispatch<SetStateAction<ActionCreationSectionState>>] {
  const [state, setState] = useState<ActionCreationSectionState>(() => createActionCreationSectionState(initialActionId, initialSection));
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = loadActionCreationSectionState();
    startTransition(() => {
      if (saved && saved.actionId === initialActionId) setState((current) => ({ ...saved, activeSection: current.activeSection }));
      setHydrated(true);
    });
  }, [initialActionId]);
  useEffect(() => {
    if (hydrated) saveActionCreationSectionState(state);
  }, [hydrated, state]);
  return [state, setState];
}

function initialWorkflowStep(initialPanel: ActionCreationPanelId, initialActionId: string | null | undefined, params?: Record<string, string | string[] | undefined>): ActionWorkflowStepId {
  const candidate = params?.step;
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (ACTION_WORKFLOW_STEPS.includes(value as ActionWorkflowStepId)) return value as ActionWorkflowStepId;
  const from = params?.from;
  if (from === "planner") return "paris";
  if (initialActionId) return "preformulaire";
  return params?.panel ? PANEL_TO_STEP[initialPanel] : "itineraire";
}

function WorkflowStepper({ state, onSelect, fr = true }: { state: ActionWorkflowState; onSelect: (step: ActionWorkflowStepId) => void; fr?: boolean }) {
  return (
    <nav aria-label={fr ? "Étapes de préparation de l’action" : "Action preparation steps"} data-testid="action-workflow-stepper">
      <ol className="grid gap-2 sm:grid-cols-4">
        {ACTION_WORKFLOW_STEPS.map((step, index) => {
          const status = state.statuses[step];
          const labels = ACTION_WORKFLOW_STEP_LABELS[step];
          const statusLabel = ACTION_WORKFLOW_STATUS_LABELS[status][fr ? "fr" : "en"];
          const active = state.activeStep === step;
          return (
            <li key={step}>
              <button type="button" aria-current={active ? "step" : undefined} aria-label={`${index + 1}. ${labels[fr ? "fr" : "en"]} — ${statusLabel}`} onClick={() => onSelect(step)} className={cn("flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500", active ? "border-emerald-500 bg-emerald-50" : "border-emerald-100 bg-white/80")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black", status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 text-emerald-800")}>{status === "done" ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
                <span className="min-w-0"><span className="block text-sm font-black text-emerald-950">{labels[fr ? "fr" : "en"]}</span><span className="block text-xs text-emerald-900/65">{statusLabel}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ActionWorkflowStepContent({
  activeStep,
  currentActionId,
  draftContext,
  preparationContext,
  formalitiesReadiness,
  formProps,
  localDevAuth,
  onActionPersisted,
  onFormChange,
  onFormalitiesReadiness,
  onPassToComplete,
  onPreparationValidated,
  onPreparationSelection,
  onPreparationContextChange,
  preparationPersistenceStatus,
}: {
  activeStep: ActionWorkflowStepId;
  currentActionId: string | null;
  draftContext: { locationLabel?: string; actionDate?: string; departureTime?: string; contextReady?: boolean };
  preparationContext: ActionPreparationContext;
  formalitiesReadiness: "unknown" | "ready" | "blocked";
  formProps: Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted">;
  localDevAuth: LocalDevAuthState;
  onActionPersisted: (actionId: string) => void;
  onFormChange: (form: FormState) => void;
  onFormalitiesReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
  onPreparationValidated: (validated: boolean) => void;
  onPreparationSelection: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  onPreparationContextChange: (update: Partial<Pick<ActionPreparationContext, "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials">>) => void;
  preparationPersistenceStatus: ActionPreparationPersistenceStatus;
}) {
  if (activeStep === "itineraire") return <EffectiveAuthStateProvider localDevAuth={localDevAuth}><RouteSection actionId={currentActionId} /></EffectiveAuthStateProvider>;
  if (activeStep === "paris") return <ActionCreationLegalPanel actionId={currentActionId} onReadinessChange={onFormalitiesReadiness} />;
  if (activeStep === "preparation") return <WeatherSection draftContext={draftContext} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} onPreparationSelection={onPreparationSelection} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />;
  return <ActionBeforeDeclarationForm {...formProps} initialActionId={currentActionId} preparationContext={preparationContext} guidedWorkflow guidedReadiness={formalitiesReadiness} onFormChange={onFormChange} onActionPersisted={onActionPersisted} onPassToComplete={onPassToComplete} />;
}

function AfterActionCreationView({
  formProps,
  actionId,
  searchParams,
  fr,
}: {
  formProps: Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted">;
  actionId: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
  fr: boolean;
}) {
  return <div data-testid="action-creation-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Bilan d’une action réalisée</h1></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><div role="tabpanel" aria-labelledby={actionId ? "action-creation-space-bilan" : "action-creation-tab-after"}><ActionDeclarationForm {...formProps} initialActionId={actionId} /></div></div></div>;
}

function ActionBilanView({
  formProps,
  actionId,
  searchParams,
  fr,
}: {
  formProps: ActionCreationSectionFormProps;
  actionId: string;
  searchParams?: Record<string, string | string[] | undefined>;
  fr: boolean;
}) {
  return <div data-testid="action-bilan-view" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Bilan</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Finaliser la même action</h1><p className="cmm-text-body cmm-text-primary">Les photos, mesures, présences confirmées et règles de validation restent ceux du formulaire final existant.</p></div></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><div role="tabpanel" aria-labelledby="action-creation-space-bilan"><ActionDeclarationForm {...formProps} initialActionId={actionId} /></div></div></div>;
}

function GuidedActionWorkflowView({
  state,
  fr,
  currentActionId,
  activeSpace,
  stepContent,
  transitionError,
  actionCreationSearchParams,
  onSelect,
  onNext,
}: {
  state: ActionWorkflowState;
  fr: boolean;
  currentActionId: string | null;
  activeSpace: ActionCreationSpace;
  stepContent: ReactNode;
  transitionError: string | null;
  actionCreationSearchParams?: Record<string, string | string[] | undefined>;
  onSelect: (step: ActionWorkflowStepId) => void;
  onNext: () => void;
}) {
  const activeStep = state.activeStep;
  const stepIndex = ACTION_WORKFLOW_STEPS.indexOf(activeStep);
  const icon = activeStep === "itineraire" ? <Navigation size={18} /> : activeStep === "paris" ? <FileWarning size={18} /> : activeStep === "preparation" ? <CloudSun size={18} /> : <ClipboardList size={18} />;
  return <div data-testid="action-creation-shell" data-workflow-step={activeStep} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" /></div><div className="cmm-page-width relative space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-3"><p className="text-sm font-semibold text-emerald-700">{fr ? "Agir" : "Act"}</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">{fr ? "Organiser une action" : "Organize an action"}</h1><p className="cmm-text-body cmm-text-primary max-w-3xl">{fr ? "Suivez les étapes, quittez à tout moment et reprenez la même préparation jusqu’au préformulaire prêt à publier." : "Follow the steps, leave at any time, and resume the same preparation until the pre-form is ready to publish."}</p></div></CmmCard>{currentActionId ? <ActionLifecycleNavigation actionId={currentActionId} activeSpace={activeSpace} fr={fr} searchParams={actionCreationSearchParams} /> : <JoinActionTabs activeTab="before" ariaLabel={fr ? "Onglets du parcours d'action" : "Action flow tabs"} idPrefix="action-creation-tab" tabs={[{ id: "before", label: fr ? "Organiser une action future" : "Organize a future action", panelId: "action-creation-tabpanel-before" }, { id: "after", label: fr ? "Déclarer une action déjà réalisée" : "Report a completed action", panelId: "action-creation-tabpanel-after" }]} buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, actionCreationSearchParams)} />}<WorkflowStepper state={state} onSelect={onSelect} fr={fr} />{transitionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{transitionError}</p> : null}<section aria-labelledby={`action-workflow-step-${activeStep}`} className="space-y-4" data-testid={`action-workflow-panel-${activeStep}`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</span><h2 id={`action-workflow-step-${activeStep}`} className="text-xl font-black text-emerald-950">{ACTION_WORKFLOW_STEP_LABELS[activeStep][fr ? "fr" : "en"]}</h2></div>{stepContent}<div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-3"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" disabled={stepIndex === 0} onClick={() => onSelect(ACTION_WORKFLOW_STEPS[stepIndex - 1])}><ArrowLeft size={14} />{fr ? "Étape précédente" : "Previous step"}</CmmButton>{stepIndex < ACTION_WORKFLOW_STEPS.length - 1 ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onNext}>{fr ? "Étape suivante" : "Next step"}<ArrowRight size={14} /></CmmButton> : null}</div></section></div></div>;
}

function useActionWorkflowState(
  initialActionId: string | null,
  initialPanel: ActionCreationPanelId,
  tabSearchParams?: Record<string, string | string[] | undefined>,
): [ActionWorkflowState, Dispatch<SetStateAction<ActionWorkflowState>>] {
  const [workflow, setWorkflow] = useState<ActionWorkflowState>(() => createActionWorkflowState(initialActionId, initialWorkflowStep(initialPanel, initialActionId, tabSearchParams)));
  const [workflowHydrated, setWorkflowHydrated] = useState(false);

  useEffect(() => {
    const saved = loadActionWorkflowState();
    startTransition(() => {
      if (saved && saved.actionId === initialActionId) setWorkflow((current) => ({ ...saved, activeStep: current.activeStep }));
      setWorkflowHydrated(true);
    });
  }, [initialActionId]);
  useEffect(() => {
    if (workflowHydrated) saveActionWorkflowState(workflow);
  }, [workflow, workflowHydrated]);
  return [workflow, setWorkflow];
}

export function ActionCreationShell({ initialPanel, initialSection = "essentiel", initialSubsection, initialTab = "before", initialSpace = "prepare", tabSearchParams, localDevAuth = INACTIVE_LOCAL_DEV_AUTH, sectionsEnabled = true, ...formProps }: ActionCreationShellProps) {
  const router = useRouter();
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const initialActionId = formProps.initialActionId ?? null;
  const [currentActionId, setCurrentActionId] = useState<string | null>(initialActionId);
  const [workflow, setWorkflow] = useActionWorkflowState(initialActionId, initialPanel, tabSearchParams);
  const [sectionState, setSectionState] = useActionCreationSectionState(initialActionId, initialSection);
  const [formSnapshot, setFormSnapshot] = useState<Partial<FormState>>({});
  const { preparationContext, setPreparationContext, preparationContextReady, preparationPersistenceStatus, markPreparationPersisted } = useActionPreparationContext({ defaultActorName: formProps.defaultActorName, actionId: currentActionId });
  const { handleBeforeFormChange, handlePreparationSelection, handlePreparationContextChange } = useActionCreationPreparationSync({ preparationContext, setPreparationContext, setWorkflow });
  const [formalitiesReadiness, setFormalitiesReadiness] = useState<"unknown" | "ready" | "blocked">("unknown");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const newNavigationEnabled = sectionsEnabled;

  const setActiveStep = useCallback((step: ActionWorkflowStepId) => setWorkflow((current) => ({ ...current, activeStep: step })), [setWorkflow]);
  const navigateToStep = useCallback((step: ActionWorkflowStepId) => {
    setActiveStep(step);
    router.replace(buildActionWorkflowStepHref(step, { ...(tabSearchParams ?? {}), actionId: currentActionId ?? undefined }));
  }, [currentActionId, router, setActiveStep, tabSearchParams]);

  const handleBeforeActionPersisted = useCallback((actionId: string) => {
    setCurrentActionId(actionId);
    setPreparationContext((current) => ({ ...current, actionId }));
    setWorkflow((current) => ({ ...current, actionId, activeStep: "preformulaire", statuses: { ...current.statuses, preformulaire: "done" } }));
    setSectionState((current) => setActionCreationSectionStatus({ ...current, actionId }, "essentiel", "done"));
    markPreparationPersisted(actionId);
  }, [markPreparationPersisted, setPreparationContext, setSectionState, setWorkflow]);
  const handlePreparationValidated = useCallback((validated: boolean) => {
    setWorkflow((current) => setActionWorkflowStepStatus(current, "preparation", validated ? "done" : "review"));
    setSectionState((current) => setActionCreationSectionStatus(current, "terrain", validated ? "done" : "review"));
  }, [setSectionState, setWorkflow]);
  const handleFormalitiesReadiness = useCallback((readiness: { known: boolean; blocked: boolean }) => {
    setFormalitiesReadiness(!readiness.known ? "unknown" : readiness.blocked ? "blocked" : "ready");
    if (readiness.known) setWorkflow((current) => ({ ...current, statuses: { ...current.statuses, paris: readiness.blocked ? "review" : "done" } }));
    setSectionState((current) => setActionCreationSectionStatus(current, "verification", !readiness.known ? "todo" : readiness.blocked ? "review" : "done"));
  }, [setSectionState, setWorkflow]);
  const handlePassToComplete = useCallback(async (actionId: string) => {
    setTransitionError(null);
    try { await updateAction(actionId, { actionPhase: "post_action_draft" }); router.replace(buildActionCreationSpaceHref("bilan", { ...(tabSearchParams ?? {}), actionId })); }
    catch (error: unknown) { setTransitionError(error instanceof Error && error.message ? error.message : "Impossible d’ouvrir le formulaire complet pour le moment."); }
  }, [router, tabSearchParams]);

  const actionCreationSearchParams = currentActionId ? { ...(tabSearchParams ?? {}), actionId: currentActionId } : tabSearchParams;
  const handleSectionFormChange = useCallback((form: FormState) => {
    setFormSnapshot(form);
    handleBeforeFormChange(form);
  }, [handleBeforeFormChange]);
  const navigateToSection = useCallback((section: ActionCreationSectionId) => {
    setSectionState((current) => ({ ...current, activeSection: section }));
    router.replace(buildActionCreationSectionHref(section, { ...(tabSearchParams ?? {}), actionId: currentActionId ?? undefined }));
  }, [currentActionId, router, setSectionState, tabSearchParams]);
  const activeStep = workflow.activeStep;
  const stepIndex = ACTION_WORKFLOW_STEPS.indexOf(activeStep);
  const activeSectionIndex = ACTION_CREATION_SECTIONS.indexOf(sectionState.activeSection);

  if (initialSpace === "day" && currentActionId) return <div data-testid="action-day-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><PageHeader tone="emerald" title="Jour J" subtitle="Retrouvez le rendez-vous et le briefing de la même action." className="!gap-2" /></CmmCard><ActionLifecycleNavigation actionId={currentActionId} activeSpace="day" fr={fr} searchParams={actionCreationSearchParams} /><ActionDayView actionId={currentActionId} /></div></div>;
  if (initialSpace === "bilan" && currentActionId) return <ActionBilanView formProps={formProps} actionId={currentActionId} searchParams={actionCreationSearchParams} fr={fr} />;
  if (initialTab === "after") return <AfterActionCreationView formProps={formProps} actionId={currentActionId} searchParams={actionCreationSearchParams} fr={fr} />;
  if (newNavigationEnabled) {
    return <ActionCreationSectionsView state={sectionState} fr={fr} activeSpace={initialSpace} formSnapshot={formSnapshot} currentActionId={currentActionId} transitionError={transitionError} actionCreationSearchParams={actionCreationSearchParams} onSelect={navigateToSection} onPrevious={() => navigateToSection(ACTION_CREATION_SECTIONS[activeSectionIndex - 1])} onNext={() => navigateToSection(ACTION_CREATION_SECTIONS[activeSectionIndex + 1])} content={<ActionCreationSectionContent activeSection={sectionState.activeSection} currentActionId={currentActionId} initialSubsection={initialSubsection} initialPanel={initialPanel} formSnapshot={formSnapshot} draftContext={{ locationLabel: preparationContext.locationLabel, actionDate: preparationContext.actionDate, departureTime: preparationContext.departureTime, contextReady: preparationContextReady }} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} formalitiesReadiness={formalitiesReadiness} formProps={formProps} localDevAuth={localDevAuth} onActionPersisted={handleBeforeActionPersisted} onFormChange={handleSectionFormChange} onFormalitiesReadiness={handleFormalitiesReadiness} onPassToComplete={handlePassToComplete} onPreparationValidated={handlePreparationValidated} onPreparationSelection={handlePreparationSelection} onPreparationContextChange={handlePreparationContextChange} />} />;
  }
  return <GuidedActionWorkflowView state={workflow} fr={fr} currentActionId={currentActionId} activeSpace={initialSpace} stepContent={<ActionWorkflowStepContent activeStep={activeStep} currentActionId={currentActionId} draftContext={{ locationLabel: preparationContext.locationLabel, actionDate: preparationContext.actionDate, departureTime: preparationContext.departureTime, contextReady: preparationContextReady }} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} formalitiesReadiness={formalitiesReadiness} formProps={formProps} localDevAuth={localDevAuth} onActionPersisted={handleBeforeActionPersisted} onFormChange={handleBeforeFormChange} onFormalitiesReadiness={handleFormalitiesReadiness} onPassToComplete={handlePassToComplete} onPreparationValidated={handlePreparationValidated} onPreparationSelection={handlePreparationSelection} onPreparationContextChange={handlePreparationContextChange} />} transitionError={transitionError} actionCreationSearchParams={actionCreationSearchParams} onSelect={navigateToStep} onNext={() => { setWorkflow((current) => markActionWorkflowStep(current, activeStep)); navigateToStep(ACTION_WORKFLOW_STEPS[stepIndex + 1]); }} />;
}
