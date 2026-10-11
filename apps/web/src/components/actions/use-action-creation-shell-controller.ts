import { startTransition, useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useActionPreparationContext } from "./action-preparation-context-hook";
import { useActionCreationPreparationSync } from "./use-action-creation-preparation-sync";
import type { ActionCreationPanelId, ActionCreationSectionId } from "@/lib/actions/action-creation-routes";
import { buildActionCreationSectionHref, buildActionCreationSpaceHref, buildActionWorkflowStepHref, type ActionCreationSpace } from "@/lib/actions/action-creation-routes";
import { ACTION_CREATION_SECTIONS, createActionCreationSectionState, loadActionCreationSectionState, saveActionCreationSectionState, setActionCreationSectionStatus, type ActionCreationSectionState } from "@/lib/actions/action-creation-sections";
import { ACTION_WORKFLOW_STEPS, createActionWorkflowState, loadActionWorkflowState, markActionWorkflowStep, saveActionWorkflowState, setActionWorkflowStepStatus, type ActionWorkflowState, type ActionWorkflowStepId } from "@/lib/actions/action-workflow";
import { updateAction } from "@/lib/actions/http";
import type { FormState } from "./action-declaration/model";

const PANEL_TO_STEP: Record<ActionCreationPanelId, ActionWorkflowStepId> = {
  itineraire: "itineraire",
  meteo: "preparation",
  formalites: "paris",
  "pre-formulaire": "preformulaire",
};

type SearchParams = Record<string, string | string[] | undefined>;

function initialWorkflowStep(initialPanel: ActionCreationPanelId, initialActionId: string | null | undefined, params?: SearchParams): ActionWorkflowStepId {
  const candidate = params?.step;
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (ACTION_WORKFLOW_STEPS.includes(value as ActionWorkflowStepId)) return value as ActionWorkflowStepId;
  if (params?.from === "planner") return "paris";
  if (initialActionId) return "preformulaire";
  return params?.panel ? PANEL_TO_STEP[initialPanel] : "itineraire";
}
function useActionCreationSectionState(initialActionId: string | null, initialSection: ActionCreationSectionId): [ActionCreationSectionState, Dispatch<SetStateAction<ActionCreationSectionState>>] {
  const [state, setState] = useState<ActionCreationSectionState>(() => createActionCreationSectionState(initialActionId, initialSection));
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const saved = loadActionCreationSectionState();
    startTransition(() => {
      setState(saved && saved.actionId === initialActionId ? saved : createActionCreationSectionState(initialActionId, initialSection));
      setHydrated(true);
    });
  }, [initialActionId, initialSection]);
  useEffect(() => {
    if (hydrated && state.actionId === initialActionId) saveActionCreationSectionState(state);
  }, [hydrated, initialActionId, state]);
  return [state, setState];
}

function useActionWorkflowState(initialActionId: string | null, initialPanel: ActionCreationPanelId, tabSearchParams?: SearchParams): [ActionWorkflowState, Dispatch<SetStateAction<ActionWorkflowState>>] {
  const [workflow, setWorkflow] = useState<ActionWorkflowState>(() => createActionWorkflowState(initialActionId, initialWorkflowStep(initialPanel, initialActionId, tabSearchParams)));
  const [workflowHydrated, setWorkflowHydrated] = useState(false);
  const requestedInitialStep = initialWorkflowStep(initialPanel, initialActionId, tabSearchParams);
  useEffect(() => {
    const saved = loadActionWorkflowState();
    startTransition(() => {
      setWorkflow(saved && saved.actionId === initialActionId ? saved : createActionWorkflowState(initialActionId, requestedInitialStep));
      setWorkflowHydrated(true);
    });
  }, [initialActionId, requestedInitialStep]);
  useEffect(() => {
    if (workflowHydrated && workflow.actionId === initialActionId) saveActionWorkflowState(workflow);
  }, [initialActionId, workflow, workflowHydrated]);
  return [workflow, setWorkflow];
}

