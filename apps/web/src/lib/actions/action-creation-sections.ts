export const ACTION_CREATION_SECTIONS = ["definir", "preparer"] as const;

export type ActionCreationSectionId = (typeof ACTION_CREATION_SECTIONS)[number];
export type ActionCreationSectionStatus = "todo" | "review" | "done";

export type ActionCreationSectionState = {
  schemaVersion: "action-creation-sections-v2";
  actionId: string | null;
  activeSection: ActionCreationSectionId;
  statuses: Record<ActionCreationSectionId, ActionCreationSectionStatus>;
};

export const ACTION_CREATION_SECTION_LABELS: Record<
  ActionCreationSectionId,
  { fr: string; en: string; description: { fr: string; en: string } }
> = {
  definir: {
    fr: "Définir l'action",
    en: "Define the action",
    description: {
      fr: "Nom, objectif, lieu, date et organisateur.",
      en: "Name, objective, place, date and organizer.",
    },
  },
  preparer: {
    fr: "Préparer et publier",
    en: "Prepare and publish",
    description: {
      fr: "Terrain, équipe, logistique, formalités et publication.",
      en: "Field, team, logistics, formalities and publication.",
    },
  },
};

export const ACTION_CREATION_SECTION_STATUS_LABELS: Record<
  ActionCreationSectionStatus,
  { fr: string; en: string }
> = {
  todo: { fr: "À compléter", en: "To complete" },
  review: { fr: "À vérifier", en: "To review" },
  done: { fr: "Complet", en: "Complete" },
};

const STORAGE_KEY = "cleanmymap.action-creation-sections.v2";
const V1_STORAGE_KEY = "cleanmymap.action-creation-sections.v1";
const LEGACY_STORAGE_KEY = "cleanmymap.action-workflow.v1";

type LegacyActionWorkflowStatus = "todo" | "in_progress" | "done" | "review";
type LegacyActionWorkflowState = {
  schemaVersion?: string;
  actionId?: string | null;
  activeStep?: string;
  statuses?: Partial<Record<"itineraire" | "paris" | "preparation" | "preformulaire", LegacyActionWorkflowStatus>>;
};
type V1ActionCreationSectionState = {
  schemaVersion?: string;
  actionId?: string | null;
  activeSection?: string;
  statuses?: Partial<Record<"essentiel" | "terrain" | "equipe" | "verification", ActionCreationSectionStatus>>;
};

function mergeStatuses(statuses: Array<ActionCreationSectionStatus | LegacyActionWorkflowStatus | undefined>): ActionCreationSectionStatus {
  const normalized = statuses.map((status) => status === "in_progress" ? "review" : status ?? "todo");
  if (normalized.includes("review")) return "review";
  return normalized.every((status) => status === "done") ? "done" : "todo";
}

function stageFromLegacySection(section: unknown): ActionCreationSectionId {
  return section === "essentiel" || section === "definir" ? "definir" : "preparer";
}

function stageFromLegacyStep(step: unknown): ActionCreationSectionId {
  return step === "preformulaire" ? "definir" : "preparer";
}

export function migrateV1ActionCreationSectionState(legacy: V1ActionCreationSectionState): ActionCreationSectionState {
  const statuses = legacy.statuses;
  const preparationStatus = mergeStatuses([
    statuses?.terrain,
    statuses?.equipe,
    statuses?.verification,
  ]);
  return {
    ...createActionCreationSectionState(legacy.actionId ?? null, stageFromLegacySection(legacy.activeSection)),
    statuses: {
      definir: statuses?.essentiel ?? "todo",
      // Formalities alone never mean the whole preparation stage is complete.
      preparer: preparationStatus,
    },
  };
}

export function migrateLegacyActionWorkflowState(legacy: LegacyActionWorkflowState): ActionCreationSectionState {
  const statuses = legacy.statuses;
  const preparationStatuses = [
    statuses?.itineraire,
    statuses?.preparation,
    statuses?.paris,
  ];
  // This legacy state did not track team/logistics completion, so it cannot
  // prove that the combined preparation stage is complete.
  const preparationStatus = preparationStatuses.some((status) => status === "review" || status === "in_progress")
    ? "review"
    : "todo";
  return {
    ...createActionCreationSectionState(legacy.actionId ?? null, stageFromLegacyStep(legacy.activeStep)),
    statuses: {
      definir: statuses?.preformulaire === "done" ? "done" : statuses?.preformulaire === "review" || statuses?.preformulaire === "in_progress" ? "review" : "todo",
      preparer: preparationStatus,
    },
  };
}

export function createActionCreationSectionState(
  actionId: string | null = null,
  activeSection: ActionCreationSectionId = "definir",
): ActionCreationSectionState {
  return {
    schemaVersion: "action-creation-sections-v2",
    actionId,
    activeSection,
    statuses: { definir: "todo", preparer: "todo" },
  };
}

export function setActionCreationSectionStatus(
  state: ActionCreationSectionState,
  section: ActionCreationSectionId,
  status: ActionCreationSectionStatus,
): ActionCreationSectionState {
  return { ...state, statuses: { ...state.statuses, [section]: status } };
}

export function loadActionCreationSectionState(): ActionCreationSectionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ActionCreationSectionState>;
      if (
        parsed.schemaVersion === "action-creation-sections-v2" &&
        parsed.statuses &&
        ACTION_CREATION_SECTIONS.includes(parsed.activeSection as ActionCreationSectionId)
      ) return parsed as ActionCreationSectionState;
    }

    const v1Raw = window.localStorage.getItem(V1_STORAGE_KEY);
    if (v1Raw) {
      const migrated = migrateV1ActionCreationSectionState(JSON.parse(v1Raw) as V1ActionCreationSectionState);
      saveActionCreationSectionState(migrated);
      return migrated;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return null;
    const migrated = migrateLegacyActionWorkflowState(JSON.parse(legacyRaw) as LegacyActionWorkflowState);
    saveActionCreationSectionState(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function saveActionCreationSectionState(state: ActionCreationSectionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The server-side action and draft remain canonical when local storage is unavailable.
  }
}
