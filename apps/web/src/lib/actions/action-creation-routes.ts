export type ActionCreationPanelId =
  | "pre-formulaire"
  | "itineraire"
  | "meteo"
  | "formalites";

export type ActionCreationTab = "before" | "after";

export type ActionWorkflowStepId =
  | "itineraire"
  | "paris"
  | "preparation"
  | "preformulaire";

export const ACTION_CREATION_ROUTE = "/actions/new";

export function normalizeActionCreationPanel(
  value: string | string[] | undefined,
): ActionCreationPanelId {
  const candidate = Array.isArray(value) ? value[0] : value;
  switch (candidate) {
    case "itineraire":
    case "meteo":
    case "formalites":
    case "pre-formulaire":
      return candidate;
    default:
      return "pre-formulaire";
  }
}

export function normalizeActionCreationTab(
  value: string | string[] | undefined,
  context: {
    actionId?: string;
    from?: string;
    actionPhase?: "pre_action" | "post_action_draft" | "post_action_complete" | null;
    panel?: ActionCreationPanelId;
  } = {},
): ActionCreationTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "before" || candidate === "after") return candidate;
  if (context.panel && context.panel !== "pre-formulaire") return "before";
  if (context.actionPhase === "pre_action") return "before";
  if (context.actionPhase) return "after";
  if (context.from === "planner" || context.from === "before") return "before";
  return context.actionId?.trim() ? "after" : "before";
}

export function buildActionCreationTabHref(
  tab: ActionCreationTab,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams({ tab });

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.append(key, value);
    }
  }

  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}

export function buildActionCreationPanelHref(
  panel: ActionCreationPanelId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set("panel", panel);

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "panel" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.append(key, value);
    }
  }

  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}

export function normalizeActionWorkflowStep(
  value: string | string[] | undefined,
): ActionWorkflowStepId {
  const candidate = Array.isArray(value) ? value[0] : value;
  switch (candidate) {
    case "itineraire":
    case "paris":
    case "preparation":
    case "preformulaire":
      return candidate;
    default:
      return "itineraire";
  }
}

export function buildActionWorkflowStepHref(
  step: ActionWorkflowStepId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams({ step });
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "step" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.append(key, value);
    }
  }
  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}
