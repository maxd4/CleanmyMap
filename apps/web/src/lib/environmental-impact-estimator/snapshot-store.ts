import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EnvironmentalImpactSnapshotRecord } from "./types";

type SnapshotStore = {
  updatedAt: string;
  records: EnvironmentalImpactSnapshotRecord[];
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "environmental_impact_snapshots.json");
const SNAPSHOT_KEY = "cleanmymap-project";

function emptyStore(): SnapshotStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<SnapshotStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SnapshotStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: SnapshotStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function getEnvironmentalImpactSnapshotDate(generatedAt: string): string {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export async function upsertEnvironmentalImpactSnapshot(
  snapshot: EnvironmentalImpactSnapshotRecord,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase.from("environmental_impact_snapshots").upsert(
        {
          snapshot_key: snapshot.snapshotKey,
          snapshot_date: snapshot.snapshotDate,
          generated_at: snapshot.generatedAt,
          version: snapshot.version,
          launched_at: snapshot.launchedAt,
          account_created_at: snapshot.accountCreatedAt,
          period_days: snapshot.signals.periodDays,
          total_kg_co2e_proxy: snapshot.totalKgCo2eProxy,
          monthly_kg_co2e_proxy: snapshot.monthlyKgCo2eProxy,
          annual_kg_co2e_proxy: snapshot.annualKgCo2eProxy,
          confidence_percent: snapshot.confidencePercent,
          uncertainty_percent: snapshot.uncertaintyPercent,
          model: snapshot.model,
          signals: snapshot.signals,
          notes: snapshot.signals.notes,
        },
        { onConflict: "snapshot_key,snapshot_date" },
      );
      if (!result.error) {
        return;
      }
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return;
      }
    }
  }

  const store = await readStore();
  const nextRecords = store.records.filter(
    (entry) =>
      !(
        entry.snapshotKey === snapshot.snapshotKey &&
        entry.snapshotDate === snapshot.snapshotDate
      ),
  );
  nextRecords.unshift(snapshot);
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: nextRecords.slice(0, 365),
  });
}

export async function listEnvironmentalImpactSnapshots(
  limit = 12,
): Promise<EnvironmentalImpactSnapshotRecord[]> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("environmental_impact_snapshots")
        .select(
          "id, snapshot_key, snapshot_date, generated_at, version, total_kg_co2e_proxy, monthly_kg_co2e_proxy, annual_kg_co2e_proxy, confidence_percent, uncertainty_percent, launched_at, account_created_at, model, signals",
        )
        .eq("snapshot_key", SNAPSHOT_KEY)
        .order("snapshot_date", { ascending: false })
        .limit(limit);

      if (!result.error) {
        return (result.data ?? []).map((row) => ({
          id: String(row.id),
          snapshotKey: row.snapshot_key,
          snapshotDate: row.snapshot_date,
          generatedAt: row.generated_at,
          version: row.version,
          totalKgCo2eProxy: row.total_kg_co2e_proxy,
          monthlyKgCo2eProxy: row.monthly_kg_co2e_proxy,
          annualKgCo2eProxy: row.annual_kg_co2e_proxy,
          confidencePercent: Number(row.confidence_percent ?? 0),
          uncertaintyPercent: Number(row.uncertainty_percent ?? 0),
          launchedAt: row.launched_at ?? null,
          accountCreatedAt: row.account_created_at ?? null,
          model: row.model as EnvironmentalImpactSnapshotRecord["model"],
          signals: row.signals as EnvironmentalImpactSnapshotRecord["signals"],
        }));
      }
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        return [];
      }
    }
  }

  const store = await readStore();
  return store.records
    .filter((entry) => entry.snapshotKey === SNAPSHOT_KEY)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
    .slice(0, limit);
}
