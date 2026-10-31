/**
 * Service de journalisation des opérations d'administration.
 * PERMANENCE : Ces données doivent figurer dans Supabase (table `admin_operations_audit`) en production.
 * FALLBACK : Le fallback sur fichier local est toléré en développement mais éphémère sur Vercel.
 */
import { join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
  type LocalRecordStorePayload,
} from "@/lib/persistence/local-record-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type AdminAuditFilterQuery = {
  eq(column: string, value: unknown): AdminAuditQuery;
  gte(column: string, value: unknown): AdminAuditQuery;
  lte(column: string, value: unknown): AdminAuditQuery;
  or(filters: string): AdminAuditQuery;
};
type AdminAuditQuery = AdminAuditFilterQuery & {
  order(column: string, options: { ascending: boolean }): AdminAuditQuery;
  limit(count: number): Promise<{ error: { message: string } | null; data: unknown[] | null }>;
};

const AUDIT_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "admin_operations_audit.json",
);

type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

type AdminOperationAuditDbRow = {
  operation_id: string;
  at: string;
  actor_user_id: string;
  operation_type: AdminOperationAuditEntry["operationType"];
  outcome: AdminOperationAuditEntry["outcome"];
  target_id: string | null;
  target_user_id: string | null;
  details: Record<string, unknown>;
};

export type AdminOperationAuditEntry = {
  operationId: string;
  at: string;
  actorUserId: string;
  actorLabel?: string;
  operationType:
    | "moderation"
    | "import_dry_run"
    | "import_confirm"
    | "role_management"
    | "admin_operation"
    | "spogomi_team_name_rename";
  outcome: "success" | "error";
  targetId?: string;
  targetUserId?: string;
  details: Record<string, unknown>;
};

export type AdminOperationAuditFilters = {
  actorUserId?: string | null;
  operationType?: AdminOperationAuditEntry["operationType"] | null;
  operation?: string | null;
  outcome?: AdminOperationAuditEntry["outcome"] | null;
  targetId?: string | null;
  from?: string | null;
  to?: string | null;
  cursor?: string | null;
};

export type AdminOperationAuditPage = {
  items: AdminOperationAuditEntry[];
  hasMore: boolean;
  nextCursor: string | null;
};

type AuditStore = LocalRecordStorePayload<AdminOperationAuditEntry>;

const AUDIT_OPERATION_TYPES = [
  "moderation",
  "import_dry_run",
  "import_confirm",
  "role_management",
  "admin_operation",
  "spogomi_team_name_rename",
] as const;

function isAuditOperationType(
  value: unknown,
): value is AdminOperationAuditEntry["operationType"] {
  return (
    typeof value === "string" &&
    AUDIT_OPERATION_TYPES.includes(value as AdminOperationAuditEntry["operationType"])
  );
}

function isAuditOutcome(value: unknown): value is AdminOperationAuditEntry["outcome"] {
  return value === "success" || value === "error";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseProfileLookupRow(value: unknown): ProfileLookupRow | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (value.display_name !== null && value.display_name !== undefined && typeof value.display_name !== "string") return null;
  if (value.handle !== null && value.handle !== undefined && typeof value.handle !== "string") return null;
  return {
    id: value.id,
    display_name: value.display_name === undefined ? null : value.display_name,
    handle: value.handle === undefined ? null : value.handle,
  };
}

function parseAdminOperationAuditDbRow(value: unknown): AdminOperationAuditDbRow | null {
  if (!isRecord(value) || !isValidAdminOperationAuditDbRow(value)) return null;
  return {
    operation_id: value.operation_id,
    at: value.at,
    actor_user_id: value.actor_user_id,
    operation_type: value.operation_type,
    outcome: value.outcome,
    target_id: value.target_id === undefined ? null : value.target_id,
    target_user_id: value.target_user_id === undefined ? null : value.target_user_id,
    details: value.details,
  };
}

