import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "checklist_progress.json",
);

export type ChecklistProgressEntry = {
  checklistId: string;
  userId: string;
  checks: Record<string, boolean>;
  updatedAt: string;
};

type ProgressStore = {
  entries: ChecklistProgressEntry[];
};

type ChecklistProgressRow = {
  user_id: string;
  checklist_id: string;
  checks: Record<string, boolean>;
  updated_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseChecks(value: unknown): Record<string, boolean> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([, checked]) => typeof checked !== "boolean")) return null;
  return Object.fromEntries(entries) as Record<string, boolean>;
}

function parseChecklistProgressRow(value: unknown): ChecklistProgressRow | null {
  if (!isRecord(value)) return null;
  const checks = parseChecks(value.checks);
  if (
    typeof value.user_id !== "string" ||
    typeof value.checklist_id !== "string" ||
    !checks ||
    typeof value.updated_at !== "string"
  ) {
    return null;
  }
  return {
    user_id: value.user_id,
    checklist_id: value.checklist_id,
    checks,
    updated_at: value.updated_at,
  };
}

function toChecklistProgressEntry(row: ChecklistProgressRow): ChecklistProgressEntry {
  return {
    userId: row.user_id,
    checklistId: row.checklist_id,
    checks: row.checks,
    updatedAt: row.updated_at,
  };
}

async function readStore(): Promise<ProgressStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ProgressStore;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return parsed;
  } catch {
    return { entries: [] };
  }
}

async function writeStore(store: ProgressStore): Promise<void> {
  await mkdir(dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function readChecklistProgressFromSupabase(
  userId: string,
  checklistId: string,
): Promise<ChecklistProgressEntry | null> {
  const supabase = getSupabaseServerClient(true);
  const result = await supabase
    .from("checklist_progress")
    .select("user_id, checklist_id, checks, updated_at")
    .eq("user_id", userId)
    .eq("checklist_id", checklistId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data) return null;

  const parsedRow = parseChecklistProgressRow(result.data);
  if (!parsedRow) {
    throw new Error("Checklist progress returned an invalid persisted row.");
  }
  return toChecklistProgressEntry(parsedRow);
}

async function upsertChecklistProgressToSupabase(
  updated: ChecklistProgressEntry,
): Promise<ChecklistProgressEntry> {
  const supabase = getSupabaseServerClient(true);
  const result = await supabase
    .from("checklist_progress")
    .upsert(
      {
        user_id: updated.userId,
        checklist_id: updated.checklistId,
        checks: updated.checks,
        updated_at: updated.updatedAt,
      },
      { onConflict: "user_id,checklist_id" },
    )
    .select("user_id, checklist_id, checks, updated_at")
    .single();

  if (result.error) throw new Error(result.error.message);
  const parsedRow = parseChecklistProgressRow(result.data);
  if (!parsedRow) {
    throw new Error("Checklist progress upsert returned an invalid persisted row.");
  }
  return toChecklistProgressEntry(parsedRow);
}

export async function getChecklistProgress(
  userId: string,
  checklistId: string,
): Promise<ChecklistProgressEntry | null> {
  assertPersistenceAvailable("checklist_progress");

  if (canUseSupabaseServerPersistence()) {
    try {
      return await readChecklistProgressFromSupabase(userId, checklistId);
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  return (
    store.entries.find(
      (entry) => entry.userId === userId && entry.checklistId === checklistId,
    ) ?? null
  );
}

export async function upsertChecklistProgress(
  userId: string,
  checklistId: string,
  checks: Record<string, boolean>,
): Promise<ChecklistProgressEntry> {
  assertPersistenceAvailable("checklist_progress");
  const updated: ChecklistProgressEntry = {
    checklistId,
    userId,
    checks,
    updatedAt: new Date().toISOString(),
  };

  if (canUseSupabaseServerPersistence()) {
    try {
      return await upsertChecklistProgressToSupabase(updated);
    } catch (error) {
      if (!allowLocalFileStoreFallback()) {
        throw error;
      }
    }
  }

  const store = await readStore();
  const index = store.entries.findIndex(
    (entry) => entry.userId === userId && entry.checklistId === checklistId,
  );
  if (index >= 0) {
    store.entries[index] = updated;
  } else {
    store.entries.push(updated);
  }
  await writeStore(store);
  return updated;
}
