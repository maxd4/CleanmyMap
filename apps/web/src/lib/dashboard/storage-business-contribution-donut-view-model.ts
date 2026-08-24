import { formatStorageBytes } from "@/lib/supabase/storage-usage";
import type {
  StorageBusinessContributionHistoryPoint,
  StorageBusinessContributionItem,
  StorageBusinessContributionReport,
} from "@/lib/supabase/storage-business-contribution";

export const STORAGE_COLORS = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#f97316",
  "#22c55e",
] as const;

export const PRESSURE_COLORS = [
  "#60a5fa",
  "#22c55e",
  "#f97316",
  "#f43f5e",
  "#c084fc",
  "#14b8a6",
  "#eab308",
] as const;

export type ContributionMetricMode = "storage" | "pressure";

export type ContributionChartItem = {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  deltaValue: number;
  deltaPercent: number | null;
  sharePercent: number;
};

export type StorageBusinessContributionDonutViewModel = {
  data: ContributionChartItem[];
  currentTotalValue: number;
  previousTotalValue: number;
  deltaValue: number;
  leadingItem: ContributionChartItem | null;
  leadingDelta: ContributionChartItem | null;
  modeColors: readonly string[];
};

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Base absente";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatPercent(Math.abs(value))}%`;
}

export function formatSignedNumber(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value))}`;
}

export function formatMonthReference(reportMonth: string | null): string {
  if (!reportMonth) {
    return "Base absente";
  }

  const parsed = new Date(`${reportMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return reportMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function getModeLabel(mode: ContributionMetricMode): string {
  return mode === "pressure" ? "Pression" : "Stockage";
}

export function getModeDescription(mode: ContributionMetricMode): string {
  return mode === "pressure"
    ? "Répartition de la pression de pilotage par métier, calculée à partir du volume, de la croissance et de l'accélération."
    : "Répartition du stockage par métier sur le mois courant, avec comparaison au mois N-1.";
}

export function getModeValueLabel(mode: ContributionMetricMode, value: number): string {
  return mode === "pressure" ? `${Math.round(value)} pts` : formatStorageBytes(value);
}

export function formatSignedStorageBytes(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatStorageBytes(Math.abs(value))}`;
}

export function getModeDeltaLabel(mode: ContributionMetricMode, value: number): string {
  return mode === "pressure" ? `${formatSignedNumber(value)} pts` : formatSignedStorageBytes(value);
}

export function getModeColors(mode: ContributionMetricMode): readonly string[] {
  return mode === "pressure" ? PRESSURE_COLORS : STORAGE_COLORS;
}

function getHistoryPoint(
  item: StorageBusinessContributionItem,
  index: number,
): StorageBusinessContributionHistoryPoint | null {
  return item.history[index] ?? null;
}

export function computePressureValue(point: {
  currentBytes: number;
  currentCount: number;
  sharePercent: number;
  deltaPercent: number | null;
  accelerationPercent: number | null;
}): number {
  const volumeScore = Math.min(14, Math.log10(point.currentBytes + 1) * 2.5);
  const shareScore = Math.min(56, point.sharePercent * 0.58);
  const growthScore = Math.min(18, Math.max(0, point.deltaPercent ?? 0) * 0.32);
  const accelerationScore = Math.min(12, Math.max(0, point.accelerationPercent ?? 0) * 0.14);
  const countScore = Math.min(8, point.currentCount * 0.45);

  return Math.max(1, Math.round(volumeScore + shareScore + growthScore + accelerationScore + countScore));
}

function resolvePressurePoint(
  item: StorageBusinessContributionItem,
  historyPoint: StorageBusinessContributionHistoryPoint | null,
  fallbackBytes: number,
  fallbackCount: number,
): {
  currentBytes: number;
  currentCount: number;
  sharePercent: number;
  deltaPercent: number | null;
  accelerationPercent: number | null;
} {
  if (historyPoint) {
    return {
      currentBytes: historyPoint.currentBytes,
      currentCount: historyPoint.currentCount,
      sharePercent: historyPoint.sharePercent,
      deltaPercent: historyPoint.deltaPercent,
      accelerationPercent: historyPoint.accelerationPercent,
    };
  }

  return {
    currentBytes: fallbackBytes,
    currentCount: fallbackCount,
    sharePercent: item.currentSharePercent,
    deltaPercent: item.deltaPercent,
    accelerationPercent: item.accelerationPercent,
  };
}

export function buildStorageChartData(
  report: StorageBusinessContributionReport,
): ContributionChartItem[] {
  const sorted = report.items
    .slice()
    .sort((left, right) => right.currentBytes - left.currentBytes);

  return sorted.map((item) => ({
    key: item.id,
    label: item.label,
    value: item.currentBytes,
    previousValue: item.previousBytes,
    deltaValue: item.deltaBytes,
    deltaPercent: item.deltaPercent,
    sharePercent: item.currentSharePercent,
  }));
}

export function buildPressureChartData(
  report: StorageBusinessContributionReport,
): ContributionChartItem[] {
  const sorted = report.items
    .slice()
    .sort((left, right) => right.currentBytes - left.currentBytes);

  const mapped = sorted.map((item) => {
    const currentPoint = resolvePressurePoint(
      item,
      getHistoryPoint(item, 0),
      item.currentBytes,
      item.currentCount,
    );
    const previousPoint = resolvePressurePoint(
      item,
      getHistoryPoint(item, 1),
      item.previousBytes,
      item.previousCount,
    );

    const currentValue = computePressureValue(currentPoint);
    const previousValue = computePressureValue(previousPoint);

    return {
      key: item.id,
      label: item.label,
      value: currentValue,
      previousValue,
      deltaValue: currentValue - previousValue,
      deltaPercent: previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : null,
      sharePercent: 0,
    };
  });

  const totalValue = mapped.reduce((sum, item) => sum + item.value, 0);

  return mapped.map((item) => ({
    ...item,
    sharePercent: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
  }));
}

export function buildStorageBusinessContributionDonutViewModel(
  report: StorageBusinessContributionReport,
  mode: ContributionMetricMode,
): StorageBusinessContributionDonutViewModel {
  const data = mode === "pressure" ? buildPressureChartData(report) : buildStorageChartData(report);
  const currentTotalValue = data.reduce((sum, item) => sum + item.value, 0);
  const previousTotalValue = data.reduce((sum, item) => sum + item.previousValue, 0);

  return {
    data,
    currentTotalValue,
    previousTotalValue,
    deltaValue: currentTotalValue - previousTotalValue,
    leadingItem: data[0] ?? null,
    leadingDelta: data.slice().sort((left, right) => right.deltaValue - left.deltaValue)[0] ?? null,
    modeColors: getModeColors(mode),
  };
}
