import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
} from "./types";

const WEEKS_PER_MONTH = 52 / 12;

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
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
      estimatedKgCo2eProxy: null,
    },
    estimatedKgCo2eProxy: null,
    confidencePercent: 0,
    uncertaintyPercent: 100,
    notes: [
      "Aucune semaine Codex n'est encore enregistrée; l'activité et l'impact physique restent NA.",
    ],
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
      snapshots
        .flatMap((snapshot) => snapshot.notes)
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
  const generatedAtMs = new Date(generatedAt).getTime();
  const sortedSnapshots = [...snapshots]
    .filter((snapshot) => {
      if (!snapshot.weekStart) return false;
      if (!Number.isFinite(generatedAtMs)) return true;
      const weekStartMs = new Date(`${snapshot.weekStart}T00:00:00.000Z`).getTime();
      return Number.isFinite(weekStartMs) && weekStartMs <= generatedAtMs;
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const recentSnapshots = sortedSnapshots.slice(-4);

  if (recentSnapshots.length === 0) {
    return emptyCodexMonthlyUsageEstimate(generatedAt);
  }

  const averageMultiplier = WEEKS_PER_MONTH / recentSnapshots.length;
  const sourceKinds = new Set(recentSnapshots.map((snapshot) => snapshot.source));
  const source: EnvironmentalImpactCodexUsageMonthlyEstimate["source"] =
    sourceKinds.size > 1 ? "mixed" : recentSnapshots[0].source;
  const totals = sumMonthlyUsageTotals(recentSnapshots);
  const confidencePercent = Math.min(
    96,
    Math.max(
      50,
      round6(
        recentSnapshots.reduce((acc, snapshot) => acc + snapshot.confidencePercent, 0) /
          recentSnapshots.length -
          Math.max(0, 6 - recentSnapshots.length) * 1.5,
      ),
    ),
  );

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
    notes: buildMonthlyUsageNotes(recentSnapshots),
    weeklySnapshots: recentSnapshots,
  };
}
