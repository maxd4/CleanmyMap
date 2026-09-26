const ACTION_WORKFLOW_SCHEMA_VERSION = "action-workflow-v1" as const;

export const ACTION_WORKFLOW_STEPS = [
  "itineraire",
  "paris",
  "preparation",
  "preformulaire",
] as const;

export type ActionWorkflowStepId = (typeof ACTION_WORKFLOW_STEPS)[number];
export type ActionWorkflowStepStatus = "todo" | "in_progress" | "done" | "review";

export type ActionWorkflowState = {
  schemaVersion: typeof ACTION_WORKFLOW_SCHEMA_VERSION;
  actionId: string | null;
  activeStep: ActionWorkflowStepId;
  statuses: Record<ActionWorkflowStepId, ActionWorkflowStepStatus>;
};

export type ActionWorkflowChange =
  | "route"
  | "location"
  | "date_time"
  | "preparation"
  | "text"
  | "formalities";

export const ACTION_WORKFLOW_STEP_LABELS: Record<
  ActionWorkflowStepId,
  { fr: string; en: string }
> = {
  itineraire: { fr: "Itinéraire", en: "Route" },
  paris: { fr: "Paris", en: "Paris" },
  preparation: { fr: "Préparation", en: "Preparation" },
  preformulaire: { fr: "Préformulaire", en: "Pre-form" },
};

export const ACTION_WORKFLOW_STATUS_LABELS: Record<
  ActionWorkflowStepStatus,
  { fr: string; en: string }
> = {
  todo: { fr: "À faire", en: "To do" },
  in_progress: { fr: "En cours", en: "In progress" },
  done: { fr: "Terminé", en: "Done" },
  review: { fr: "À revoir", en: "Needs review" },
};

export function createActionWorkflowState(
  actionId: string | null = null,
  activeStep: ActionWorkflowStepId = "itineraire",
): ActionWorkflowState {
  return {
    schemaVersion: ACTION_WORKFLOW_SCHEMA_VERSION,
    actionId,
    activeStep,
    statuses: {
      itineraire: activeStep === "itineraire" ? "in_progress" : "todo",
      paris: "todo",
      preparation: "todo",
      preformulaire: "todo",
    },
  };
}

export function markActionWorkflowStep(
  state: ActionWorkflowState,
  step: ActionWorkflowStepId,
  status: ActionWorkflowStepStatus = "done",
): ActionWorkflowState {
  const index = ACTION_WORKFLOW_STEPS.indexOf(step);
  const statuses = { ...state.statuses, [step]: status };
  const nextStep = ACTION_WORKFLOW_STEPS[index + 1];
  if (nextStep && statuses[nextStep] === "todo") statuses[nextStep] = "in_progress";
  return { ...state, activeStep: nextStep ?? step, statuses };
}

export function invalidateActionWorkflow(
  state: ActionWorkflowState,
  change: ActionWorkflowChange,
): ActionWorkflowState {
  const next = { ...state, statuses: { ...state.statuses } };
  if (change === "route" || change === "location") {
    next.statuses.paris = "review";
    next.statuses.preparation = "review";
  } else if (change === "date_time") {
    next.statuses.preparation = "review";
  } else if (change === "preparation") {
    next.statuses.preparation = "review";
  }
  return next;
}

const STORAGE_KEY = "cleanmymap.action-workflow.v1";

export function loadActionWorkflowState(): ActionWorkflowState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActionWorkflowState>;
    if (
      parsed.schemaVersion !== ACTION_WORKFLOW_SCHEMA_VERSION ||
      !parsed.statuses ||
      !ACTION_WORKFLOW_STEPS.includes(parsed.activeStep as ActionWorkflowStepId)
    ) return null;
    return parsed as ActionWorkflowState;
  } catch {
    return null;
  }
}

export function saveActionWorkflowState(state: ActionWorkflowState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is only an orchestration convenience; canonical data is server-side.
  }
}
