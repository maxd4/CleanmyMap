import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { isActionRecord } from "./query";

const AUDIT_OPERATION_TYPES: readonly AdminOperationAuditEntry["operationType"][] = [
  "moderation",
  "import_dry_run",
  "import_confirm",
  "role_management",
  "admin_operation",
  "spogomi_team_name_rename",
];

function isAuditOperationType(value: unknown): value is AdminOperationAuditEntry["operationType"] {
  return typeof value === "string" && AUDIT_OPERATION_TYPES.some((type) => type === value);
}

function isAuditOutcome(value: unknown): value is AdminOperationAuditEntry["outcome"] {
  return value === "success" || value === "error";
}

function parseAuditEntry(value: unknown): AdminOperationAuditEntry | null {
  if (!isActionRecord(value) ||
    typeof value.operationId !== "string" ||
    typeof value.at !== "string" ||
    typeof value.actorUserId !== "string" ||
    !isAuditOperationType(value.operationType) ||
    !isAuditOutcome(value.outcome) ||
    !isActionRecord(value.details)) {
    return null;
  }
  if (value.actorLabel !== undefined && typeof value.actorLabel !== "string") return null;
  if (value.targetId !== undefined && typeof value.targetId !== "string") return null;
  return {
    operationId: value.operationId,
    at: value.at,
    actorUserId: value.actorUserId,
    ...(value.actorLabel === undefined ? {} : { actorLabel: value.actorLabel }),
    operationType: value.operationType,
    outcome: value.outcome,
    ...(value.targetId === undefined ? {} : { targetId: value.targetId }),
    details: value.details,
  };
}

function parseAuditResponse(body: unknown): { items?: AdminOperationAuditEntry[] } {
  if (!isActionRecord(body) || !Array.isArray(body.items)) return {};
  const items = body.items.map(parseAuditEntry);
  return items.every((item): item is AdminOperationAuditEntry => item !== null)
    ? { items }
    : {};
}

export async function fetchActionOperationAudit(
  actionId: string,
  limit = 25,
  fetchImpl: typeof fetch = fetch,
): Promise<{ items?: AdminOperationAuditEntry[] }> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const response = await fetchImpl(
    `/api/actions/${encodeURIComponent(actionId)}/audit?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const body: unknown = await response
    .json()
    .catch(() => null);
  if (!response.ok) {
    const message = isActionRecord(body) && typeof body.error === "string"
      ? body.error
      : "Journal indisponible.";
    throw new Error(message);
  }

  return parseAuditResponse(body);
}
