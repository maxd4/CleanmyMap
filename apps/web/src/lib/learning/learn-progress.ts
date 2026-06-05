import {
  isRecord,
  readLocalStorageJson,
  writeLocalStorageJson,
} from "@/lib/storage/local-storage";

export type LearnPageId = "comprendre" | "sentrainer" | "bonnes-pratiques";
type LegacyLearnPageId = "hub" | "ressources";
type StoredLearnPageId = LearnPageId | LegacyLearnPageId;

export type LearnProgressState = {
  lastPage: LearnPageId;
  visitedPages: LearnPageId[];
  lastUpdatedAt: string;
};

const LEARN_PROGRESS_KEY = "cleanmymap.learn.progress";

const LEGACY_PAGE_MIGRATIONS: Record<LegacyLearnPageId, LearnPageId> = {
  hub: "comprendre",
  ressources: "bonnes-pratiques",
};

export const LEARN_PROGRESS_ORDER: LearnPageId[] = [
  "comprendre",
  "sentrainer",
  "bonnes-pratiques",
];

function isStoredLearnPageId(value: unknown): value is StoredLearnPageId {
  return (
    typeof value === "string" &&
    (LEARN_PROGRESS_ORDER.includes(value as LearnPageId) || value in LEGACY_PAGE_MIGRATIONS)
  );
}

function normalizeLearnPageId(value: StoredLearnPageId): LearnPageId {
  return value in LEGACY_PAGE_MIGRATIONS
    ? LEGACY_PAGE_MIGRATIONS[value as LegacyLearnPageId]
    : (value as LearnPageId);
}

function normalizeVisitedPages(values: StoredLearnPageId[]): LearnPageId[] {
  return Array.from(new Set(values.map(normalizeLearnPageId)));
}

export function normalizeLearnProgressState(value: unknown): LearnProgressState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isStoredLearnPageId(value["lastPage"]) ||
    !Array.isArray(value["visitedPages"]) ||
    !value["visitedPages"].every(isStoredLearnPageId) ||
    typeof value["lastUpdatedAt"] !== "string"
  ) {
    return null;
  }

  const lastPage = normalizeLearnPageId(value["lastPage"]);
  const visitedPages = normalizeVisitedPages(value["visitedPages"]);
  const normalizedVisitedPages = visitedPages.length > 0 ? visitedPages : [lastPage];

  return {
    lastPage,
    visitedPages: normalizedVisitedPages,
    lastUpdatedAt: value["lastUpdatedAt"],
  };
}

function isLearnProgressState(value: unknown): value is LearnProgressState {
  const normalized = normalizeLearnProgressState(value);
  return Boolean(normalized);
}

export function readLearnProgressState(): LearnProgressState | null {
  const state = readLocalStorageJson(LEARN_PROGRESS_KEY, isLearnProgressState);
  if (!state) {
    return null;
  }

  const normalized = normalizeLearnProgressState(state);
  if (!normalized) {
    return null;
  }

  if (
    normalized.lastPage !== state.lastPage ||
    normalized.visitedPages.length !== state.visitedPages.length ||
    normalized.visitedPages.some((page, index) => page !== state.visitedPages[index])
  ) {
    persistLearnProgressState(normalized);
  }

  return {
    ...normalized,
  };
}

export function persistLearnProgressState(state: LearnProgressState): void {
  void writeLocalStorageJson(LEARN_PROGRESS_KEY, state);
}

export function recordLearnPageVisit(pageId: LearnPageId): LearnProgressState {
  const existing = readLearnProgressState();
  const visitedPages = existing
    ? Array.from(new Set([...existing.visitedPages, pageId]))
    : [pageId];

  const state: LearnProgressState = {
    lastPage: pageId,
    visitedPages,
    lastUpdatedAt: new Date().toISOString(),
  };

  persistLearnProgressState(state);
  return state;
}
