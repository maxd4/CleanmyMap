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

export type AdminOperationAuditEntry = {
  operationId: string;
  at: string;
  actorUserId: string;
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

export async function appendAdminOperationAudit(
  entry: AdminOperationAuditEntry,
): Promise<void> {
  assertPersistenceAvailable("admin_operations_audit");

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("admin_operations_audit").insert({
        operation_id: entry.operationId,
        at: entry.at,
        actor_user_id: entry.actorUserId,
        operation_type: entry.operationType,
        outcome: entry.outcome,
        target_id: entry.targetId ?? null,
        details: entry.details,
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
  const records = [entry, ...store.records].slice(0, 1500);
  await writeStore({ updatedAt: new Date().toISOString(), records });
}

export async function listAdminOperationAudit(
  limit = 100,
): Promise<AdminOperationAuditEntry[]> {
  assertPersistenceAvailable("admin_operations_audit");
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("admin_operations_audit")
        .select(
          "operation_id, at, actor_user_id, operation_type, outcome, target_id, details",
        )
        .order("at", { ascending: false })
        .limit(normalizedLimit);

      if (!result.error) {
        return (result.data ?? []).map((row) => ({
          operationId: row.operation_id,
          at: row.at,
          actorUserId: row.actor_user_id,
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
  return store.records.slice(0, normalizedLimit);
}
