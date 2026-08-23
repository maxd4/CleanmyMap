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
  return {
    chartData: buildStorageUsageChartData(
      response?.history,
      response?.current.quotaBytes,
    ),
    comparisonData: normalizeStorageUsageComparison(response?.comparison),
  };
}
