import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSupabaseStorageQuotaInfo } from "@/lib/supabase/storage-quota";
import {
  buildStorageUsageComparison,
  buildStorageUsageHistory,
  buildStorageUsageSnapshot,
  fetchAllStorageObjects,
  getStorageHistoryLimit,
  serializeStorageUsageBreakdowns,
  type StorageUsageHistoryPoint,
  toStorageUsageSnapshot,
  type StorageUsageMonthComparison,
  type StorageUsageSnapshot,
  type StorageUsageObjectRow,
  type StorageUsageSnapshotRecord,
} from "@/lib/supabase/storage-usage";

export type StorageUsageReport = {
  current: StorageUsageSnapshot;
  history: Array<
    StorageUsageHistoryPoint & {
      bucketBreakdown: unknown[];
      extensionBreakdown: unknown[];
      businessBreakdown: unknown[];
    }
  >;
  comparison: StorageUsageMonthComparison;
  warnings: string[];
  timestamp: string;
  snapshotMonth: string;
  snapshotPersisted: boolean;
};

function getCurrentSnapshotMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function toStorageObjectsQuery(supabase: ReturnType<typeof getSupabaseServerClient>) {
  return supabase.schema("storage").from("objects");
}

export async function captureStorageUsageReport(): Promise<StorageUsageReport> {
  const supabase = getSupabaseServerClient();
  const quotaInfo = resolveSupabaseStorageQuotaInfo();
  const generatedAt = new Date().toISOString();
  const snapshotMonth = getCurrentSnapshotMonth(new Date(generatedAt));

  const storageObjects = (await fetchAllStorageObjects(
    toStorageObjectsQuery(supabase),
  )) as StorageUsageObjectRow[];

  const currentSnapshot = buildStorageUsageSnapshot(
    storageObjects,
    quotaInfo,
    generatedAt,
  );

  const snapshotPayload = {
    snapshot_month: snapshotMonth,
    generated_at: generatedAt,
    quota_bytes: currentSnapshot.quotaBytes,
    total_bytes: currentSnapshot.totalBytes,
    remaining_bytes: currentSnapshot.remainingBytes,
    usage_percent: Number(currentSnapshot.usagePercent.toFixed(2)),
    object_count: currentSnapshot.objectCount,
    ...serializeStorageUsageBreakdowns(currentSnapshot),
  };

  const { error: snapshotError } = await supabase
    .from("supabase_storage_usage_snapshots")
    .upsert(snapshotPayload, {
      onConflict: "snapshot_month",
    });

  const historyLimit = getStorageHistoryLimit();
  const { data: historyData, error: historyError } = await supabase
    .from("supabase_storage_usage_snapshots")
    .select(
      "snapshot_month,generated_at,quota_bytes,total_bytes,remaining_bytes,usage_percent,object_count,bucket_breakdown,extension_breakdown,business_breakdown,largest_files,warnings",
    )
    .order("snapshot_month", { ascending: false })
    .limit(historyLimit);

  if (historyError) {
    throw new Error(historyError.message);
  }

  const historyRecords = (historyData ?? []) as StorageUsageSnapshotRecord[];
  const history = buildStorageUsageHistory(historyRecords);
  const historyRecordsByMonth = new Map(
    historyRecords.map((record) => [record.snapshot_month, record] as const),
  );
  const previousRecord = historyRecords.find(
    (record) => record.snapshot_month !== currentSnapshot.snapshotMonth,
  );
  const previousSnapshot = previousRecord
    ? toStorageUsageSnapshot(previousRecord, quotaInfo.source)
    : null;

  const comparison = buildStorageUsageComparison(
    currentSnapshot,
    previousSnapshot,
  );

  return {
    current: currentSnapshot,
    history: history.map((point) => {
      const record = historyRecordsByMonth.get(point.snapshotMonth);
      return {
        ...point,
        bucketBreakdown: Array.isArray(record?.bucket_breakdown)
          ? (record.bucket_breakdown as unknown[])
          : [],
        extensionBreakdown: Array.isArray(record?.extension_breakdown)
          ? (record.extension_breakdown as unknown[])
          : [],
        businessBreakdown: Array.isArray(record?.business_breakdown)
          ? (record.business_breakdown as unknown[])
          : [],
      };
    }),
    comparison,
    warnings: [
      ...currentSnapshot.warnings,
      ...(snapshotError
        ? ["Impossible d'enregistrer l'historique mensuel du stockage."]
        : []),
    ],
    timestamp: generatedAt,
    snapshotMonth,
    snapshotPersisted: !snapshotError,
  };
}
