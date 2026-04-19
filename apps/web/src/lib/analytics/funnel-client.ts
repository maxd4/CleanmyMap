import type { ActionSubmissionMode } from "@/lib/actions/types";

type FunnelStep = "view_new" | "start_form" | "submit_success";

const SESSION_KEY = "cleanmymap.funnel.session_id";

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const generated = self.crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, generated);
  return generated;
}

export async function trackFunnel(
  step: FunnelStep,
  mode: ActionSubmissionMode,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        step,
        mode,
        meta,
      }),
      keepalive: true,
    });
  } catch {
    // silent
  }
}
