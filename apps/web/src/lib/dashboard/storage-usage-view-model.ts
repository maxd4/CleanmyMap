import {
  formatStorageBytes,
  type StorageUsageBreakdownItem,
  type StorageUsageHistoryPoint,
  type StorageUsageMonthComparison,
  type StorageUsageSnapshot,
} from "@/lib/supabase/storage-usage";
import type { StorageBusinessContributionReport } from "@/lib/supabase/storage-business-contribution";
import type { StorageUsageCronStatus } from "@/lib/supabase/storage-usage-cron";

export type StorageUsageResponse = {
  status: "ok" | "degraded";
  current: StorageUsageSnapshot;
  businessContributions: StorageBusinessContributionReport;
  history: Array<
    StorageUsageHistoryPoint & {
      bucketBreakdown: StorageUsageBreakdownItem[];
      extensionBreakdown: StorageUsageBreakdownItem[];
      businessBreakdown: StorageUsageBreakdownItem[];
    }
  >;
  comparison: StorageUsageMonthComparison;
  cron: StorageUsageCronStatus;
  warnings: string[];
  timestamp: string;
  error?: string;
  details?: string;
};

export type StorageUsageChartPoint = {
  monthLabel: string;
  usedGb: number;
  quotaGb: number;
  usagePercent: number;
};

export type StorageUsageViewModel = {
  chartData: StorageUsageChartPoint[];
  comparisonData: StorageUsageMonthComparison;
  statusTone: "text-rose-400" | "text-amber-300" | "text-emerald-300";
  currentStateLabel: "Dépassé" | "Vigilance" | "Stable";
};

const BYTES_PER_GB = 1024 * 1024 * 1024;

export function formatStorageUsagePercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatStorageUsageDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatStorageBytes(Math.abs(value))}`;
}

export function buildStorageUsageChartData(
  history: StorageUsageResponse["history"] | undefined,
  quotaBytes: number | null | undefined,
): StorageUsageChartPoint[] {
  const quotaGb = (quotaBytes ?? BYTES_PER_GB) / BYTES_PER_GB;

  return (history ?? [])
    .slice()
    .reverse()
    .map((point) => ({
      monthLabel: point.monthLabel,
      usedGb: point.totalBytes / BYTES_PER_GB,
      quotaGb,
      usagePercent: point.usagePercent,
    }));
}

export function normalizeStorageUsageComparison(
  comparison: StorageUsageMonthComparison | null | undefined,
): StorageUsageMonthComparison {
  return (
    comparison ?? {
      previousSnapshotMonth: null,
      deltaBytes: 0,
      deltaPercent: null,
      bucketGrowth: [],
      extensionGrowth: [],
    }
  );
}

export function buildStorageUsageViewModel(
  response: StorageUsageResponse | undefined,
): StorageUsageViewModel {
  const usagePercent = response?.current.usagePercent ?? 0;
  const statusTone = usagePercent >= 100
    ? "text-rose-400"
    : usagePercent >= 80
      ? "text-amber-300"
      : "text-emerald-300";
  const currentStateLabel = usagePercent >= 100
    ? "Dépassé"
    : usagePercent >= 80
      ? "Vigilance"
      : "Stable";
  return {
    chartData: buildStorageUsageChartData(
      response?.history,
      response?.current.quotaBytes,
    ),
    comparisonData: normalizeStorageUsageComparison(response?.comparison),
    statusTone,
    currentStateLabel,
  };
}
