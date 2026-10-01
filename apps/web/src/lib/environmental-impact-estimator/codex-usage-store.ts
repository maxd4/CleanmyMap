import { addDays, startOfWeek } from "date-fns";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "./constants";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageSource,
  EnvironmentalImpactCodexUsageWeeklyInput,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
} from "./types";

type CodexUsageStore = {
  updatedAt: string;
  records: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "codex_usage_weekly_snapshots.json");
const SNAPSHOT_KEY = "cleanmymap-codex-usage";
const WEEKS_PER_MONTH = 52 / 12;
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

function emptyStore(): CodexUsageStore {
  return { updatedAt: new Date().toISOString(), records: [] };
}

async function readStore(): Promise<CodexUsageStore> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CodexUsageStore;
    if (!parsed || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: CodexUsageStore): Promise<void> {
  await mkdir(dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function toNonNegativeNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function normalizeWeekRange(input: EnvironmentalImpactCodexUsageWeeklyInput) {
  const fallbackDate = parseDateOrNull(input.weekEnd) ?? parseDateOrNull(input.weekStart) ?? new Date();
  const weekStartDate = parseDateOrNull(input.weekStart) ?? startOfWeek(fallbackDate, { weekStartsOn: 1 });
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

function sumSnapshots(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
  mapper: (snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord) => number,
): number {
  return round6(snapshots.reduce((acc, snapshot) => acc + mapper(snapshot), 0));
}

type MonthlyUsageTotals = {
  sessionCount: number;
  conversationCount: number;
  turnCount: number;
  toolCallCount: number;
  shellCommandCount: number;
  fileTouchCount: number;
  testRunCount: number;
  changedLineCount: number;
  activeMinutes: number;
};

function emptyCodexMonthlyUsageEstimate(
  generatedAt: string,
): EnvironmentalImpactCodexUsageMonthlyEstimate {
  return {
    generatedAt, windowWeeks: 4, source: "empty", weekCount: 0,
    sessionCount: 0, conversationCount: 0, turnCount: 0, toolCallCount: 0,
    shellCommandCount: 0, fileTouchCount: 0, testRunCount: 0, changedLineCount: 0,
    activeMinutes: 0,
    monthlyEquivalent: {
      sessionCount: 0, conversationCount: 0, turnCount: 0, toolCallCount: 0,
      shellCommandCount: 0, fileTouchCount: 0, testRunCount: 0, changedLineCount: 0,
      activeMinutes: 0, estimatedKgCo2eProxy: null,
    },
    estimatedKgCo2eProxy: null, confidencePercent: 0, uncertaintyPercent: 100,
    notes: ["Aucune semaine Codex n'est encore enregistrée; l'activité et l'impact physique restent NA."],
    weeklySnapshots: [],
  };
}

function sumMonthlyUsageTotals(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
): MonthlyUsageTotals {
  return {
    sessionCount: sumSnapshots(snapshots, (snapshot) => snapshot.sessionCount),
    conversationCount: sumSnapshots(snapshots, (snapshot) => snapshot.conversationCount),
    turnCount: sumSnapshots(snapshots, (snapshot) => snapshot.turnCount),
    toolCallCount: sumSnapshots(snapshots, (snapshot) => snapshot.toolCallCount),
    shellCommandCount: sumSnapshots(snapshots, (snapshot) => snapshot.shellCommandCount),
    fileTouchCount: sumSnapshots(snapshots, (snapshot) => snapshot.fileTouchCount),
    testRunCount: sumSnapshots(snapshots, (snapshot) => snapshot.testRunCount),
    changedLineCount: sumSnapshots(snapshots, (snapshot) => snapshot.changedLineCount),
    activeMinutes: sumSnapshots(snapshots, (snapshot) => snapshot.activeMinutes),
  };
}

function buildMonthlyEquivalent(totals: MonthlyUsageTotals, multiplier: number) {
  return {
    sessionCount: round6(totals.sessionCount * multiplier),
    conversationCount: round6(totals.conversationCount * multiplier),
    turnCount: round6(totals.turnCount * multiplier),
    toolCallCount: round6(totals.toolCallCount * multiplier),
    shellCommandCount: round6(totals.shellCommandCount * multiplier),
    fileTouchCount: round6(totals.fileTouchCount * multiplier),
    testRunCount: round6(totals.testRunCount * multiplier),
    changedLineCount: round6(totals.changedLineCount * multiplier),
    activeMinutes: round6(totals.activeMinutes * multiplier),
    estimatedKgCo2eProxy: null,
  };
}

function buildMonthlyUsageNotes(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
): string[] {
  const notes = [
    ...new Set(
      snapshots.flatMap((snapshot) => snapshot.notes)
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  ];
  if (snapshots.length < 4) {
    notes.push(
      `La série Codex couvre ${snapshots.length} semaine${snapshots.length > 1 ? "s" : ""}; la conversion mensuelle reste une projection à partir de ce journal partiel.`,
    );
  }
  notes.push(
    "Les compteurs Codex sont observés ou dérivés du journal; aucun facteur physique audité n'est disponible, impact CO2e = NA.",
  );
  return notes;
}

export function buildCodexMonthlyUsageEstimate(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
  generatedAt = new Date().toISOString(),
): EnvironmentalImpactCodexUsageMonthlyEstimate {
  const sortedSnapshots = [...snapshots]
    .filter((snapshot) => Boolean(snapshot.weekStart))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const recentSnapshots = sortedSnapshots.slice(-4);
  const weekCount = recentSnapshots.length;

  if (weekCount === 0) {
    return emptyCodexMonthlyUsageEstimate(generatedAt);
  }

  const averageMultiplier = WEEKS_PER_MONTH / Math.max(1, weekCount);
  const sourceKinds = new Set(recentSnapshots.map((snapshot) => snapshot.source));
  const source: EnvironmentalImpactCodexUsageMonthlyEstimate["source"] =
    sourceKinds.size > 1 ? "mixed" : recentSnapshots[0].source;
  const totals = sumMonthlyUsageTotals(recentSnapshots);
  const confidencePercent = clamp(
    round6(
      recentSnapshots.reduce((acc, snapshot) => acc + snapshot.confidencePercent, 0) /
        Math.max(1, recentSnapshots.length) -
        Math.max(0, 6 - recentSnapshots.length) * 1.5,
    ),
    50,
    96,
  );
  const notes = buildMonthlyUsageNotes(recentSnapshots);

  return {
    generatedAt,
    windowWeeks: 4,
    source,
    weekCount: recentSnapshots.length,
    ...totals,
    monthlyEquivalent: buildMonthlyEquivalent(totals, averageMultiplier),
    estimatedKgCo2eProxy: null,
    confidencePercent,
    uncertaintyPercent: round6(100 - confidencePercent),
    notes,
    weeklySnapshots: recentSnapshots,
  };
}
