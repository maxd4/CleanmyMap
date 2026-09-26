"use client";

import { startTransition, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardList, CloudSun, FileWarning, Navigation } from "lucide-react";
import { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import { ActionDeclarationForm } from "./action-declaration/form/action-declaration-form";
import { ActionCreationLegalPanel } from "./action-creation-legal-panel";
import { RouteSection } from "@/components/sections/rubriques/route";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import { INACTIVE_LOCAL_DEV_AUTH, type LocalDevAuthState } from "@/lib/auth/effective-auth-contract";
import { cn } from "@/lib/utils";
import { buildActionCreationTabHref, buildActionWorkflowStepHref, type ActionCreationPanelId, type ActionCreationTab } from "@/lib/actions/action-creation-routes";
import { ACTION_WORKFLOW_STEPS, ACTION_WORKFLOW_STEP_LABELS, ACTION_WORKFLOW_STATUS_LABELS, createActionWorkflowState, invalidateActionWorkflow, loadActionWorkflowState, markActionWorkflowStep, saveActionWorkflowState, type ActionWorkflowState, type ActionWorkflowStepId } from "@/lib/actions/action-workflow";
import { updateAction } from "@/lib/actions/http";
import type { FormState } from "./action-declaration/form/model";
import { JoinActionTabs } from "@/components/sections/rubriques/rejoindre-une-action.tabs";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type ActionCreationShellProps = Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted"> & {
  initialPanel: ActionCreationPanelId;
  initialTab?: ActionCreationTab;
  tabSearchParams?: Record<string, string | string[] | undefined>;
  localDevAuth?: LocalDevAuthState;
};

const PANEL_TO_STEP: Record<ActionCreationPanelId, ActionWorkflowStepId> = {
  itineraire: "itineraire",
  meteo: "preparation",
  formalites: "paris",
  "pre-formulaire": "preformulaire",
};

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
  formalitiesReadiness,
  formProps,
  localDevAuth,
  preparationValidated,
  onActionPersisted,
  onFormChange,
  onFormalitiesReadiness,
  onPassToComplete,
  onPreparationValidated,
}: {
  activeStep: ActionWorkflowStepId;
  currentActionId: string | null;
  draftContext: { locationLabel?: string; actionDate?: string };
  formalitiesReadiness: "unknown" | "ready" | "blocked";
  formProps: Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted">;
  localDevAuth: LocalDevAuthState;
  preparationValidated: boolean;
  onActionPersisted: (actionId: string) => void;
  onFormChange: (form: FormState) => void;
  onFormalitiesReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
  onPreparationValidated: (validated: boolean) => void;
}) {
  if (activeStep === "itineraire") return <EffectiveAuthStateProvider localDevAuth={localDevAuth}><RouteSection actionId={currentActionId} /></EffectiveAuthStateProvider>;
  if (activeStep === "paris") return <ActionCreationLegalPanel actionId={currentActionId} onReadinessChange={onFormalitiesReadiness} />;
  if (activeStep === "preparation") return <WeatherSection draftContext={draftContext} onPreparationValidated={onPreparationValidated} initialPreparationValidated={preparationValidated} />;
  return <ActionBeforeDeclarationForm {...formProps} initialActionId={currentActionId} guidedWorkflow guidedReadiness={formalitiesReadiness} onFormChange={onFormChange} onActionPersisted={onActionPersisted} onPassToComplete={onPassToComplete} />;
}

