import {
  isRecord,
  readLocalStorageJson,
  writeLocalStorageJson,
} from "@/lib/storage/local-storage";

export type LearnPageId = "hub" | "comprendre" | "sentrainer" | "bonnes-pratiques" | "ressources";

export type LearnProgressState = {
  lastPage: LearnPageId;
  visitedPages: LearnPageId[];
  lastUpdatedAt: string;
};

const LEARN_PROGRESS_KEY = "cleanmymap.learn.progress";

const DEFAULT_VISITED_PAGES: LearnPageId[] = ["hub"];

export const LEARN_PROGRESS_ORDER: LearnPageId[] = [
  "hub",
  "comprendre",
  "sentrainer",
  "bonnes-pratiques",
  "ressources",
];

function isLearnPageId(value: unknown): value is LearnPageId {
  return typeof value === "string" && LEARN_PROGRESS_ORDER.includes(value as LearnPageId);
}

function isLearnProgressState(value: unknown): value is LearnProgressState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isLearnPageId(value["lastPage"]) &&
    Array.isArray(value["visitedPages"]) &&
    value["visitedPages"].every(isLearnPageId) &&
    typeof value["lastUpdatedAt"] === "string"
  );
}

export function readLearnProgressState(): LearnProgressState | null {
  const state = readLocalStorageJson(LEARN_PROGRESS_KEY, isLearnProgressState);
  if (!state) {
    return null;
  }

  const visitedPages = state.visitedPages.length > 0 ? state.visitedPages : [state.lastPage];
  return {
    ...state,
    visitedPages,
  };
}

export function persistLearnProgressState(state: LearnProgressState): void {
  void writeLocalStorageJson(LEARN_PROGRESS_KEY, state);
}

export function recordLearnPageVisit(pageId: LearnPageId): LearnProgressState {
  const existing = readLearnProgressState();
  const visitedPages = existing
    ? Array.from(new Set([...existing.visitedPages, pageId]))
    : [...DEFAULT_VISITED_PAGES, pageId];

  const state: LearnProgressState = {
    lastPage: pageId,
    visitedPages,
    lastUpdatedAt: new Date().toISOString(),
  };

  persistLearnProgressState(state);
  return state;
}
