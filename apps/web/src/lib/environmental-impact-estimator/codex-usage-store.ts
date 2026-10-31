import { addDays } from "date-fns";
import { join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import {
  readLocalRecordStore,
  writeLocalRecordStore,
  type LocalRecordStorePayload,
} from "@/lib/persistence/local-record-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "./constants";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";
import type {
  EnvironmentalImpactCodexUsageSource,
  EnvironmentalImpactCodexUsageWeeklyInput,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
} from "./types";
export { buildCodexMonthlyUsageEstimate } from "./codex-usage-estimation";

type CodexUsageStore = LocalRecordStorePayload<
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord
>;

const FILE_PATH = join(process.cwd(), "data", "local-db", "codex_usage_weekly_snapshots.json");
const SNAPSHOT_KEY = "cleanmymap-codex-usage";
const CODEX_USAGE_SELECT =
  "id, snapshot_key, week_start, week_end, generated_at, version, source, session_count, conversation_count, turn_count, tool_call_count, shell_command_count, file_touch_count, test_run_count, changed_line_count, active_minutes, estimated_kg_co2e_proxy, confidence_percent, uncertainty_percent, notes, meta";

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseCivilDateAsUtc(value)
    : new Date(value);
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfIsoWeekUtc(date: Date): Date {
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() - mondayOffset);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

async function readStore(): Promise<CodexUsageStore> {
  return readLocalRecordStore(FILE_PATH, normalizeCodexUsageSnapshotRecord);
}

async function writeStore(store: CodexUsageStore): Promise<void> {
  await writeLocalRecordStore(FILE_PATH, store.records);
}

function toNonNegativeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function normalizeWeekRange(input: EnvironmentalImpactCodexUsageWeeklyInput) {
  const fallbackDate = parseDateOrNull(input.weekEnd) ?? parseDateOrNull(input.weekStart) ?? new Date();
  const weekStartDate = parseDateOrNull(input.weekStart) ?? startOfIsoWeekUtc(fallbackDate);
  const parsedWeekEnd = parseDateOrNull(input.weekEnd);
  const weekEndDate = parsedWeekEnd ?? addDays(weekStartDate, 6);
  const normalizedWeekEndDate =
    weekEndDate.getTime() < weekStartDate.getTime()
      ? addDays(weekStartDate, 6)
      : weekEndDate;

  return {
    weekStart: toIsoDate(weekStartDate),
    weekEnd: toIsoDate(normalizedWeekEndDate),
  };
}

function deriveConfidencePercent(source: EnvironmentalImpactCodexUsageSource, counts: number[]) {
  const nonZeroCount = counts.filter((value) => value > 0).length;
  const base = source === "manual" ? 86 : source === "imported" ? 92 : 76;
  return clamp(round6(base + Math.min(8, nonZeroCount * 0.75)), 55, 96);
}

export function buildCodexUsageWeeklySnapshot(
  input: EnvironmentalImpactCodexUsageWeeklyInput,
): EnvironmentalImpactCodexUsageWeeklySnapshotRecord {
  const { weekStart, weekEnd } = normalizeWeekRange(input);
  const source = input.source ?? "manual";
  const sessionCount = toNonNegativeNumber(input.sessionCount);
  const conversationCount = toNonNegativeNumber(input.conversationCount);
  const turnCount = toNonNegativeNumber(input.turnCount);
  const toolCallCount = toNonNegativeNumber(input.toolCallCount);
  const shellCommandCount = toNonNegativeNumber(input.shellCommandCount);
  const fileTouchCount = toNonNegativeNumber(input.fileTouchCount);
  const testRunCount = toNonNegativeNumber(input.testRunCount);
  const changedLineCount = toNonNegativeNumber(input.changedLineCount);
  const activeMinutes = toNonNegativeNumber(input.activeMinutes);
  const confidencePercent = deriveConfidencePercent(source, [
    sessionCount,
    conversationCount,
    turnCount,
    toolCallCount,
    shellCommandCount,
    fileTouchCount,
    testRunCount,
    changedLineCount,
    activeMinutes,
  ]);

  return {
    id: `codex-${weekStart}`,
    snapshotKey: SNAPSHOT_KEY,
    weekStart,
    weekEnd,
    generatedAt: new Date().toISOString(),
    version: ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION,
    source,
    sessionCount,
    conversationCount,
    turnCount,
    toolCallCount,
    shellCommandCount,
    fileTouchCount,
    testRunCount,
    changedLineCount,
    activeMinutes: round6(activeMinutes),
    estimatedKgCo2eProxy: null,
    confidencePercent,
    uncertaintyPercent: round6(100 - confidencePercent),
    notes: [
      ...(Array.isArray(input.notes) ? input.notes.filter((item) => typeof item === "string") : []),
      "Activité Codex observée; facteur physique audité absent, impact CO2e = NA.",
    ],
    meta: (input.meta ?? {}) as Record<string, unknown>,
  };
}

export async function upsertCodexUsageWeeklySnapshot(
  snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
      const result = await supabase.from("codex_usage_weekly_snapshots").upsert(
        {
          snapshot_key: snapshot.snapshotKey,
          week_start: snapshot.weekStart,
          week_end: snapshot.weekEnd,
          generated_at: snapshot.generatedAt,
          version: snapshot.version,
          source: snapshot.source,
          session_count: snapshot.sessionCount,
          conversation_count: snapshot.conversationCount,
          turn_count: snapshot.turnCount,
          tool_call_count: snapshot.toolCallCount,
          shell_command_count: snapshot.shellCommandCount,
          file_touch_count: snapshot.fileTouchCount,
          test_run_count: snapshot.testRunCount,
          changed_line_count: snapshot.changedLineCount,
          active_minutes: snapshot.activeMinutes,
          estimated_kg_co2e_proxy: snapshot.estimatedKgCo2eProxy,
          confidence_percent: snapshot.confidencePercent,
          uncertainty_percent: snapshot.uncertaintyPercent,
          notes: snapshot.notes,
          meta: snapshot.meta,
        },
        { onConflict: "snapshot_key,week_start" },
      );
      if (!result.error) {
        return;
      }
      if (!allowLocalFileStoreFallback()) {
        throw new Error("Codex usage snapshot persistence failed.");
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        throw new Error("Codex usage snapshot persistence failed.");
      }
    }
  }

  const store = await readStore();
  const nextRecords = store.records.filter(
    (entry) =>
      !(
        entry.snapshotKey === snapshot.snapshotKey &&
        entry.weekStart === snapshot.weekStart
      ),
  );
  nextRecords.unshift(snapshot);
  nextRecords.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  await writeStore({
    updatedAt: new Date().toISOString(),
    records: nextRecords.slice(0, 365),
  });
}

