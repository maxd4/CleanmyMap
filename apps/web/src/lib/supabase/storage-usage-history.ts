import { formatStorageBytes } from "./storage-usage-calculations";
import type {
  StorageQuotaSource,
  StorageUsageBreakdownItem,
  StorageUsageHistoryPoint,
  StorageUsageMonthComparison,
  StorageUsageSnapshot,
  StorageUsageSnapshotRecord,
} from "./storage-usage-types";

const STORAGE_HISTORY_LIMIT = 12;

function formatMonthLabel(snapshotMonth: string): string {
  const parsed = new Date(`${snapshotMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return snapshotMonth;
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(parsed);
}

function toStorageUsageHistoryPoint(record: StorageUsageSnapshotRecord): StorageUsageHistoryPoint {
  return {
    snapshotMonth: record.snapshot_month,
    monthLabel: formatMonthLabel(record.snapshot_month),
    generatedAt: record.generated_at,
    totalBytes: record.total_bytes,
    usagePercent: typeof record.usage_percent === "number"
      ? record.usage_percent
      : Number(record.usage_percent),
  };
}

export function toStorageUsageSnapshot(
  record: StorageUsageSnapshotRecord,
  source: StorageQuotaSource = "default_free",
): StorageUsageSnapshot {
  return {
    generatedAt: record.generated_at,
    snapshotMonth: record.snapshot_month,
    quotaBytes: record.quota_bytes,
    quotaLabel: formatStorageBytes(record.quota_bytes),
    totalBytes: record.total_bytes,
    totalLabel: formatStorageBytes(record.total_bytes),
    remainingBytes: record.remaining_bytes,
    remainingLabel: formatStorageBytes(Math.max(0, record.remaining_bytes)),
    usagePercent: typeof record.usage_percent === "number"
      ? record.usage_percent
      : Number(record.usage_percent),
    objectCount: record.object_count,
    bucketCount: Array.isArray(record.bucket_breakdown) ? record.bucket_breakdown.length : 0,
    bucketBreakdown: Array.isArray(record.bucket_breakdown)
      ? record.bucket_breakdown as StorageUsageBreakdownItem[]
      : [],
    extensionBreakdown: Array.isArray(record.extension_breakdown)
      ? record.extension_breakdown as StorageUsageBreakdownItem[]
      : [],
    businessBreakdown: Array.isArray(record.business_breakdown)
      ? record.business_breakdown as StorageUsageBreakdownItem[]
      : [],
    largestFiles: Array.isArray(record.largest_files)
      ? record.largest_files as StorageUsageSnapshot["largestFiles"]
      : [],
    source,
    warnings: Array.isArray(record.warnings) ? record.warnings as string[] : [],
  };
}

export function serializeStorageUsageBreakdowns(snapshot: StorageUsageSnapshot) {
  return {
    bucket_breakdown: snapshot.bucketBreakdown,
    extension_breakdown: snapshot.extensionBreakdown,
    business_breakdown: snapshot.businessBreakdown,
    largest_files: snapshot.largestFiles,
    warnings: snapshot.warnings,
  };
}

function compareStorageBreakdowns(
  current: StorageUsageBreakdownItem[],
  previous: StorageUsageBreakdownItem[] | null | undefined,
) {
  const previousByKey = new Map((previous ?? []).map((item) => [item.key, item] as const));
  return current
    .map((item) => {
      const previousItem = previousByKey.get(item.key);
      const previousBytes = previousItem?.bytes ?? 0;
      const deltaBytes = item.bytes - previousBytes;
      return {
        key: item.key,
        label: item.label,
        currentBytes: item.bytes,
        previousBytes,
        deltaBytes,
        deltaPercent: previousBytes > 0 ? (deltaBytes / previousBytes) * 100 : null,
      };
    })
    .filter((item) => item.deltaBytes !== 0)
    .sort((left, right) => {
      const leftAbs = Math.abs(left.deltaBytes);
      const rightAbs = Math.abs(right.deltaBytes);
      if (rightAbs !== leftAbs) return rightAbs - leftAbs;
      return left.label.localeCompare(right.label, "fr");
    });
}

export function buildStorageUsageComparison(
  current: StorageUsageSnapshot,
  previous: StorageUsageSnapshot | null,
): StorageUsageMonthComparison {
  return {
    previousSnapshotMonth: previous?.snapshotMonth ?? null,
    deltaBytes: current.totalBytes - (previous?.totalBytes ?? 0),
    deltaPercent: previous && previous.totalBytes > 0
      ? ((current.totalBytes - previous.totalBytes) / previous.totalBytes) * 100
      : null,
    bucketGrowth: compareStorageBreakdowns(current.bucketBreakdown, previous?.bucketBreakdown).slice(0, 5),
    extensionGrowth: compareStorageBreakdowns(current.extensionBreakdown, previous?.extensionBreakdown).slice(0, 5),
  };
}

export function buildStorageUsageHistory(
  records: StorageUsageSnapshotRecord[],
): StorageUsageHistoryPoint[] {
  return records
    .slice()
    .sort((left, right) => right.snapshot_month.localeCompare(left.snapshot_month))
    .map((record) => toStorageUsageHistoryPoint(record));
}

export function getStorageHistoryLimit(): number {
  return STORAGE_HISTORY_LIMIT;
}
