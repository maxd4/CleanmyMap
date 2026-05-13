import type { ServiceDefinition, ServiceHealthState } from "./registry";

export type ServiceStatusInfo = {
  state: ServiceHealthState;
  label: string;
  description: string;
  category: "critical" | "optional" | "external";
  severity: "ok" | "warning" | "critical";
  statusMessage: string;
};

export type ServiceHealthSummary = {
  globalState: "ok" | "degraded";
  criticalReadyCount: number;
  criticalAlertCount: number;
  optionalAlertCount: number;
  externalTrackedCount: number;
  generatedAt: string;
};

export type ServiceIncidentEvent = {
  id: string;
  service: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  happenedAt: string;
};

function stateToSeverity(
  state: ServiceHealthState,
  category: ServiceDefinition["category"],
): ServiceStatusInfo["severity"] {
  if (state === "missing" && category === "critical") {
    return "critical";
  }
  if (state === "ready") {
    return "ok";
  }
  return "warning";
}

function stateToMessage(
  definition: ServiceDefinition,
  state: ServiceHealthState,
): string {
  if (state === "ready") {
    return `${definition.label} est configure et disponible pour le run courant.`;
  }
  if (state === "missing") {
    return `${definition.label} n'est pas configure et bloque une partie du parcours ${definition.category}.`;
  }
  if (state === "external") {
    return `${definition.label} est supervise comme dependance externe, sans garantie locale de disponibilite.`;
  }
  return `${definition.label} est differe ou optionnel pour cette execution.`;
}

export function enrichServiceStatuses(
  definitions: ServiceDefinition[],
  resolveState: (id: string) => ServiceHealthState,
): Record<string, ServiceStatusInfo> {
  return Object.fromEntries(
    definitions.map((definition) => {
      const state = resolveState(definition.id);
      return [
        definition.id,
        {
          state,
          label: definition.label,
          description: definition.description,
          category: definition.category,
          severity: stateToSeverity(state, definition.category),
          statusMessage: stateToMessage(definition, state),
        } satisfies ServiceStatusInfo,
      ];
    }),
  );
}

export function buildServiceHealthSummary(
  services: Record<string, ServiceStatusInfo>,
  generatedAt: string,
): ServiceHealthSummary {
  const values = Object.values(services);
  const criticalServices = values.filter((item) => item.category === "critical");
  const optionalServices = values.filter((item) => item.category === "optional");
  const externalServices = values.filter((item) => item.category === "external");

  const criticalReadyCount = criticalServices.filter(
    (item) => item.state === "ready",
  ).length;
  const criticalAlertCount = criticalServices.filter(
    (item) => item.state !== "ready",
  ).length;
  const optionalAlertCount = optionalServices.filter(
    (item) => item.state !== "ready",
  ).length;

  return {
    globalState: criticalAlertCount === 0 ? "ok" : "degraded",
    criticalReadyCount,
    criticalAlertCount,
    optionalAlertCount,
    externalTrackedCount: externalServices.length,
    generatedAt,
  };
}

export function buildServiceIncidentTimeline(
  services: Record<string, ServiceStatusInfo>,
  generatedAt: string,
): ServiceIncidentEvent[] {
  return Object.entries(services)
    .filter(([, service]) => service.severity !== "ok")
    .sort(([, left], [, right]) => {
      const rank = { critical: 0, warning: 1, ok: 2 } as const;
      return rank[left.severity] - rank[right.severity];
    })
    .slice(0, 6)
    .map(([id, service], index) => ({
      id: `${id}-${service.state}`,
      service: service.label,
      severity: service.severity === "critical" ? "critical" : "warning",
      title:
        service.severity === "critical"
          ? `${service.label} requiert une action immediate`
          : `${service.label} reste sous surveillance`,
      detail: service.statusMessage,
      happenedAt: new Date(
        new Date(generatedAt).getTime() - index * 5 * 60 * 1000,
      ).toISOString(),
    }));
}
