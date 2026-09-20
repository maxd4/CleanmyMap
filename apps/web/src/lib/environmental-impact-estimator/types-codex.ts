export type EnvironmentalImpactCodexUsageSource =
  | "manual"
  | "imported"
  | "reconstructed";

export type EnvironmentalImpactCodexUsageWeeklyInput = {
  weekStart?: string | null;
  weekEnd?: string | null;
  sessionCount?: number | null;
  conversationCount?: number | null;
  turnCount?: number | null;
  toolCallCount?: number | null;
  shellCommandCount?: number | null;
  fileTouchCount?: number | null;
  testRunCount?: number | null;
  changedLineCount?: number | null;
  activeMinutes?: number | null;
  source?: EnvironmentalImpactCodexUsageSource | null;
  notes?: string[] | null;
  meta?: Record<string, unknown> | null;
};

export type EnvironmentalImpactCodexUsageWeeklySnapshotRecord = {
  id: string;
  snapshotKey: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  version: string;
  source: EnvironmentalImpactCodexUsageSource;
  sessionCount: number;
  conversationCount: number;
  turnCount: number;
  toolCallCount: number;
  shellCommandCount: number;
  fileTouchCount: number;
  testRunCount: number;
  changedLineCount: number;
  activeMinutes: number;
  estimatedKgCo2eProxy: number | null;
  confidencePercent: number;
  uncertaintyPercent: number;
  notes: string[];
  meta: Record<string, unknown>;
};

export type EnvironmentalImpactCodexUsageMonthlyEstimate = {
  generatedAt: string;
  windowWeeks: number;
  source: "empty" | "manual" | "imported" | "reconstructed" | "mixed";
  weekCount: number;
  sessionCount: number;
  conversationCount: number;
  turnCount: number;
  toolCallCount: number;
  shellCommandCount: number;
  fileTouchCount: number;
  testRunCount: number;
  changedLineCount: number;
  activeMinutes: number;
  monthlyEquivalent: {
    sessionCount: number;
    conversationCount: number;
    turnCount: number;
    toolCallCount: number;
    shellCommandCount: number;
    fileTouchCount: number;
    testRunCount: number;
    changedLineCount: number;
    activeMinutes: number;
    estimatedKgCo2eProxy: number | null;
  };
  estimatedKgCo2eProxy: number | null;
  confidencePercent: number;
  uncertaintyPercent: number;
  notes: string[];
  weeklySnapshots: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};
