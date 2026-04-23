import type { ActionStatus } from "@/lib/actions/types";
import type { ReportScopeKind } from "@/lib/reports/scope";

export function buildExportQuery(params: {
  status: ActionStatus | "all";
  days: number;
  limit: number;
  scopeKind: ReportScopeKind;
  scopeValue: string;
  association: string | "all";
}): string {
  const query = new URLSearchParams();
  query.set("days", String(params.days));
  query.set("limit", String(params.limit));
  query.set("types", "all");
  if (params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.scopeKind !== "global" && params.scopeValue.trim().length > 0) {
    query.set("scopeKind", params.scopeKind);
    query.set("scopeValue", params.scopeValue.trim());
  } else if (params.association !== "all") {
    query.set("association", params.association);
  }
  return query.toString();
}

export async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function parseAdminApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const normalized = body as {
    error?: unknown;
    message?: unknown;
    code?: unknown;
    hint?: unknown;
    operationId?: unknown;
  };
  const message =
    typeof normalized.error === "string"
      ? normalized.error
      : typeof normalized.message === "string"
        ? normalized.message
        : fallback;
  const code = typeof normalized.code === "string" ? normalized.code : null;
  const hint = typeof normalized.hint === "string" ? normalized.hint : null;
  const operationId =
    typeof normalized.operationId === "string" ? normalized.operationId : null;

  const parts = [message];
  if (code) parts.push(`[${code}]`);
  if (hint) parts.push(`Conseil: ${hint}`);
  if (operationId) parts.push(`Op: ${operationId}`);
  return parts.join(" | ");
}

export function parseImportPayload(importPayload: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(importPayload);
  } catch {
    throw new Error("Le JSON saisi est invalide.");
  }

  return Array.isArray(parsed) ? { items: parsed } : parsed;
}