function isValidAdminOperationAuditDbRow(
  value: Record<string, unknown>,
): value is AdminOperationAuditDbRow {
  return (
    typeof value.operation_id === "string" &&
    typeof value.at === "string" &&
    typeof value.actor_user_id === "string" &&
    isAuditOperationType(value.operation_type) &&
    isAuditOutcome(value.outcome) &&
    (value.target_id === null ||
      value.target_id === undefined ||
      typeof value.target_id === "string") &&
    (value.target_user_id === null ||
      value.target_user_id === undefined ||
      typeof value.target_user_id === "string") &&
    isRecord(value.details)
  );
}

async function readStore(): Promise<AuditStore> {
  return readLocalRecordStore(AUDIT_FILE, normalizeAuditEntry);
}

async function writeStore(store: AuditStore): Promise<void> {
  await writeLocalRecordStore(AUDIT_FILE, store.records);
}

function normalizeAuditEntry(
  record: Record<string, unknown>,
): AdminOperationAuditEntry | null {
  const operationType = record.operationType;
  const outcome = record.outcome;
  if (
    typeof record.operationId !== "string" ||
    typeof record.at !== "string" ||
    typeof record.actorUserId !== "string" ||
    !isAuditOperationType(operationType) ||
    !isAuditOutcome(outcome) ||
    (record.targetId !== undefined && typeof record.targetId !== "string") ||
    (record.targetUserId !== undefined && typeof record.targetUserId !== "string") ||
    !isRecord(record.details)
  ) {
    return null;
  }

  if (record.actorLabel !== undefined && typeof record.actorLabel !== "string") {
    return null;
  }

  return record as unknown as AdminOperationAuditEntry;
}

function buildActorLabel(
  profile: ProfileLookupRow | undefined,
  actorUserId: string,
): string {
  const displayName = profile?.display_name?.trim() ?? "";
  const handle = profile?.handle?.trim() ?? "";

  if (displayName && handle) {
    return `${displayName} (@${handle})`;
  }
  if (displayName) {
    return displayName;
  }
  if (handle) {
    return `@${handle}`;
  }
  return actorUserId;
}

async function loadActorLabelsByUserId(
  actorUserIds: string[],
): Promise<Map<string, string>> {
  const uniqueActorIds = Array.from(
    new Set(actorUserIds.map((value) => value.trim()).filter(Boolean)),
  );

  const labels = new Map<string, string>();
  if (uniqueActorIds.length === 0) {
    return labels;
  }

  const supabase = getSupabaseServerClient(true);
  const result = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", uniqueActorIds)
    .limit(uniqueActorIds.length);

  if (result.error) {
    return labels;
  }

  const rawRows: unknown = result.data ?? [];
  if (!Array.isArray(rawRows)) return labels;
  for (const rawRow of rawRows) {
    const row = parseProfileLookupRow(rawRow);
    if (row) labels.set(row.id, buildActorLabel(row, row.id));
  }

  return labels;
}

async function normalizeSupabaseAuditRows(
  rawRows: unknown,
): Promise<AdminOperationAuditEntry[]> {
  if (!Array.isArray(rawRows)) {
    throw new Error("Admin audit returned an invalid row collection.");
  }

  const rows = rawRows.map(parseAdminOperationAuditDbRow);
  if (rows.some((row) => row === null)) {
    throw new Error("Admin audit returned an invalid persisted row.");
  }

  const parsedRows = rows as AdminOperationAuditDbRow[];
  const actorLabels = await loadActorLabelsByUserId(
    parsedRows.map((row) => row.actor_user_id),
  );

  return parsedRows.map((row) => ({
    operationId: row.operation_id,
    at: row.at,
    actorUserId: row.actor_user_id,
    actorLabel: actorLabels.get(row.actor_user_id) ?? buildActorLabel(undefined, row.actor_user_id),
    operationType: row.operation_type,
    outcome: row.outcome,
    targetId: row.target_id ?? undefined,
    targetUserId: row.target_user_id ?? undefined,
    details: row.details,
  }));
}

