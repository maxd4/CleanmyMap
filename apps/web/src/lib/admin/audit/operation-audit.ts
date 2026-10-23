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
  details: Record<string, unknown>;
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
  if (!isRecord(value)) return null;
  if (
    typeof value.operation_id !== "string" ||
    typeof value.at !== "string" ||
    typeof value.actor_user_id !== "string" ||
    !isAuditOperationType(value.operation_type) ||
    !isAuditOutcome(value.outcome) ||
    (value.target_id !== null && value.target_id !== undefined && typeof value.target_id !== "string") ||
    !isRecord(value.details)
  ) return null;
  return {
    operation_id: value.operation_id,
    at: value.at,
    actor_user_id: value.actor_user_id,
    operation_type: value.operation_type,
    outcome: value.outcome,
    target_id: value.target_id === undefined ? null : value.target_id,
    details: value.details,
  };
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
  targetId?: string | null,
): Promise<AdminOperationAuditEntry[]> {
  assertPersistenceAvailable("admin_operations_audit");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
      let query = supabase
        .from("admin_operations_audit")
        .select(
          "operation_id, at, actor_user_id, operation_type, outcome, target_id, details",
        );

      if (targetId && targetId.trim().length > 0) {
        query = query.eq("target_id", targetId.trim());
      }

      const result = await query
        .order("at", { ascending: false })
        .limit(normalizedLimit);

      if (!result.error) {
        const rawRows: unknown = result.data ?? [];
        if (!Array.isArray(rawRows)) throw new Error("Admin audit returned an invalid row collection.");
        const rows = rawRows.map(parseAdminOperationAuditDbRow);
        if (rows.some((row) => row === null)) throw new Error("Admin audit returned an invalid persisted row.");
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
          details: row.details,
        }));
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
  const records = targetId
    ? store.records.filter(
        (record) => record.targetId?.trim() === targetId.trim(),
      )
    : store.records;

  return records.slice(0, normalizedLimit).map((record) => ({
    ...record,
    actorLabel: record.actorLabel ?? buildActorLabel(undefined, record.actorUserId),
  }));
}