function AfterActionCreationView({
  formProps,
  actionId,
  searchParams,
}: {
  formProps: Omit<ComponentProps<typeof ActionBeforeDeclarationForm>, "onPassToComplete" | "onFormChange" | "onActionPersisted">;
  actionId: string | null;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <div data-testid="action-creation-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Formulaire</h1></CmmCard><JoinActionTabs activeTab="after" ariaLabel="Onglets du parcours d'action" idPrefix="action-creation-tab" tabs={[{ id: "before", label: "Pré-formulaire", panelId: "action-creation-tabpanel-before" }, { id: "after", label: "Formulaire", panelId: "action-creation-tabpanel-after" }]} buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, searchParams)} /><div role="tabpanel" aria-labelledby="action-creation-tab-after"><ActionDeclarationForm {...formProps} initialActionId={actionId} /></div></div></div>;
}

function GuidedActionWorkflowView({
  state,
  fr,
  stepContent,
  transitionError,
  actionCreationSearchParams,
  onSelect,
  onNext,
}: {
  state: ActionWorkflowState;
  fr: boolean;
  stepContent: ReactNode;
  transitionError: string | null;
  actionCreationSearchParams?: Record<string, string | string[] | undefined>;
  onSelect: (step: ActionWorkflowStepId) => void;
  onNext: () => void;
}) {
  const activeStep = state.activeStep;
  const stepIndex = ACTION_WORKFLOW_STEPS.indexOf(activeStep);
  const icon = activeStep === "itineraire" ? <Navigation size={18} /> : activeStep === "paris" ? <FileWarning size={18} /> : activeStep === "preparation" ? <CloudSun size={18} /> : <ClipboardList size={18} />;
  return <div data-testid="action-creation-shell" data-workflow-step={activeStep} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" /></div><div className="cmm-page-width relative space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-3"><p className="text-sm font-semibold text-emerald-700">{fr ? "Agir" : "Act"}</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">{fr ? "Organiser une action" : "Organize an action"}</h1><p className="cmm-text-body cmm-text-primary max-w-3xl">{fr ? "Suivez les étapes, quittez à tout moment et reprenez la même préparation jusqu’au préformulaire prêt à publier." : "Follow the steps, leave at any time, and resume the same preparation until the pre-form is ready to publish."}</p></div></CmmCard><JoinActionTabs activeTab="before" ariaLabel={fr ? "Onglets du parcours d'action" : "Action flow tabs"} idPrefix="action-creation-tab" tabs={[{ id: "before", label: fr ? "Pré-formulaire" : "Pre-form", panelId: "action-creation-tabpanel-before" }, { id: "after", label: fr ? "Formulaire" : "Form", panelId: "action-creation-tabpanel-after" }]} buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, actionCreationSearchParams)} /><WorkflowStepper state={state} onSelect={onSelect} fr={fr} />{transitionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{transitionError}</p> : null}<section aria-labelledby={`action-workflow-step-${activeStep}`} className="space-y-4" data-testid={`action-workflow-panel-${activeStep}`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</span><h2 id={`action-workflow-step-${activeStep}`} className="text-xl font-black text-emerald-950">{ACTION_WORKFLOW_STEP_LABELS[activeStep][fr ? "fr" : "en"]}</h2></div>{stepContent}<div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-3"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" disabled={stepIndex === 0} onClick={() => onSelect(ACTION_WORKFLOW_STEPS[stepIndex - 1])}><ArrowLeft size={14} />{fr ? "Étape précédente" : "Previous step"}</CmmButton>{stepIndex < ACTION_WORKFLOW_STEPS.length - 1 ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onNext}>{fr ? "Étape suivante" : "Next step"}<ArrowRight size={14} /></CmmButton> : null}</div></section></div></div>;
}