function applyAdminAuditFilters(
  query: AdminAuditQuery,
  filters: AdminOperationAuditFilters,
  cursor: { at: string; operationId: string } | null,
): AdminAuditQuery {
  let filtered = query;
  if (filters.actorUserId?.trim()) filtered = filtered.eq("actor_user_id", filters.actorUserId.trim());
  if (filters.operationType) filtered = filtered.eq("operation_type", filters.operationType);
  if (filters.operation) filtered = filtered.eq("details->>operation", filters.operation.trim());
  if (filters.outcome) filtered = filtered.eq("outcome", filters.outcome);
  if (filters.targetId?.trim()) filtered = filtered.eq("target_id", filters.targetId.trim());
  if (filters.from) filtered = filtered.gte("at", filters.from);
  if (filters.to) filtered = filtered.lte("at", filters.to);
  if (cursor) filtered = filtered.or(`at.lt.${cursor.at},and(at.eq.${cursor.at},operation_id.lt.${cursor.operationId})`);
  return filtered;
}

async function tryListSupabaseAuditPage(
  normalizedLimit: number,
  filters: AdminOperationAuditFilters,
  cursor: { at: string; operationId: string } | null,
): Promise<AdminOperationAuditPage | null> {
  try {
    const supabase = getSupabaseServerClient(true);
    const query = supabase
      .from("admin_operations_audit")
      .select("operation_id, at, actor_user_id, operation_type, outcome, target_id, target_user_id, details") as unknown as AdminAuditQuery;
    const filteredQuery = applyAdminAuditFilters(query, filters, cursor);
    const result = await filteredQuery.order("at", { ascending: false }).order("operation_id", { ascending: false }).limit(normalizedLimit + 1);
    if (result.error) {
      if (!allowLocalFileStoreFallback()) throw new Error(result.error.message);
      return null;
    }
    const rows = await normalizeSupabaseAuditRows(result.data ?? []);
    const hasMore = rows.length > normalizedLimit;
    const items = rows.slice(0, normalizedLimit);
    const last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore && last ? encodeAuditCursor({ at: last.at, operationId: last.operationId }) : null };
  } catch (error) {
    if (!allowLocalFileStoreFallback()) throw error;
    return null;
  }
}

async function listLocalAuditPage(
  normalizedLimit: number,
  filters: AdminOperationAuditFilters,
  cursor: { at: string; operationId: string } | null,
): Promise<AdminOperationAuditPage> {
  const store = await readStore();
  const records = store.records
    .filter((record) => matchesAuditFilters(record, filters))
    .filter((record) => !cursor || record.at < cursor.at || (record.at === cursor.at && record.operationId < cursor.operationId))
    .sort((left, right) => right.at.localeCompare(left.at) || right.operationId.localeCompare(left.operationId));
  const hasMore = records.length > normalizedLimit;
  const items = records.slice(0, normalizedLimit).map((record) => ({ ...record, actorLabel: record.actorLabel ?? buildActorLabel(undefined, record.actorUserId) }));
  const last = items.at(-1);
  return { items, hasMore, nextCursor: hasMore && last ? encodeAuditCursor({ at: last.at, operationId: last.operationId }) : null };
}

function encodeAuditCursor(value: { at: string; operationId: string }): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseAuditCursor(value: string | null | undefined): { at: string; operationId: string } | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    return typeof parsed.at === "string" && Number.isFinite(Date.parse(parsed.at)) && typeof parsed.operationId === "string" && parsed.operationId.length > 0
      ? { at: new Date(parsed.at).toISOString(), operationId: parsed.operationId }
      : null;
  } catch {
    return null;
  }
}