export function useActionCreationShellController({
  initialActionId,
  initialPanel,
  initialSection,
  initialSpace,
  tabSearchParams,
  defaultActorName,
  sectionsEnabled,
}: {
  initialActionId: string | null;
  initialPanel: ActionCreationPanelId;
  initialSection: ActionCreationSectionId;
  initialSpace: ActionCreationSpace;
  tabSearchParams?: SearchParams;
  defaultActorName: string;
  sectionsEnabled: boolean;
}) {
  const router = useRouter();
  const [createdActionId, setCreatedActionId] = useState<string | null>(null);
  const currentActionId = initialActionId ?? createdActionId;
  const [workflow, setWorkflow] = useActionWorkflowState(initialActionId, initialPanel, tabSearchParams);
  const [sectionState, setSectionState] = useActionCreationSectionState(initialActionId, initialSection);
  const [formSnapshotState, setFormSnapshotState] = useState<{ actionId: string | null; form: Partial<FormState> }>({ actionId: initialActionId, form: {} });
  const [formalitiesState, setFormalitiesState] = useState<{ actionId: string | null; readiness: "unknown" | "ready" | "blocked" }>({ actionId: initialActionId, readiness: "unknown" });
  const [transitionState, setTransitionState] = useState<{ actionId: string | null; error: string | null }>({ actionId: initialActionId, error: null });
  const formSnapshot = formSnapshotState.actionId === currentActionId ? formSnapshotState.form : {};
  const formalitiesReadiness = formalitiesState.actionId === currentActionId ? formalitiesState.readiness : "unknown";
  const transitionError = transitionState.actionId === currentActionId ? transitionState.error : null;
  const actionIdForRender = currentActionId;
  const renderedWorkflow = workflow.actionId === actionIdForRender ? workflow : createActionWorkflowState(actionIdForRender, initialWorkflowStep(initialPanel, actionIdForRender, tabSearchParams));
  const renderedSectionState = sectionState.actionId === actionIdForRender ? sectionState : createActionCreationSectionState(actionIdForRender, initialSection);
  const { preparationContext, setPreparationContext, preparationContextReady, preparationPersistenceStatus, markPreparationPersisted } = useActionPreparationContext({ defaultActorName, actionId: actionIdForRender });
  const { handleBeforeFormChange, handlePreparationSelection, handlePreparationContextChange } = useActionCreationPreparationSync({ preparationContext, setPreparationContext, setWorkflow });

  const navigateToStep = useCallback((step: ActionWorkflowStepId) => {
    setWorkflow((current) => ({ ...current, activeStep: step }));
    router.replace(buildActionWorkflowStepHref(step, { ...(tabSearchParams ?? {}), actionId: actionIdForRender ?? undefined }));
  }, [actionIdForRender, router, setWorkflow, tabSearchParams]);
  const handleBeforeActionPersisted = useCallback((actionId: string) => {
    const searchParams = { ...(tabSearchParams ?? {}), actionId };
    router.replace(sectionsEnabled ? buildActionCreationSectionHref(sectionState.activeSection, searchParams) : buildActionWorkflowStepHref(workflow.activeStep, searchParams));
    setCreatedActionId(actionId);
    setPreparationContext((current) => ({ ...current, actionId }));
    setWorkflow((current) => ({ ...current, actionId, activeStep: "preformulaire", statuses: { ...current.statuses, preformulaire: "done" } }));
    setSectionState((current) => setActionCreationSectionStatus({ ...current, actionId }, "essentiel", "done"));
    markPreparationPersisted(actionId);
  }, [markPreparationPersisted, router, sectionState.activeSection, sectionsEnabled, setPreparationContext, setSectionState, setWorkflow, tabSearchParams, workflow.activeStep]);
  const handlePreparationValidated = useCallback((validated: boolean) => {
    setWorkflow((current) => setActionWorkflowStepStatus(current, "preparation", validated ? "done" : "review"));
    setSectionState((current) => setActionCreationSectionStatus(current, "terrain", validated ? "done" : "review"));
  }, [setSectionState, setWorkflow]);
  const handleFormalitiesReadiness = useCallback((readiness: { known: boolean; blocked: boolean }) => {
    setFormalitiesState({ actionId: currentActionId, readiness: !readiness.known ? "unknown" : readiness.blocked ? "blocked" : "ready" });
    if (readiness.known) setWorkflow((current) => ({ ...current, statuses: { ...current.statuses, paris: readiness.blocked ? "review" : "done" } }));
    setSectionState((current) => setActionCreationSectionStatus(current, "verification", !readiness.known ? "todo" : readiness.blocked ? "review" : "done"));
  }, [currentActionId, setSectionState, setWorkflow]);
  const handlePassToComplete = useCallback(async (actionId: string) => {
    setTransitionState({ actionId: currentActionId, error: null });
    try {
      await updateAction(actionId, { actionPhase: "post_action_draft" });
      router.replace(buildActionCreationSpaceHref("bilan", { ...(tabSearchParams ?? {}), actionId }));
    } catch (error: unknown) {
      setTransitionState({ actionId: currentActionId, error: error instanceof Error && error.message ? error.message : "Impossible d’ouvrir le formulaire complet pour le moment." });
    }
  }, [currentActionId, router, tabSearchParams]);
  const actionCreationSearchParams = actionIdForRender ? { ...(tabSearchParams ?? {}), actionId: actionIdForRender } : tabSearchParams;
  const handleSectionFormChange = useCallback((form: FormState) => {
    setFormSnapshotState({ actionId: currentActionId, form });
    handleBeforeFormChange(form);
  }, [currentActionId, handleBeforeFormChange]);
  const navigateToSection = useCallback((section: ActionCreationSectionId) => {
    setSectionState((current) => ({ ...current, activeSection: section }));
    router.replace(buildActionCreationSectionHref(section, { ...(tabSearchParams ?? {}), actionId: actionIdForRender ?? undefined }));
  }, [actionIdForRender, router, setSectionState, tabSearchParams]);
  const activeStep = renderedWorkflow.activeStep;
  const stepIndex = ACTION_WORKFLOW_STEPS.indexOf(activeStep);
  const activeSectionIndex = ACTION_CREATION_SECTIONS.indexOf(renderedSectionState.activeSection);
  const handleNextStep = useCallback(() => {
    setWorkflow((current) => markActionWorkflowStep(current, activeStep));
    const nextStep = ACTION_WORKFLOW_STEPS[stepIndex + 1];
    if (nextStep) navigateToStep(nextStep);
  }, [activeStep, navigateToStep, setWorkflow, stepIndex]);
  const handlePreviousSection = useCallback(() => {
    const previousSection = ACTION_CREATION_SECTIONS[activeSectionIndex - 1];
    if (previousSection) navigateToSection(previousSection);
  }, [activeSectionIndex, navigateToSection]);
  const handleNextSection = useCallback(() => {
    const nextSection = ACTION_CREATION_SECTIONS[activeSectionIndex + 1];
    if (nextSection) navigateToSection(nextSection);
  }, [activeSectionIndex, navigateToSection]);

  return {
    actionIdForRender,
    actionCreationSearchParams,
    activeStep,
    currentActionId,
    formSnapshot,
    formalitiesReadiness,
    handleBeforeActionPersisted,
    handleBeforeFormChange,
    handleFormalitiesReadiness,
    handleNextSection,
    handleNextStep,
    handlePassToComplete,
    handlePreparationContextChange,
    handlePreparationSelection,
    handlePreparationValidated,
    handlePreviousSection,
    handleSectionFormChange,
    navigateToSection,
    navigateToStep,
    preparationContext,
    preparationContextReady,
    preparationPersistenceStatus,
    renderedSectionState,
    renderedWorkflow,
    transitionError,
    initialSpace,
  };
}
