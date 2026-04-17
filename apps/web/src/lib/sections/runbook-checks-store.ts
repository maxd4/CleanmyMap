/**
 * Persistance des résultats des Runbooks d'exploitation.
 * PERMANENCE : Supabase (table `runbook_checks`) pour assurer la continuité sur Vercel.
 * FALLBACK : Fichier local éphémère.
 */
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
  "runbook_checks.json",
);
const RUNBOOK_VERSION = "2026.04";

export type RunbookCheckResult = {
  profile: "ops" | "admin" | "dev";
  status: "pass" | "fail";
  durationSeconds: number;
  lastRunAt: string;
  notes: string[];
};

type RunbookStore = {
  version: string;
  checks: RunbookCheckResult[];
};

const DEFAULT_CHECKS: RunbookCheckResult[] = [
  {
    profile: "ops",
    status: "pass",
    durationSeconds: 180,
    lastRunAt: "",
    notes: ["Declarer -> Carte -> Historique"],
  },
  {
    profile: "admin",
    status: "pass",
    durationSeconds: 240,
    lastRunAt: "",
    notes: ["Import dry-run -> confirmer -> journal"],
  },
  {
    profile: "dev",
    status: "pass",
    durationSeconds: 220,
    lastRunAt: "",
    notes: ["API smoke -> UI smoke -> export"],
  },
];

async function readStore(): Promise<RunbookStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as RunbookStore;
    if (!parsed || !Array.isArray(parsed.checks)) {
      return { version: RUNBOOK_VERSION, checks: DEFAULT_CHECKS };
    }
    return parsed;
  } catch {
    return { version: RUNBOOK_VERSION, checks: DEFAULT_CHECKS };
  }
}

async function writeStore(store: RunbookStore): Promise<void> {
  await mkdir(dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function listRunbookChecks(): Promise<RunbookStore> {
  assertPersistenceAvailable("runbook_checks");

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("runbook_checks")
        .select("profile, status, duration_seconds, last_run_at, notes")
        .order("profile", { ascending: true });

      if (!result.error) {
        const byProfile = new Map<string, RunbookCheckResult>();
        for (const row of result.data ?? []) {
          byProfile.set(row.profile, {
            profile: row.profile,
            status: row.status,
            durationSeconds: row.duration_seconds,
            lastRunAt: row.last_run_at ?? "",
            notes: Array.isArray(row.notes)
              ? row.notes.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
          });
        }

        const checks = DEFAULT_CHECKS.map(
          (seed) => byProfile.get(seed.profile) ?? seed,
        );
        return { version: RUNBOOK_VERSION, checks };
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

  return readStore();
}

export async function upsertRunbookCheck(input: {
  profile: "ops" | "admin" | "dev";
  status: "pass" | "fail";
  durationSeconds: number;
  notes: string[];
}): Promise<RunbookStore> {
  assertPersistenceAvailable("runbook_checks");

  const updated: RunbookCheckResult = {
    profile: input.profile,
    status: input.status,
    durationSeconds: input.durationSeconds,
    lastRunAt: new Date().toISOString(),
    notes: input.notes,
  };

  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("runbook_checks")
        .upsert(
          {
            profile: updated.profile,
            status: updated.status,
            duration_seconds: updated.durationSeconds,
            last_run_at: updated.lastRunAt,
            notes: updated.notes,
          },
          { onConflict: "profile" },
        )
        .select("profile, status, duration_seconds, last_run_at, notes")
        .single();

      if (!result.error) {
        return listRunbookChecks();
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
  const index = store.checks.findIndex(
    (check) => check.profile === input.profile,
  );
  if (index >= 0) {
    store.checks[index] = updated;
  } else {
    store.checks.push(updated);
  }
  const output: RunbookStore = {
    version: RUNBOOK_VERSION,
    checks: store.checks,
  };
  await writeStore(output);
  return output;
}
