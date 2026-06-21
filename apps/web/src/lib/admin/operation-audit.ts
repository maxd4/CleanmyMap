/**
 * Service de journalisation des opérations d'administration.
 * PERMANENCE : Ces données doivent figurer dans Supabase (table `admin_operations_audit`) en production.
 * FALLBACK : Le fallback sur fichier local est toléré en développement mais éphémère sur Vercel.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
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

export type AdminOperationAuditEntry = {
  operationId: string;
  at: string;
  actorUserId: string;
  actorLabel?: string;
  operationType: "moderation" | "import_dry_run" | "import_confirm";
  outcome: "success" | "error";
  targetId?: string;
  details: Record<string, unknown>;
};

type AuditStore = {
  updatedAt: string;
  records: AdminOperationAuditEntry[];
};

function emptyStore(): AuditStore {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

async function ensureDirectory(pathname: string): Promise<void> {
  await mkdir(dirname(pathname), { recursive: true });
}

async function readStore(): Promise<AuditStore> {
  try {
    const raw = await readFile(AUDIT_FILE, "utf8");
    const parsed = JSON.parse(raw) as AuditStore;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.records)
    ) {
      return emptyStore();
    }
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records,
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: AuditStore): Promise<void> {
  await ensureDirectory(AUDIT_FILE);
  await writeFile(
    AUDIT_FILE,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), records: store.records }, null, 2)}\n`,
    "utf8",
  );
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

  const supabase = getSupabaseServerClient();
  const result = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", uniqueActorIds);

  if (result.error) {
    return labels;
  }

  for (const row of (result.data ?? []) as ProfileLookupRow[]) {
    labels.set(row.id, buildActorLabel(row, row.id));
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
      const supabase = getSupabaseServerClient();
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
      const supabase = getSupabaseServerClient();
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
        const actorLabels = await loadActorLabelsByUserId(
          (result.data ?? []).map((row) => row.actor_user_id),
        );

        return (result.data ?? []).map((row) => ({
          operationId: row.operation_id,
          at: row.at,
          actorUserId: row.actor_user_id,
          actorLabel:
            actorLabels.get(row.actor_user_id) ??
            buildActorLabel(undefined, row.actor_user_id),
          operationType: row.operation_type,
          outcome: row.outcome,
          targetId: row.target_id ?? undefined,
          details: (row.details ?? {}) as Record<string, unknown>,
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
