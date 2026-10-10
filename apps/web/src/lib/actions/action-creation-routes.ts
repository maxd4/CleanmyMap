export type ActionCreationPanelId =
  | "pre-formulaire"
  | "itineraire"
  | "meteo"
  | "formalites";

export type ActionCreationTab = "before" | "after";

export type ActionCreationSectionId =
  | "essentiel"
  | "terrain"
  | "equipe"
  | "verification";

export type ActionCreationSubsectionId =
  | "route"
  | "meteo"
  | "formalites"
  | "pre-formulaire";

export type ActionWorkflowStepId =
  | "itineraire"
  | "paris"
  | "preparation"
  | "preformulaire";

const ACTION_CREATION_ROUTE = "/actions/new";
const ACTION_CREATION_SECTION_VALUES: readonly ActionCreationSectionId[] = ["essentiel", "terrain", "equipe", "verification"];
const ACTION_CREATION_SUBSECTION_VALUES: readonly ActionCreationSubsectionId[] = ["route", "meteo", "formalites", "pre-formulaire"];
const LEGACY_STEP_TO_SECTION: Record<string, ActionCreationSectionId> = {
  itineraire: "terrain",
  preparation: "terrain",
  paris: "verification",
  preformulaire: "essentiel",
};
const LEGACY_PANEL_TO_SECTION: Record<ActionCreationPanelId, ActionCreationSectionId> = {
  itineraire: "terrain",
  meteo: "terrain",
  formalites: "verification",
  "pre-formulaire": "essentiel",
};
const LEGACY_STEP_TO_SUBSECTION: Record<string, ActionCreationSubsectionId> = {
  itineraire: "route",
  preparation: "meteo",
  paris: "formalites",
  preformulaire: "pre-formulaire",
};
const LEGACY_PANEL_TO_SUBSECTION: Partial<Record<ActionCreationPanelId, ActionCreationSubsectionId>> = {
  itineraire: "route",
  meteo: "meteo",
  formalites: "formalites",
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export function normalizeActionCreationSection(
  value: string | string[] | undefined,
  context: {
    step?: string | string[];
    panel?: ActionCreationPanelId;
    from?: string;
  } = {},
): ActionCreationSectionId {
  const candidate = firstSearchParam(value);
  if (ACTION_CREATION_SECTION_VALUES.includes(candidate as ActionCreationSectionId)) {
    return candidate as ActionCreationSectionId;
  }
  const legacyStep = LEGACY_STEP_TO_SECTION[firstSearchParam(context.step) ?? ""];
  if (legacyStep) return legacyStep;
  if (context.panel && context.panel !== "pre-formulaire") return LEGACY_PANEL_TO_SECTION[context.panel];
  return context.from === "planner" ? "terrain" : "essentiel";
}

export function normalizeActionCreationSubsection(
  value: string | string[] | undefined,
  context: { step?: string | string[]; panel?: ActionCreationPanelId } = {},
): ActionCreationSubsectionId | undefined {
  const candidate = firstSearchParam(value);
  if (ACTION_CREATION_SUBSECTION_VALUES.includes(candidate as ActionCreationSubsectionId)) {
    return candidate as ActionCreationSubsectionId;
  }
  return LEGACY_STEP_TO_SUBSECTION[firstSearchParam(context.step) ?? ""]
    ?? (context.panel ? LEGACY_PANEL_TO_SUBSECTION[context.panel] : undefined);
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

export function buildActionCreationSectionHref(
  section: ActionCreationSectionId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams({ section });
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "section" || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
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
