import type { ActionSubmissionMode } from "@/lib/actions/types";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

type FunnelStep = "view_new" | "page_view" | "start_form" | "submit_success";

type FunnelEventPayload = {
  at: string;
  sessionId: string;
  step: FunnelStep;
  mode: ActionSubmissionMode;
  meta?: Record<string, unknown>;
};

const SESSION_KEY = "cleanmymap.funnel.session_id";
const PAGEVIEW_QUEUE_STORAGE_KEY = "cleanmymap.funnel.pageview_queue";
const PAGEVIEW_QUEUE_FLUSH_DELAY_MS = 10_000;
const PAGEVIEW_QUEUE_MAX_AGE_MS = 30 * 60 * 1000;

let pageviewFlushTimer: ReturnType<typeof setTimeout> | null = null;
let pageviewFlushListenersRegistered = false;

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined";
}

function getSessionId(): string {
  if (!canUseBrowserStorage()) {
    return "server-session";
  }

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated = globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
  window.sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

function readQueuedPageviews(): FunnelEventPayload[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(PAGEVIEW_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.reduce<FunnelEventPayload[]>((acc, entry) => {
      if (!entry || typeof entry !== "object") {
        return acc;
      }

      const record = entry as Partial<FunnelEventPayload>;
      if (
        typeof record.at === "string" &&
        typeof record.sessionId === "string" &&
        typeof record.step === "string" &&
        typeof record.mode === "string"
      ) {
        acc.push({
          at: record.at,
          sessionId: record.sessionId,
          step: record.step as FunnelStep,
          mode: record.mode as ActionSubmissionMode,
          meta:
            record.meta && typeof record.meta === "object"
              ? (record.meta as Record<string, unknown>)
              : undefined,
        });
      }

      return acc;
    }, []);
  } catch {
    return [];
  }
}

function writeQueuedPageviews(queuedPageviews: FunnelEventPayload[]): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PAGEVIEW_QUEUE_STORAGE_KEY,
      JSON.stringify(queuedPageviews),
    );
  } catch {
    // Ignore storage failures and keep the tracker best-effort.
  }
}

function clearQueuedPageviews(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(PAGEVIEW_QUEUE_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep the tracker best-effort.
  }
}

function pruneQueuedPageviews(
  queuedPageviews: FunnelEventPayload[],
): FunnelEventPayload[] {
  const cutoff = Date.now() - PAGEVIEW_QUEUE_MAX_AGE_MS;
  return queuedPageviews.filter((entry) => {
    const atMs = Date.parse(entry.at);
    return Number.isFinite(atMs) && atMs >= cutoff;
  });
}

function clearPageviewFlushTimer(): void {
  if (pageviewFlushTimer === null) {
    return;
  }

  clearTimeout(pageviewFlushTimer);
  pageviewFlushTimer = null;
}

function schedulePageviewFlush(): void {
  if (!canUseBrowserStorage() || pageviewFlushTimer !== null) {
    return;
  }

  pageviewFlushTimer = setTimeout(() => {
    pageviewFlushTimer = null;
    void flushQueuedPageviews({ preferBeacon: false });
  }, PAGEVIEW_QUEUE_FLUSH_DELAY_MS);
}

function registerPageviewFlushListeners(): void {
  if (!canUseBrowserStorage() || pageviewFlushListenersRegistered) {
    return;
  }

  const flushOnHide = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void flushQueuedPageviews({ preferBeacon: true });
    }
  };

  const flushOnPageHide = () => {
    void flushQueuedPageviews({ preferBeacon: true });
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", flushOnHide);
  }
  window.addEventListener("pagehide", flushOnPageHide);
  pageviewFlushListenersRegistered = true;
}

function serializeFunnelPayload(
  events: FunnelEventPayload[],
): string {
  return JSON.stringify({
    sessionId: events[0]?.sessionId ?? getSessionId(),
    events,
  });
}

async function sendQueuedPageviews(events: FunnelEventPayload[], preferBeacon: boolean): Promise<boolean> {
  const payload = serializeFunnelPayload(events);

  if (
    preferBeacon &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    return navigator.sendBeacon(
      "/api/analytics/funnel",
      new Blob([payload], { type: "application/json" }),
    );
  }

  try {
    const response = await fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function flushQueuedPageviews(
  options: { preferBeacon: boolean },
): Promise<void> {
  if (!canUseBrowserStorage()) {
    return;
  }

  const queuedPageviews = pruneQueuedPageviews(readQueuedPageviews());
  if (queuedPageviews.length === 0) {
    clearPageviewFlushTimer();
    clearQueuedPageviews();
    return;
  }

  const sent = await sendQueuedPageviews(queuedPageviews, options.preferBeacon);
  if (sent) {
    clearQueuedPageviews();
    clearPageviewFlushTimer();
  }
}

function queuePageview(event: FunnelEventPayload): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  const queuedPageviews = pruneQueuedPageviews(readQueuedPageviews());
  queuedPageviews.push(event);
  writeQueuedPageviews(queuedPageviews);
  registerPageviewFlushListeners();
  schedulePageviewFlush();
}

async function sendImmediateFunnelEvent(event: FunnelEventPayload): Promise<void> {
  try {
    await fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // silent
  }
}

function buildFunnelEvent(
  step: FunnelStep,
  mode: ActionSubmissionMode,
  meta?: Record<string, unknown>,
): FunnelEventPayload {
  return {
    at: new Date().toISOString(),
    sessionId: getSessionId(),
    step,
    mode,
    meta,
  };
}

export async function trackFunnel(
  step: FunnelStep,
  mode: ActionSubmissionMode,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!hasAnalyticsConsent()) {
    return;
  }

  const event = buildFunnelEvent(step, mode, meta);

  try {
    if (step === "page_view") {
      queuePageview(event);
      return;
    }

    await sendImmediateFunnelEvent(event);
  } catch {
    // silent
  }
}
