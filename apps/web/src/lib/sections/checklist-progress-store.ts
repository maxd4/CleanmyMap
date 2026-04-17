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

export async function getChecklistProgress(
  userId: string,
  checklistId: string,
): Promise<ChecklistProgressEntry | null> {
  assertPersistenceAvailable("checklist_progress");

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("checklist_progress")
        .select("user_id, checklist_id, checks, updated_at")
        .eq("user_id", userId)
        .eq("checklist_id", checklistId)
        .maybeSingle();

      if (!result.error) {
        if (!result.data) {
          return null;
        }
        return {
          userId: result.data.user_id,
          checklistId: result.data.checklist_id,
          checks: (result.data.checks ?? {}) as Record<string, boolean>,
          updatedAt: result.data.updated_at,
        };
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
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("checklist_progress")
        .upsert(
          {
            user_id: userId,
            checklist_id: checklistId,
            checks,
            updated_at: updated.updatedAt,
          },
          { onConflict: "user_id,checklist_id" },
        )
        .select("user_id, checklist_id, checks, updated_at")
        .single();

      if (!result.error) {
        return {
          userId: result.data.user_id,
          checklistId: result.data.checklist_id,
          checks: (result.data.checks ?? {}) as Record<string, boolean>,
          updatedAt: result.data.updated_at,
        };
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
