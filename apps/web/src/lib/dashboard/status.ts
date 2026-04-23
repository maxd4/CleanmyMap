export type UptimeCheckState =
  | "ok"
  | "configured"
  | "missing"
  | "degraded"
  | "warning";

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

export type ServiceStatusInfo = {
  state: "ready" | "missing" | "defer" | "external";
  label: string;
  description: string;
  category: "critical" | "optional" | "external";
};

export type ServicesPayload = {
  status: "ok";
  services: Record<string, ServiceStatusInfo>;
  missing: string[];
  timestamp: string;
};

export type DashboardHealthSummary = {
  state: "healthy" | "degraded";
  configuredCount: number;
  missingCount: number;
  warningCount: number;
  criticalConfiguredCount: number;
  criticalMissingCount: number;
  optionalConfiguredCount: number;
  optionalWarningCount: number;
  criticalStatus: "ok" | "degraded";
  optionalStatus: "ok" | "warning";
};

function isConfiguredState(state: UptimeCheckState): boolean {
  return state === "configured" || state === "ok";
}

export function summarizeUptime(
  payload: UptimePayload,
): DashboardHealthSummary {
  const states = Object.values(payload.checks ?? {});
  const criticalStates = Object.values(payload.categories?.critical ?? {});
  const optionalStates = Object.values(payload.categories?.optional ?? {});

  const configuredCount = states.filter((item) =>
    isConfiguredState(item),
  ).length;
  const missingCount = states.filter(
    (item) => item === "missing" || item === "degraded",
  ).length;
  const warningCount = states.filter(
    (item) =>
      !isConfiguredState(item) && item !== "missing" && item !== "degraded",
  ).length;

  const criticalConfiguredCount = criticalStates.filter((item) =>
    isConfiguredState(item),
  ).length;
  const criticalMissingCount = criticalStates.filter(
    (item) => !isConfiguredState(item),
  ).length;
  const optionalConfiguredCount = optionalStates.filter((item) =>
    isConfiguredState(item),
  ).length;
  const optionalWarningCount = optionalStates.filter(
    (item) => !isConfiguredState(item),
  ).length;

  const criticalStatus = payload.criticalStatus ?? payload.status;
  const optionalStatus =
    payload.optionalStatus ?? (optionalWarningCount > 0 ? "warning" : "ok");
  const state = criticalStatus === "ok" ? "healthy" : "degraded";

  return {
    state,
    configuredCount,
    missingCount,
    warningCount,
    criticalConfiguredCount,
    criticalMissingCount,
    optionalConfiguredCount,
    optionalWarningCount,
    criticalStatus,
    optionalStatus,
  };
}

export function serviceLevelLabel(raw: string): "ok" | "warning" {
  return raw === "ready" || raw === "add" || raw === "add_external"
    ? "ok"
    : "warning";
}
