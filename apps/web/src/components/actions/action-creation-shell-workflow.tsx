import { ArrowLeft, ArrowRight, ClipboardList, CloudSun, FileWarning, Navigation } from "lucide-react";
import type { ReactNode } from "react";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";
import { ActionCreationLegalPanel } from "./action-creation-legal-panel";
import { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import { RouteSection } from "@/components/sections/rubriques/route";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { ACTION_WORKFLOW_STEP_LABELS, ACTION_WORKFLOW_STEPS, type ActionWorkflowState, type ActionWorkflowStepId } from "@/lib/actions/action-workflow";
import { buildActionCreationTabHref, type ActionCreationSpace, type ActionCreationTab } from "@/lib/actions/action-creation-routes";
import { JoinActionTabs } from "@/components/sections/rubriques/rejoindre-une-action.tabs";
import { WorkflowStepper, ActionLifecycleNavigation } from "./action-creation-shell-navigation";
import type { ActionCreationSharedViewProps } from "./action-creation-shell.types";

export function ActionWorkflowStepContent({ activeStep, ...viewProps }: ActionCreationSharedViewProps & { activeStep: ActionWorkflowStepId }) {
  const { currentActionId, draftContext, preparationContext, formalitiesReadiness, formProps, localDevAuth, preparationPersistenceStatus, onActionPersisted, onFormChange, onFormalitiesReadiness, onPassToComplete, onPreparationValidated, onPreparationSelection, onPreparationContextChange } = viewProps;
  if (activeStep === "itineraire") return <EffectiveAuthStateProvider localDevAuth={localDevAuth}><RouteSection actionId={currentActionId} /></EffectiveAuthStateProvider>;
  if (activeStep === "paris") return <ActionCreationLegalPanel actionId={currentActionId} onReadinessChange={onFormalitiesReadiness} />;
  if (activeStep === "preparation") return <WeatherSection draftContext={draftContext} preparationContext={preparationContext} preparationPersistenceStatus={preparationPersistenceStatus} onPreparationSelection={onPreparationSelection} onPreparationValidated={onPreparationValidated} onPreparationContextChange={onPreparationContextChange} />;
  return <ActionBeforeDeclarationForm {...formProps} initialActionId={currentActionId} preparationContext={preparationContext} guidedWorkflow guidedReadiness={formalitiesReadiness} onFormChange={onFormChange} onActionPersisted={onActionPersisted} onPassToComplete={onPassToComplete} />;
}
export function GuidedActionWorkflowView({
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
  return (
    <div data-testid="action-creation-shell" data-workflow-step={activeStep} className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6">
      <div className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/45 blur-[110px]" /><div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" /></div>
      <div className="cmm-page-width relative space-y-4">
        <CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-3"><p className="text-sm font-semibold text-emerald-700">{fr ? "Agir" : "Act"}</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">{fr ? "Organiser une action" : "Organize an action"}</h1><p className="cmm-text-body cmm-text-primary max-w-3xl">{fr ? "Suivez les étapes, quittez à tout moment et reprenez la même préparation jusqu’au préformulaire prêt à publier." : "Follow the steps, leave at any time, and resume the same preparation until the pre-form is ready to publish."}</p></div></CmmCard>
        {currentActionId ? <ActionLifecycleNavigation actionId={currentActionId} activeSpace={activeSpace} fr={fr} searchParams={actionCreationSearchParams} /> : <JoinActionTabs activeTab="before" ariaLabel={fr ? "Onglets du parcours d'action" : "Action flow tabs"} idPrefix="action-creation-tab" tabs={[{ id: "before", label: fr ? "Organiser une action future" : "Organize a future action", panelId: "action-creation-tabpanel-before" }, { id: "after", label: fr ? "Déclarer une action déjà réalisée" : "Report a completed action", panelId: "action-creation-tabpanel-after" }]} buildHref={(tab) => buildActionCreationTabHref(tab as ActionCreationTab, actionCreationSearchParams)} />}
        <WorkflowStepper state={state} onSelect={onSelect} fr={fr} />
        {transitionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{transitionError}</p> : null}
        <section aria-labelledby={`action-workflow-step-${activeStep}`} className="space-y-4" data-testid={`action-workflow-panel-${activeStep}`}>
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">{icon}</span><h2 id={`action-workflow-step-${activeStep}`} className="text-xl font-black text-emerald-950">{ACTION_WORKFLOW_STEP_LABELS[activeStep][fr ? "fr" : "en"]}</h2></div>
          {stepContent}
          <div className="flex flex-wrap justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 p-3"><CmmButton type="button" tone="tertiary" variant="pill" size="sm" disabled={stepIndex === 0} onClick={() => onSelect(ACTION_WORKFLOW_STEPS[stepIndex - 1])}><ArrowLeft size={14} />{fr ? "Étape précédente" : "Previous step"}</CmmButton>{stepIndex < ACTION_WORKFLOW_STEPS.length - 1 ? <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onNext}>{fr ? "Étape suivante" : "Next step"}<ArrowRight size={14} /></CmmButton> : null}</div>
        </section>
      </div>
    </div>
  );
}
