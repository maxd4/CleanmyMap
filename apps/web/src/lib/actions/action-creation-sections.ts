export const ACTION_CREATION_SECTIONS = [
  "essentiel",
  "terrain",
  "equipe",
  "verification",
] as const;

export type ActionCreationSectionId = (typeof ACTION_CREATION_SECTIONS)[number];
export type ActionCreationSectionStatus = "todo" | "review" | "done";

export type ActionCreationSectionState = {
  schemaVersion: "action-creation-sections-v1";
  actionId: string | null;
  activeSection: ActionCreationSectionId;
  statuses: Record<ActionCreationSectionId, ActionCreationSectionStatus>;
};

export const ACTION_CREATION_SECTION_LABELS: Record<
  ActionCreationSectionId,
  { fr: string; en: string; description: { fr: string; en: string } }
> = {
  essentiel: {
    fr: "Essentiel",
    en: "Essentials",
    description: {
      fr: "Identité, objectif, lieu, date et organisateur.",
      en: "Identity, objective, place, date and organizer.",
    },
  },
  terrain: {
    fr: "Terrain",
    en: "Field",
    description: {
      fr: "Carte, itinéraire optionnel et météo.",
      en: "Map, optional route and weather.",
    },
  },
  equipe: {
    fr: "Équipe et logistique",
    en: "Team and logistics",
    description: {
      fr: "Inscriptions, matériel, consignes et accessibilité.",
      en: "Registration, equipment, guidance and accessibility.",
    },
  },
  verification: {
    fr: "Vérifier et publier",
    en: "Review and publish",
    description: {
      fr: "Formalités, aperçu, contrôles et publication.",
      en: "Formalities, preview, checks and publication.",
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

const STORAGE_KEY = "cleanmymap.action-creation-sections.v1";
const LEGACY_STORAGE_KEY = "cleanmymap.action-workflow.v1";

type LegacyActionWorkflowStatus = "todo" | "in_progress" | "done" | "review";
type LegacyActionWorkflowState = {
  schemaVersion?: string;
  actionId?: string | null;
  activeStep?: string;
  statuses?: Partial<Record<"itineraire" | "paris" | "preparation" | "preformulaire", LegacyActionWorkflowStatus>>;
};

function sectionFromLegacyStep(value: unknown): ActionCreationSectionId {
  if (value === "itineraire" || value === "preparation") return "terrain";
  if (value === "paris") return "verification";
  return "essentiel";
}

function sectionStatusFromLegacyStatus(status: LegacyActionWorkflowStatus | undefined): ActionCreationSectionStatus {
  if (status === "done") return "done";
  if (status === "review" || status === "in_progress") return "review";
  return "todo";
}

function mergeLegacyStatuses(
  first: LegacyActionWorkflowStatus | undefined,
  second: LegacyActionWorkflowStatus | undefined,
): ActionCreationSectionStatus {
  const statuses = [sectionStatusFromLegacyStatus(first), sectionStatusFromLegacyStatus(second)];
  if (statuses.includes("review")) return "review";
  if (statuses.every((status) => status === "done")) return "done";
  return "todo";
}

export function migrateLegacyActionWorkflowState(
  legacy: LegacyActionWorkflowState,
): ActionCreationSectionState {
  return {
    ...createActionCreationSectionState(
      legacy.actionId ?? null,
      sectionFromLegacyStep(legacy.activeStep),
    ),
    statuses: {
      essentiel: sectionStatusFromLegacyStatus(legacy.statuses?.preformulaire),
      terrain: mergeLegacyStatuses(legacy.statuses?.itineraire, legacy.statuses?.preparation),
      equipe: "todo",
      verification: sectionStatusFromLegacyStatus(legacy.statuses?.paris),
    },
  };
}

export function createActionCreationSectionState(
  actionId: string | null = null,
  activeSection: ActionCreationSectionId = "essentiel",
): ActionCreationSectionState {
  return {
    schemaVersion: "action-creation-sections-v1",
    actionId,
    activeSection,
    statuses: {
      essentiel: "todo",
      terrain: "todo",
      equipe: "todo",
      verification: "todo",
    },
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
        parsed.schemaVersion === "action-creation-sections-v1" &&
        parsed.statuses &&
        ACTION_CREATION_SECTIONS.includes(parsed.activeSection as ActionCreationSectionId)
      ) {
        return parsed as ActionCreationSectionState;
      }
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