export function ActionCreationShell({ initialPanel, initialTab = "before", tabSearchParams, localDevAuth = INACTIVE_LOCAL_DEV_AUTH, ...formProps }: ActionCreationShellProps) {
  const router = useRouter();
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const initialActionId = formProps.initialActionId ?? null;
  const [currentActionId, setCurrentActionId] = useState<string | null>(initialActionId);
  const [workflow, setWorkflow] = useState<ActionWorkflowState>(() => {
    const step = initialWorkflowStep(initialPanel, initialActionId, tabSearchParams);
    return createActionWorkflowState(initialActionId, step);
  });
  const [workflowHydrated, setWorkflowHydrated] = useState(false);
  const [draftContext, setDraftContext] = useState<{ locationLabel?: string; actionDate?: string }>({});
  const [preparationValidated, setPreparationValidated] = useState(false);
  const [formalitiesReadiness, setFormalitiesReadiness] = useState<"unknown" | "ready" | "blocked">("unknown");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const previousContext = useRef(draftContext);

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
  const setActiveStep = useCallback((step: ActionWorkflowStepId) => setWorkflow((current) => ({ ...current, activeStep: step })), []);
  const navigateToStep = useCallback((step: ActionWorkflowStepId) => {
    setActiveStep(step);
    router.replace(buildActionWorkflowStepHref(step, { ...(tabSearchParams ?? {}), actionId: currentActionId ?? undefined }));
  }, [currentActionId, router, setActiveStep, tabSearchParams]);

  const handleBeforeFormChange = useCallback((form: FormState) => {
    const next = { locationLabel: form.departureLocationLabel.trim() || form.locationLabel.trim(), actionDate: form.actionDate.trim() };
    if (previousContext.current.actionDate && previousContext.current.actionDate !== next.actionDate) setWorkflow((current) => invalidateActionWorkflow(current, "date_time"));
    else if (previousContext.current.locationLabel && previousContext.current.locationLabel !== next.locationLabel) setWorkflow((current) => invalidateActionWorkflow(current, "location"));
    previousContext.current = next;
    setDraftContext(next);
  }, []);
  const handleBeforeActionPersisted = useCallback((actionId: string) => {
    setCurrentActionId(actionId);
    setWorkflow((current) => ({ ...current, actionId, activeStep: "preformulaire", statuses: { ...current.statuses, preformulaire: "done" } }));
  }, []);
  const handlePreparationValidated = useCallback((validated: boolean) => { setPreparationValidated(validated); if (validated) setWorkflow((current) => markActionWorkflowStep(current, "preparation")); }, []);
  const handleFormalitiesReadiness = useCallback((readiness: { known: boolean; blocked: boolean }) => {
    setFormalitiesReadiness(!readiness.known ? "unknown" : readiness.blocked ? "blocked" : "ready");
    if (readiness.known) setWorkflow((current) => ({ ...current, statuses: { ...current.statuses, paris: readiness.blocked ? "review" : "done" } }));
  }, []);
  const handlePassToComplete = useCallback(async (actionId: string) => {
    setTransitionError(null);
    try { await updateAction(actionId, { actionPhase: "post_action_draft" }); router.replace(buildActionCreationTabHref("after", { ...(tabSearchParams ?? {}), actionId })); }
    catch (error: unknown) { setTransitionError(error instanceof Error && error.message ? error.message : "Impossible d’ouvrir le formulaire complet pour le moment."); }
  }, [router, tabSearchParams]);

  const actionCreationSearchParams = currentActionId ? { ...(tabSearchParams ?? {}), actionId: currentActionId } : tabSearchParams;
  const activeStep = workflow.activeStep;
  const stepIndex = ACTION_WORKFLOW_STEPS.indexOf(activeStep);
  const canAdvance = activeStep !== "preparation" || preparationValidated;

  if (initialTab === "after") return <AfterActionCreationView formProps={formProps} actionId={currentActionId} searchParams={actionCreationSearchParams} />;
  return <GuidedActionWorkflowView state={workflow} fr={fr} stepContent={<ActionWorkflowStepContent activeStep={activeStep} currentActionId={currentActionId} draftContext={draftContext} formalitiesReadiness={formalitiesReadiness} formProps={formProps} localDevAuth={localDevAuth} preparationValidated={preparationValidated} onActionPersisted={handleBeforeActionPersisted} onFormChange={handleBeforeFormChange} onFormalitiesReadiness={handleFormalitiesReadiness} onPassToComplete={handlePassToComplete} onPreparationValidated={handlePreparationValidated} />} transitionError={transitionError} actionCreationSearchParams={actionCreationSearchParams} onSelect={navigateToStep} onNext={() => { if (canAdvance) { setWorkflow((current) => markActionWorkflowStep(current, activeStep)); navigateToStep(ACTION_WORKFLOW_STEPS[stepIndex + 1]); } }} />;
}
