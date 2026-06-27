import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveSupabaseStorageQuotaInfo } from "@/lib/supabase/storage-quota";
import { isCronSecretConfigured } from "@/lib/http/cron-auth";
import {
  buildStorageUsageCronStatus,
  type StorageUsageCronStatus,
} from "@/lib/supabase/storage-usage-cron";
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
import {
  buildStorageBusinessContributions,
  type StorageBusinessContributionAlert,
  type StorageBusinessContributionItem,
  type StorageBusinessContributionReport,
} from "@/lib/supabase/storage-business-contribution";

export type StorageUsageReport = {
  current: StorageUsageSnapshot;
  businessContributions: StorageBusinessContributionReport;
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
  cron: StorageUsageCronStatus;
};

type StorageUsageSnapshotRow = StorageUsageSnapshotRecord & {
  business_contributions: unknown;
};

function emptyStorageBusinessContributionReport(): StorageBusinessContributionReport {
  return {
    previousSnapshotMonth: null,
    historyMonths: [],
    alerts: [],
    items: [],
  };
}

function normalizeStorageBusinessContributionReport(
  value: unknown,
): StorageBusinessContributionReport {
  if (!value || typeof value !== "object") {
    return emptyStorageBusinessContributionReport();
  }

  const report = value as Partial<StorageBusinessContributionReport> & {
    alerts?: unknown;
    historyMonths?: unknown;
    items?: unknown;
  };

  return {
    previousSnapshotMonth:
      typeof report.previousSnapshotMonth === "string" ? report.previousSnapshotMonth : null,
    historyMonths: Array.isArray(report.historyMonths)
      ? report.historyMonths.filter((item): item is string => typeof item === "string")
      : [],
    alerts: Array.isArray(report.alerts) ? (report.alerts as StorageBusinessContributionAlert[]) : [],
    items: Array.isArray(report.items) ? (report.items as StorageBusinessContributionItem[]) : [],
  };
}

function getCurrentSnapshotMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function toStorageObjectsQuery(supabase: ReturnType<typeof getSupabaseServerClient>) {
  return supabase.schema("storage").from("objects");
}

