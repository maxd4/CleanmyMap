export type ActionCreationPanelId =
  | "pre-formulaire"
  | "itineraire"
  | "meteo"
  | "formalites";

export type ActionCreationTab = "before" | "after";
export type ActionCreationSpace = "prepare" | "day" | "bilan";

export type ActionCreationSectionId =
  | "definir"
  | "preparer";

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
const ACTION_CREATION_SPACES: readonly ActionCreationSpace[] = ["prepare", "day", "bilan"];
const ACTION_CREATION_SECTION_VALUES: readonly ActionCreationSectionId[] = ["definir", "preparer"];
const ACTION_CREATION_SUBSECTION_VALUES: readonly ActionCreationSubsectionId[] = ["route", "meteo", "formalites", "pre-formulaire"];
const LEGACY_STEP_TO_SECTION: Record<string, ActionCreationSectionId> = {
  itineraire: "preparer",
  preparation: "preparer",
  paris: "preparer",
  preformulaire: "definir",
};
const LEGACY_PANEL_TO_SECTION: Record<ActionCreationPanelId, ActionCreationSectionId> = {
  itineraire: "preparer",
  meteo: "preparer",
  formalites: "preparer",
  "pre-formulaire": "definir",
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

function appendSearchParams(
  params: URLSearchParams,
  searchParams: Record<string, string | string[] | undefined>,
  excludedKey: string,
): void {
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === excludedKey || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else {
      params.append(key, value);
    }
  }
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
    subsection?: string | string[];
    from?: string;
  } = {},
): ActionCreationSectionId {
  const candidate = firstSearchParam(value);
  if (ACTION_CREATION_SECTION_VALUES.includes(candidate as ActionCreationSectionId)) {
    return candidate as ActionCreationSectionId;
  }
  if (candidate === "essentiel") return "definir";
  if (candidate === "terrain" || candidate === "equipe" || candidate === "verification") return "preparer";
  const legacyStep = LEGACY_STEP_TO_SECTION[firstSearchParam(context.step) ?? ""];
  if (legacyStep) return legacyStep;
  const legacySubsection = firstSearchParam(context.subsection);
  if (legacySubsection === "pre-formulaire") return "definir";
  if (legacySubsection && ACTION_CREATION_SUBSECTION_VALUES.includes(legacySubsection as ActionCreationSubsectionId)) return "preparer";
  if (context.panel) return LEGACY_PANEL_TO_SECTION[context.panel];
  return context.from === "planner" ? "preparer" : "definir";
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

export function normalizeActionCreationSpace(
  value: string | string[] | undefined,
  context: { actionId?: string; tab?: ActionCreationTab } = {},
): ActionCreationSpace {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (ACTION_CREATION_SPACES.includes(candidate as ActionCreationSpace)) {
    return candidate as ActionCreationSpace;
  }
  if (context.tab === "after") return "bilan";
  return "prepare";
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

export function buildActionCreationSpaceHref(
  space: ActionCreationSpace,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams({ space });
  appendSearchParams(params, searchParams, "space");
  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}

export function buildActionCreationSectionHref(
  section: ActionCreationSectionId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams({ section });
  for (const [key, value] of Object.entries(searchParams)) {
    if (["section", "step", "panel", "subsection"].includes(key) || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.append(key, value);
  }
  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}

export function buildActionCreationPanelHref(
  panel: ActionCreationPanelId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set("panel", panel);
  appendSearchParams(params, searchParams, "panel");

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
  appendSearchParams(params, searchParams, "step");
  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}