function normalizeCodexUsageSnapshotRow(
  row: Record<string, unknown>,
): EnvironmentalImpactCodexUsageWeeklySnapshotRecord {
  return {
    id: String(row.id),
    snapshotKey: String(row.snapshot_key),
    weekStart: String(row.week_start),
    weekEnd: String(row.week_end),
    generatedAt: String(row.generated_at),
    version: String(row.version),
    source: row.source as EnvironmentalImpactCodexUsageSource,
    sessionCount: Number(row.session_count ?? 0),
    conversationCount: Number(row.conversation_count ?? 0),
    turnCount: Number(row.turn_count ?? 0),
    toolCallCount: Number(row.tool_call_count ?? 0),
    shellCommandCount: Number(row.shell_command_count ?? 0),
    fileTouchCount: Number(row.file_touch_count ?? 0),
    testRunCount: Number(row.test_run_count ?? 0),
    changedLineCount: Number(row.changed_line_count ?? 0),
    activeMinutes: Number(row.active_minutes ?? 0),
    estimatedKgCo2eProxy:
      typeof row.estimated_kg_co2e_proxy === "number" &&
      Number.isFinite(row.estimated_kg_co2e_proxy)
        ? row.estimated_kg_co2e_proxy
        : null,
    confidencePercent: Number(row.confidence_percent ?? 0),
    uncertaintyPercent: Number(row.uncertainty_percent ?? 0),
    notes: Array.isArray(row.notes)
      ? row.notes.filter((item: unknown) => typeof item === "string")
      : [],
    meta: (row.meta ?? {}) as Record<string, unknown>,
  };
}

function normalizeCodexUsageSnapshotRecord(
  record: Record<string, unknown>,
): EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null {
  const stringFields = ["id", "snapshotKey", "weekStart", "weekEnd", "generatedAt", "version"] as const;
  if (stringFields.some((field) => typeof record[field] !== "string")) {
    return null;
  }

  const source = record.source;
  if (!["manual", "imported", "reconstructed"].includes(source as string)) {
    return null;
  }

  const numericFields = ["sessionCount", "conversationCount", "turnCount", "toolCallCount", "shellCommandCount", "fileTouchCount", "testRunCount", "changedLineCount", "activeMinutes", "confidencePercent", "uncertaintyPercent"] as const;
  if (numericFields.some((field) => typeof record[field] !== "number" || !Number.isFinite(record[field]))) {
    return null;
  }

  const estimatedKgCo2eProxy = record.estimatedKgCo2eProxy;
  if (estimatedKgCo2eProxy !== null && (typeof estimatedKgCo2eProxy !== "number" || !Number.isFinite(estimatedKgCo2eProxy))) {
    return null;
  }

  if (!Array.isArray(record.notes) || !record.notes.every((note) => typeof note === "string") || !record.meta || typeof record.meta !== "object" || Array.isArray(record.meta)) {
    return null;
  }

  return record as unknown as EnvironmentalImpactCodexUsageWeeklySnapshotRecord;
}

export async function getCodexUsageWeeklySnapshot(
  weekStart: string,
): Promise<EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
      const result = await supabase
        .from("codex_usage_weekly_snapshots")
        .select(CODEX_USAGE_SELECT)
        .eq("snapshot_key", SNAPSHOT_KEY)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (!result.error) {
        return result.data
          ? normalizeCodexUsageSnapshotRow(result.data as Record<string, unknown>)
          : null;
      }
      if (!allowLocalFileStoreFallback()) {
        throw new Error("Codex usage snapshot lookup failed.");
      }
    } catch {
      if (!allowLocalFileStoreFallback()) {
        throw new Error("Codex usage snapshot lookup failed.");
      }
    }
  }

  const store = await readStore();
  return (
    store.records.find(
      (entry) => entry.snapshotKey === SNAPSHOT_KEY && entry.weekStart === weekStart,
    ) ?? null
  );
}

export async function listCodexUsageWeeklySnapshots(
  limit = 12,
): Promise<EnvironmentalImpactCodexUsageWeeklySnapshotRecord[]> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient(true);
      const result = await supabase
        .from("codex_usage_weekly_snapshots")
        .select(CODEX_USAGE_SELECT)
        .eq("snapshot_key", SNAPSHOT_KEY)
        .order("week_start", { ascending: false })
        .limit(limit);

      if (!result.error) {
        return (result.data ?? []).map((row) =>
          normalizeCodexUsageSnapshotRow(row as Record<string, unknown>),
        );
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
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, limit);
}
