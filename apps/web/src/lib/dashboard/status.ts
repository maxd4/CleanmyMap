export type UptimePayload = {
  status: "ok" | "degraded";
  criticalStatus: "ok" | "degraded";
  optionalStatus: "ok" | "warning";
  criticalConfiguredCount: number;
  criticalAlertCount: number;
  optionalConfiguredCount: number;
  optionalAlertCount: number;
  timestamp: string;
};

export type ServiceStatusInfo = {
  state: "ready" | "missing" | "defer" | "external";
  label: string;
  description: string;
  category: "critical" | "optional" | "external";
  severity?: "ok" | "warning" | "critical";
  statusMessage?: string;
};

export type ServicesPayload = {
  status: "ok" | "degraded";
  services: Record<string, ServiceStatusInfo>;
  missing: string[];
  summary?: {
    globalState: "ok" | "degraded";
    criticalReadyCount: number;
    criticalAlertCount: number;
    optionalAlertCount: number;
    externalTrackedCount: number;
    generatedAt: string;
  };
  timeline?: Array<{
    id: string;
    service: string;
    severity: "warning" | "critical";
    title: string;
    detail: string;
    happenedAt: string;
  }>;
  timestamp: string;
};

export type DashboardHealthSummary = {
  state: "healthy" | "degraded";
  criticalConfiguredCount: number;
  criticalAlertCount: number;
  optionalConfiguredCount: number;
  optionalAlertCount: number;
  criticalStatus: "ok" | "degraded";
  optionalStatus: "ok" | "warning";
};

export function summarizeUptime(
  payload: UptimePayload,
): DashboardHealthSummary {
  return {
    state: payload.criticalStatus === "ok" ? "healthy" : "degraded",
    criticalConfiguredCount: payload.criticalConfiguredCount,
    criticalAlertCount: payload.criticalAlertCount,
    optionalConfiguredCount: payload.optionalConfiguredCount,
    optionalAlertCount: payload.optionalAlertCount,
    criticalStatus: payload.criticalStatus,
    optionalStatus: payload.optionalStatus,
  };
}

export function serviceLevelLabel(raw: string): "ok" | "warning" {
  return raw === "ready" || raw === "add" || raw === "add_external"
    ? "ok"
    : "warning";
}