async function readStorageUsageSnapshotRecords(
  supabase = getSupabaseServerClient(),
  limit = getStorageHistoryLimit(),
): Promise<StorageUsageSnapshotRow[]> {
  const { data, error } = await supabase
    .from("supabase_storage_usage_snapshots")
    .select(
      "snapshot_month,generated_at,quota_bytes,total_bytes,remaining_bytes,usage_percent,object_count,bucket_breakdown,extension_breakdown,business_breakdown,largest_files,business_contributions,warnings",
    )
    .order("snapshot_month", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StorageUsageSnapshotRow[];
}

async function buildStorageUsageReport(params: {
  persistSnapshot: boolean;
}): Promise<StorageUsageReport> {
  const supabase = getSupabaseServerClient();
  const quotaInfo = resolveSupabaseStorageQuotaInfo();
  const generatedAt = new Date().toISOString();
  const snapshotMonth = getCurrentSnapshotMonth(new Date(generatedAt));
  const cron = buildStorageUsageCronStatus(isCronSecretConfigured(), new Date(generatedAt));

  const storageObjects = (await fetchAllStorageObjects(
    toStorageObjectsQuery(supabase),
  )) as StorageUsageObjectRow[];

  const currentSnapshot = buildStorageUsageSnapshot(
    storageObjects,
    quotaInfo,
    generatedAt,
  );
  const historyLimit = getStorageHistoryLimit();
  const historyRecordsForMetrics = await readStorageUsageSnapshotRecords(supabase, historyLimit);
  const previousRecordForMetrics = historyRecordsForMetrics.find(
    (record) => record.snapshot_month !== currentSnapshot.snapshotMonth,
  );
  const previousSnapshotForMetrics = previousRecordForMetrics
    ? toStorageUsageSnapshot(previousRecordForMetrics, quotaInfo.source)
    : null;
  const businessContributionsReport = buildStorageBusinessContributions({
    objects: storageObjects,
    currentSnapshot,
    previousSnapshot: previousSnapshotForMetrics,
    historyRecords: historyRecordsForMetrics,
  });
  const snapshotPayload = {
    snapshot_month: snapshotMonth,
    generated_at: generatedAt,
    quota_bytes: currentSnapshot.quotaBytes,
    total_bytes: currentSnapshot.totalBytes,
    remaining_bytes: currentSnapshot.remainingBytes,
    usage_percent: Number(currentSnapshot.usagePercent.toFixed(2)),
    object_count: currentSnapshot.objectCount,
    ...serializeStorageUsageBreakdowns(currentSnapshot),
    business_contributions: businessContributionsReport,
  };

  const snapshotError = params.persistSnapshot
    ? (
        await supabase.from("supabase_storage_usage_snapshots").upsert(snapshotPayload, {
          onConflict: "snapshot_month",
        })
      ).error
    : null;
  const historyRecords = params.persistSnapshot
    ? await readStorageUsageSnapshotRecords(supabase, historyLimit)
    : historyRecordsForMetrics;
  const historyRecordsByMonth = new Map(
    historyRecords.map((record) => [record.snapshot_month, record] as const),
  );
  const previousRecord = historyRecords.find(
    (record) => record.snapshot_month !== currentSnapshot.snapshotMonth,
  );
  const previousSnapshot = previousRecord
    ? toStorageUsageSnapshot(previousRecord, quotaInfo.source)
    : null;
  const history = buildStorageUsageHistory(historyRecords);

  const comparison = buildStorageUsageComparison(
    currentSnapshot,
    previousSnapshot,
  );

  return {
    current: currentSnapshot,
    businessContributions: businessContributionsReport,
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
    snapshotPersisted: params.persistSnapshot ? !snapshotError : false,
    cron,
  };
}

export async function captureStorageUsageReport(): Promise<StorageUsageReport> {
  return buildStorageUsageReport({ persistSnapshot: true });
}

async function buildStoredStorageUsageReport(): Promise<StorageUsageReport> {
  const quotaInfo = resolveSupabaseStorageQuotaInfo();
  const generatedAt = new Date().toISOString();
  const snapshotMonth = getCurrentSnapshotMonth(new Date(generatedAt));
  const cron = buildStorageUsageCronStatus(isCronSecretConfigured(), new Date(generatedAt));
  const historyLimit = getStorageHistoryLimit();
  const supabase = getSupabaseServerClient();
  const historyRecords = await readStorageUsageSnapshotRecords(supabase, historyLimit);

  if (historyRecords.length === 0) {
    const currentSnapshot = buildStorageUsageSnapshot([], quotaInfo, generatedAt);

    return {
      current: currentSnapshot,
      businessContributions: emptyStorageBusinessContributionReport(),
      history: [],
      comparison: buildStorageUsageComparison(currentSnapshot, null),
      warnings: [
        ...currentSnapshot.warnings,
        "Aucun snapshot de stockage n'a encore été enregistré. Le prochain refresh planifié remplira cette vue.",
      ],
      timestamp: generatedAt,
      snapshotMonth,
      snapshotPersisted: false,
      cron,
    };
  }

  const historyRecordsByMonth = new Map(
    historyRecords.map((record) => [record.snapshot_month, record] as const),
  );
  const currentRecord = historyRecords[0] as StorageUsageSnapshotRow;
  const currentSnapshot = toStorageUsageSnapshot(currentRecord, quotaInfo.source);
  const persistedBusinessContributions = normalizeStorageBusinessContributionReport(
    currentRecord.business_contributions,
  );
  const history = buildStorageUsageHistory(historyRecords);
  const previousRecord = historyRecords.find(
    (record) => record.snapshot_month !== currentSnapshot.snapshotMonth,
  );
  const previousSnapshot = previousRecord
    ? toStorageUsageSnapshot(previousRecord, quotaInfo.source)
    : null;
  const businessContributions =
    persistedBusinessContributions.items.length > 0
      ? persistedBusinessContributions
      : buildStorageBusinessContributions({
          objects: [],
          currentSnapshot,
          previousSnapshot,
          historyRecords,
        });

  return {
    current: currentSnapshot,
    businessContributions,
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
    comparison: buildStorageUsageComparison(currentSnapshot, previousSnapshot),
    warnings: [...currentSnapshot.warnings],
    timestamp: currentSnapshot.generatedAt,
    snapshotMonth: currentSnapshot.snapshotMonth,
    snapshotPersisted: true,
    cron,
  };
}

export async function loadStorageUsageReport(): Promise<StorageUsageReport> {
  return buildStoredStorageUsageReport();
}
