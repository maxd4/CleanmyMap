import type { ActionRecordType, ActionStatus } from "@/lib/actions/types";
import type { ReportScopeKind } from "@/lib/reports/scope";

export type ActionTypeFilter = ActionRecordType | "all" | ActionRecordType[];

export function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function serializeTypes(
  raw: ActionTypeFilter | undefined,
  fallback: ActionTypeFilter,
): string {
  const value = raw ?? fallback;
  if (value === "all") {
    return "all";
  }
  if (typeof value === "string") {
    return value;
  }
  const deduped = [...new Set(value)];
  return deduped.length === 0 ? "all" : deduped.join(",");
}

export function setScopeQueryParams(
  query: URLSearchParams,
  params: {
    association?: string | "all";
    scopeKind?: ReportScopeKind;
    scopeValue?: string | null;
  },
): void {
  if (params.scopeKind && params.scopeKind !== "global") {
    query.set("scopeKind", params.scopeKind);
    if (typeof params.scopeValue === "string" && params.scopeValue.trim()) {
      query.set("scopeValue", params.scopeValue.trim());
    }
    return;
  }

  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    query.set("association", params.association.trim());
  }
}

export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeQualityMin(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveMapStatus(
  status: ActionStatus | "all" | undefined,
): ActionStatus | null {
  if (!status || status === "all") {
    return null;
  }
  return status;
}

export function resolveMapQueryStatus(
  status: ActionStatus | "all" | undefined,
): ActionStatus | "all" {
  return status ?? "approved";
}
