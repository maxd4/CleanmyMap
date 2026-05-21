import { addDays, startOfWeek } from "date-fns";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  allowLocalFileStoreFallback,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ENVIRONMENTAL_IMPACT_ESTIMATOR_VERSION } from "./constants";
import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageSource,
  EnvironmentalImpactCodexUsageWeeklyInput,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactInfrastructureInput,
} from "./types";

type CodexUsageStore = {
  updatedAt: string;
  records: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};

const FILE_PATH = join(process.cwd(), "data", "local-db", "codex_usage_weekly_snapshots.json");
const SNAPSHOT_KEY = "cleanmymap-codex-usage";
const WEEKS_PER_MONTH = 52 / 12;

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

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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

function deriveEstimatedKgCo2eProxy(params: {
  sessionCount: number;
  conversationCount: number;
  turnCount: number;
  toolCallCount: number;
  shellCommandCount: number;
  fileTouchCount: number;
  testRunCount: number;
  changedLineCount: number;
  activeMinutes: number;
}): number {
  return round6(
    params.activeMinutes * 0.00003 +
      params.sessionCount * 0.00012 +
      params.conversationCount * 0.00002 +
      params.turnCount * 0.000018 +
      params.toolCallCount * 0.000015 +
      params.shellCommandCount * 0.00001 +
      params.fileTouchCount * 0.000008 +
      params.testRunCount * 0.00006 +
      params.changedLineCount * 0.0000002,
  );
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
  const estimatedKgCo2eProxy = deriveEstimatedKgCo2eProxy({
    sessionCount,
    conversationCount,
    turnCount,
    toolCallCount,
    shellCommandCount,
    fileTouchCount,
    testRunCount,
    changedLineCount,
    activeMinutes,
  });
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
    estimatedKgCo2eProxy,
    confidencePercent,
    uncertaintyPercent: round6(100 - confidencePercent),
    notes: Array.isArray(input.notes) ? input.notes.filter((item) => typeof item === "string") : [],
    meta: (input.meta ?? {}) as Record<string, unknown>,
  };
}

export async function upsertCodexUsageWeeklySnapshot(
  snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
): Promise<void> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
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

