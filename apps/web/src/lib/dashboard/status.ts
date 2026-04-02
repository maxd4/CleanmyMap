export type UptimeCheckState = "ok" | "configured" | "missing" | "degraded";

export type UptimePayload = {
  status: "ok" | "degraded";
  checks: Record<string, UptimeCheckState>;
  timestamp: string;
};

export type ServicesPayload = {
  status: "ok";
  services: Record<string, string>;
  timestamp: string;
};

export type DashboardHealthSummary = {
  state: "healthy" | "degraded";
  configuredCount: number;
  missingCount: number;
};

export function summarizeUptime(payload: UptimePayload): DashboardHealthSummary {
  const states = Object.values(payload.checks);
  const configuredCount = states.filter((item) => item === "configured" || item === "ok").length;
  const missingCount = states.filter((item) => item === "missing" || item === "degraded").length;
  const state = payload.status === "ok" && missingCount === 0 ? "healthy" : "degraded";
  return {
    state,
    configuredCount,
    missingCount,
  };
}

export function serviceLevelLabel(raw: string): "ok" | "warning" {
  return raw === "add" || raw === "add_external" ? "ok" : "warning";
}
