import type {
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageSource,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactCodexUsageWeeklyInput,
} from "@/lib/environmental-impact-estimator";

export type CodexUsageAdminResponse = {
  status: "ok" | "error";
  triggeredBy?: string;
  version?: string;
  error?: string;
  details?: string;
  snapshot?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord;
  aggregate?: EnvironmentalImpactCodexUsageMonthlyEstimate;
  latest?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord | null;
  snapshots?: EnvironmentalImpactCodexUsageWeeklySnapshotRecord[];
};

export type CodexUsageFormState = {
  weekStart: string;
  weekEnd: string;
  sessionCount: string;
  conversationCount: string;
  turnCount: string;
  toolCallCount: string;
  shellCommandCount: string;
  fileTouchCount: string;
  testRunCount: string;
  changedLineCount: string;
  activeMinutes: string;
  source: EnvironmentalImpactCodexUsageSource;
  notes: string;
};

export type CodexUsageFormField = keyof CodexUsageFormState;

const NUMERIC_FIELDS = [
  "sessionCount",
  "conversationCount",
  "turnCount",
  "toolCallCount",
  "shellCommandCount",
  "fileTouchCount",
  "testRunCount",
  "changedLineCount",
  "activeMinutes",
] as const satisfies readonly Exclude<CodexUsageFormField, "weekStart" | "weekEnd" | "source" | "notes">[];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getCurrentWeekRange(now = new Date()) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart: toIsoDate(weekStart),
    weekEnd: toIsoDate(weekEnd),
  };
}

export function createInitialCodexUsageForm(now = new Date()): CodexUsageFormState {
  const week = getCurrentWeekRange(now);
  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    sessionCount: "0",
    conversationCount: "0",
    turnCount: "0",
    toolCallCount: "0",
    shellCommandCount: "0",
    fileTouchCount: "0",
    testRunCount: "0",
    changedLineCount: "0",
    activeMinutes: "0",
    source: "manual",
    notes: "",
  };
}

function parseNonNegativeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function serializeCodexUsageForm(form: CodexUsageFormState): EnvironmentalImpactCodexUsageWeeklyInput {
  const numericValues = Object.fromEntries(
    NUMERIC_FIELDS.map((field) => [field, parseNonNegativeNumber(form[field])]),
  );

  return {
    weekStart: form.weekStart,
    weekEnd: form.weekEnd,
    ...numericValues,
    source: form.source,
    notes: form.notes
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export function calculateAverageWeeklyKg(
  aggregate: Pick<EnvironmentalImpactCodexUsageMonthlyEstimate, "estimatedKgCo2eProxy" | "windowWeeks"> | null,
): number | null {
  if (!aggregate || aggregate.estimatedKgCo2eProxy === null) {
    return null;
  }

  return aggregate.estimatedKgCo2eProxy / Math.max(1, aggregate.windowWeeks);
}