function matchesAuditFilters(
  entry: AdminOperationAuditEntry,
  filters: AdminOperationAuditFilters,
): boolean {
  const operation = typeof entry.details.operation === "string" ? entry.details.operation : null;
  return (!filters.actorUserId || entry.actorUserId === filters.actorUserId.trim()) &&
    (!filters.operationType || entry.operationType === filters.operationType) &&
    (!filters.operation || operation === filters.operation.trim()) &&
    (!filters.outcome || entry.outcome === filters.outcome) &&
    (!filters.targetId || entry.targetId === filters.targetId.trim()) &&
    (!filters.from || Date.parse(entry.at) >= Date.parse(filters.from)) &&
    (!filters.to || Date.parse(entry.at) <= Date.parse(filters.to));
}

export function projectAdminOperationAuditEntry(
  entry: AdminOperationAuditEntry,
): AdminOperationAuditEntry {
  const allowlistedKeys = new Set([
    "priority",
    "status",
    "creatorState",
    "qualificationStatus",
    "trackingStatus",
    "publicationStatus",
    "removed",
    "removedAt",
  ]);
  const projectValue = (value: unknown): Record<string, unknown> | undefined => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const projected = Object.fromEntries(
      Object.entries(value).filter(([key, nested]) => allowlistedKeys.has(key) && ["string", "boolean", "number"].includes(typeof nested)),
    );
    return Object.keys(projected).length > 0 ? projected : undefined;
  };
  const details = entry.details;
  return {
    ...entry,
    details: {
      ...(typeof details.operation === "string" ? { operation: details.operation } : {}),
      ...(typeof details.reason === "string" ? { reason: details.reason } : {}),
      ...(typeof details.partialMutation === "boolean" ? { partialMutation: details.partialMutation } : {}),
      ...(projectValue(details.previousValue) ? { previousValue: projectValue(details.previousValue) } : {}),
      ...(projectValue(details.newValue) ? { newValue: projectValue(details.newValue) } : {}),
    },
  };
}

export async function appendAdminOperationAudit(
  entry: AdminOperationAuditEntry,
): Promise<void> {
  assertPersistenceAvailable("admin_operations_audit");
  let actorLabel = entry.actorLabel;
  if (!actorLabel) {
    try {
      const labels = await loadActorLabelsByUserId([entry.actorUserId]);
      actorLabel = labels.get(entry.actorUserId);
    } catch {
      actorLabel = undefined;
    }
  }
  const normalizedEntry = actorLabel
    ? { ...entry, actorLabel }
    : entry;

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
      const result = await supabase.from("admin_operations_audit").insert({
        operation_id: normalizedEntry.operationId,
        at: normalizedEntry.at,
        actor_user_id: normalizedEntry.actorUserId,
        operation_type: normalizedEntry.operationType,
        outcome: normalizedEntry.outcome,
        target_id: normalizedEntry.targetId ?? null,
        target_user_id: normalizedEntry.targetUserId ?? null,
        details: normalizedEntry.details,
      });

      if (!result.error) {
        return;
      }

      if (!allowLocalFileStoreFallback()) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  const records = [normalizedEntry, ...store.records].slice(0, 1500);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function listAdminOperationAudit(
  limit = 100,
  targetIdOrFilters?: string | null | AdminOperationAuditFilters,
): Promise<AdminOperationAuditEntry[]> {
  const page = await listAdminOperationAuditPage(limit, targetIdOrFilters && typeof targetIdOrFilters === "object"
    ? targetIdOrFilters
    : { targetId: targetIdOrFilters });
  return page.items;
}

export async function listAdminOperationAuditPage(
  limit = 100,
  filters: AdminOperationAuditFilters = {},
): Promise<AdminOperationAuditPage> {
  assertPersistenceAvailable("admin_operations_audit");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const cursor = parseAuditCursor(filters.cursor);
  if (filters.cursor && !cursor) throw new Error("Invalid admin audit cursor.");

  if (canUseSupabaseServerPersistence()) {
    const page = await tryListSupabaseAuditPage(normalizedLimit, filters, cursor);
    if (page) return page;
  }
  return listLocalAuditPage(normalizedLimit, filters, cursor);
}
