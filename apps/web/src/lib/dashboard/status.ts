export type UptimeCheckState = "ok" | "configured" | "missing" | "degraded" | "warning";

export type UptimePayload = {
  status: "ok" | "degraded";
  checks: Record<string, UptimeCheckState>;
  criticalStatus?: "ok" | "degraded";
  optionalStatus?: "ok" | "warning";
  categories?: {
    critical?: Record<string, UptimeCheckState>;
    optional?: Record<string, UptimeCheckState>;
  };
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
  warningCount: number;
  criticalStatus: "ok" | "degraded";
  optionalStatus: "ok" | "warning";
};

export function summarizeUptime(payload: UptimePayload): DashboardHealthSummary {
  const states = Object.values(payload.checks ?? {});
  const configuredCount = states.filter((item) => item === "configured" || item === "ok").length;
  const missingCount = states.filter((item) => item === "missing" || item === "degraded").length;
  const warningCount = states.filter((item) => item === "warning").length;

  const criticalStatus = payload.criticalStatus ?? payload.status;
  const optionalStatus = payload.optionalStatus ?? (warningCount > 0 ? "warning" : "ok");
  const state = criticalStatus === "ok" ? "healthy" : "degraded";

  return {
    state,
    configuredCount,
    missingCount,
    warningCount,
    criticalStatus,
    optionalStatus,
  };
}

export function serviceLevelLabel(raw: string): "ok" | "warning" {
  return raw === "add" || raw === "add_external" ? "ok" : "warning";
}
