import { readLocalStorageJson, writeLocalStorageJson } from "./storage/local-storage";

export const FEEDBACK_DISCOVERY_STORAGE_KEY = "cleanmymap_feedback_discovery_v1";
export const FEEDBACK_DISCOVERY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export type FeedbackDiscoveryState = {
  firstShownAt?: string;
  lastShownAt?: string;
  disabled?: boolean;
};

export type FeedbackDiscoveryVisibility = "initial" | "reminder";

let fallbackState: FeedbackDiscoveryState | null = null;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFeedbackDiscoveryState(value: unknown): value is FeedbackDiscoveryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.firstShownAt === undefined || isIsoDate(record.firstShownAt)) &&
    (record.lastShownAt === undefined || isIsoDate(record.lastShownAt)) &&
    (record.disabled === undefined || typeof record.disabled === "boolean")
  );
}

export function readFeedbackDiscoveryState(): FeedbackDiscoveryState | null {
  const stored = readLocalStorageJson(
    FEEDBACK_DISCOVERY_STORAGE_KEY,
    isFeedbackDiscoveryState,
  );
  return stored ?? fallbackState;
}

function writeFeedbackDiscoveryState(state: FeedbackDiscoveryState): void {
  fallbackState = state;
  writeLocalStorageJson(FEEDBACK_DISCOVERY_STORAGE_KEY, state);
}

export function resolveFeedbackDiscoveryVisibility(
  state: FeedbackDiscoveryState | null,
  now = Date.now(),
): FeedbackDiscoveryVisibility | null {
  if (state?.disabled) {
    return null;
  }

  if (!state?.firstShownAt) {
    return "initial";
  }

  if (!state.lastShownAt) {
    return "reminder";
  }

  const lastShownAt = Date.parse(state.lastShownAt);
  return Number.isFinite(lastShownAt) && now - lastShownAt >= FEEDBACK_DISCOVERY_INTERVAL_MS
    ? "reminder"
    : null;
}

export function markFeedbackDiscoveryShown(now = new Date()): FeedbackDiscoveryState {
  const current = readFeedbackDiscoveryState();
  const timestamp = now.toISOString();
  const next: FeedbackDiscoveryState = {
    ...current,
    firstShownAt: current?.firstShownAt ?? timestamp,
    lastShownAt: timestamp,
  };
  writeFeedbackDiscoveryState(next);
  return next;
}

export function disableFeedbackDiscovery(): FeedbackDiscoveryState {
  const next: FeedbackDiscoveryState = {
    ...readFeedbackDiscoveryState(),
    disabled: true,
  };
  writeFeedbackDiscoveryState(next);
  return next;
}

export function isFeedbackDiscoveryPathEligible(pathname: string): boolean {
  return pathname !== "/onboarding" && !pathname.startsWith("/onboarding/") && !pathname.startsWith("/sections/feedback");
}