export async function listCodexUsageWeeklySnapshots(
  limit = 12,
): Promise<EnvironmentalImpactCodexUsageWeeklySnapshotRecord[]> {
  if (canUseSupabaseServerPersistence()) {
    try {
      const supabase = getSupabaseServerClient();
      const result = await supabase
        .from("codex_usage_weekly_snapshots")
        .select(
          "id, snapshot_key, week_start, week_end, generated_at, version, source, session_count, conversation_count, turn_count, tool_call_count, shell_command_count, file_touch_count, test_run_count, changed_line_count, active_minutes, estimated_kg_co2e_proxy, confidence_percent, uncertainty_percent, notes, meta",
        )
        .eq("snapshot_key", SNAPSHOT_KEY)
        .order("week_start", { ascending: false })
        .limit(limit);

      if (!result.error) {
        return (result.data ?? []).map((row) => ({
          id: String(row.id),
          snapshotKey: row.snapshot_key,
          weekStart: row.week_start,
          weekEnd: row.week_end,
          generatedAt: row.generated_at,
          version: row.version,
          source: row.source,
          sessionCount: Number(row.session_count ?? 0),
          conversationCount: Number(row.conversation_count ?? 0),
          turnCount: Number(row.turn_count ?? 0),
          toolCallCount: Number(row.tool_call_count ?? 0),
          shellCommandCount: Number(row.shell_command_count ?? 0),
          fileTouchCount: Number(row.file_touch_count ?? 0),
          testRunCount: Number(row.test_run_count ?? 0),
          changedLineCount: Number(row.changed_line_count ?? 0),
          activeMinutes: Number(row.active_minutes ?? 0),
          estimatedKgCo2eProxy: Number(row.estimated_kg_co2e_proxy ?? 0),
          confidencePercent: Number(row.confidence_percent ?? 0),
          uncertaintyPercent: Number(row.uncertainty_percent ?? 0),
          notes: Array.isArray(row.notes) ? row.notes.filter((item: unknown) => typeof item === "string") : [],
          meta: (row.meta ?? {}) as Record<string, unknown>,
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
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, limit);
}

function sumSnapshots(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
  mapper: (snapshot: EnvironmentalImpactCodexUsageWeeklySnapshotRecord) => number,
): number {
  return round6(snapshots.reduce((acc, snapshot) => acc + mapper(snapshot), 0));
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
    return {
      generatedAt,
      windowWeeks: 4,
      source: "empty",
      weekCount: 0,
      sessionCount: 0,
      conversationCount: 0,
      turnCount: 0,
      toolCallCount: 0,
      shellCommandCount: 0,
      fileTouchCount: 0,
      testRunCount: 0,
      changedLineCount: 0,
      activeMinutes: 0,
      monthlyEquivalent: {
        sessionCount: 0,
        conversationCount: 0,
        turnCount: 0,
        toolCallCount: 0,
        shellCommandCount: 0,
        fileTouchCount: 0,
        testRunCount: 0,
        changedLineCount: 0,
        activeMinutes: 0,
        estimatedKgCo2eProxy: 0,
      },
      estimatedKgCo2eProxy: 0,
      confidencePercent: 0,
      uncertaintyPercent: 100,
      notes: [
        "Aucune semaine Codex n'est encore enregistrée; l'impact reste donc à zéro tant que le journal hebdomadaire n'est pas rempli.",
      ],
      weeklySnapshots: [],
    };
  }

  const averageMultiplier = WEEKS_PER_MONTH / Math.max(1, weekCount);
  const sourceKinds = new Set(recentSnapshots.map((snapshot) => snapshot.source));
  const source: EnvironmentalImpactCodexUsageMonthlyEstimate["source"] =
    sourceKinds.size > 1 ? "mixed" : recentSnapshots[0].source;
  const weeklyKgTotal = sumSnapshots(recentSnapshots, (snapshot) => snapshot.estimatedKgCo2eProxy);
  const monthlyEquivalentKg = round6(weeklyKgTotal * averageMultiplier);
  const sessionCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.sessionCount);
  const conversationCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.conversationCount);
  const turnCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.turnCount);
  const toolCallCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.toolCallCount);
  const shellCommandCount = sumSnapshots(
    recentSnapshots,
    (snapshot) => snapshot.shellCommandCount,
  );
  const fileTouchCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.fileTouchCount);
  const testRunCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.testRunCount);
  const changedLineCount = sumSnapshots(recentSnapshots, (snapshot) => snapshot.changedLineCount);
  const activeMinutes = sumSnapshots(recentSnapshots, (snapshot) => snapshot.activeMinutes);
  const confidencePercent = clamp(
    round6(
      recentSnapshots.reduce((acc, snapshot) => acc + snapshot.confidencePercent, 0) /
        Math.max(1, recentSnapshots.length) -
        Math.max(0, 6 - recentSnapshots.length) * 1.5,
    ),
    50,
    96,
  );
  const notes = [
    ...new Set(
      recentSnapshots
        .flatMap((snapshot) => snapshot.notes)
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  ];

  if (recentSnapshots.length < 4) {
    notes.push(
      `La série Codex couvre ${recentSnapshots.length} semaine${recentSnapshots.length > 1 ? "s" : ""}; la conversion mensuelle reste une projection à partir de ce journal partiel.`,
    );
  }

  return {
    generatedAt,
    windowWeeks: 4,
    source,
    weekCount: recentSnapshots.length,
    sessionCount,
    conversationCount,
    turnCount,
    toolCallCount,
    shellCommandCount,
    fileTouchCount,
    testRunCount,
    changedLineCount,
    activeMinutes,
    monthlyEquivalent: {
      sessionCount: round6(sessionCount * averageMultiplier),
      conversationCount: round6(conversationCount * averageMultiplier),
      turnCount: round6(turnCount * averageMultiplier),
      toolCallCount: round6(toolCallCount * averageMultiplier),
      shellCommandCount: round6(shellCommandCount * averageMultiplier),
      fileTouchCount: round6(fileTouchCount * averageMultiplier),
      testRunCount: round6(testRunCount * averageMultiplier),
      changedLineCount: round6(changedLineCount * averageMultiplier),
      activeMinutes: round6(activeMinutes * averageMultiplier),
      estimatedKgCo2eProxy: monthlyEquivalentKg,
    },
    estimatedKgCo2eProxy: monthlyEquivalentKg,
    confidencePercent,
    uncertaintyPercent: round6(100 - confidencePercent),
    notes,
    weeklySnapshots: recentSnapshots,
  };
}

export function buildCodexInfrastructureUsageInput(
  snapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[],
): EnvironmentalImpactInfrastructureInput["usage"] {
  const aggregate = buildCodexMonthlyUsageEstimate(snapshots);
  if (aggregate.weekCount === 0) {
    return {
      monthlyCodexSessions: null,
      monthlyCodexConversationTurns: null,
      monthlyCodexToolActions: null,
      monthlyCodexShellCommands: null,
      monthlyCodexFilesTouched: null,
      monthlyCodexTestsRun: null,
      monthlyCodexChangedLines: null,
      monthlyCodexActiveMinutes: null,
    };
  }

  return {
    monthlyCodexSessions: aggregate.monthlyEquivalent.sessionCount,
    monthlyCodexConversationTurns: aggregate.monthlyEquivalent.conversationCount,
    monthlyCodexToolActions: aggregate.monthlyEquivalent.toolCallCount,
    monthlyCodexShellCommands: aggregate.monthlyEquivalent.shellCommandCount,
    monthlyCodexFilesTouched: aggregate.monthlyEquivalent.fileTouchCount,
    monthlyCodexTestsRun: aggregate.monthlyEquivalent.testRunCount,
    monthlyCodexChangedLines: aggregate.monthlyEquivalent.changedLineCount,
    monthlyCodexActiveMinutes: aggregate.monthlyEquivalent.activeMinutes,
  };
}
