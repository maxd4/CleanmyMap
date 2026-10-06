import type { StorageBusinessDomainId } from "./storage-business-taxonomy";
import type { StorageBusinessClassificationSignalType } from "./storage-business-classification";

export type StorageUsageObjectRow = {
  bucket_id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type StorageUsageBreakdownItem = {
  key: string;
  label: string;
  bytes: number;
  count: number;
  sharePercent: number;
  averageBytes: number;
};

type StorageUsageLargestFile = {
  bucketId: string;
  bucketLabel: string;
  businessDomainId?: StorageBusinessDomainId;
  businessLabel: string;
  businessSignal?: StorageBusinessClassificationSignalType;
  businessEvidence?: string;
  businessDomain?: string | null;
  sourceTable?: string | null;
  businessContext?: string | null;
  fileTypeLabel: string;
  name: string;
  extension: string;
  bytes: number;
  sizeLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StorageUsageHistoryPoint = {
  snapshotMonth: string;
  monthLabel: string;
  generatedAt: string;
  totalBytes: number;
  usagePercent: number;
};

export type StorageQuotaSource = "default_free" | "configured_gb" | "configured_bytes";

export type StorageQuotaInfo = {
  bytes: number;
  label: string;
  source: StorageQuotaSource;
  configuredValue: string | null;
};

export type StorageUsageSnapshot = {
  generatedAt: string;
  snapshotMonth: string;
  quotaBytes: number;
  quotaLabel: string;
  totalBytes: number;
  totalLabel: string;
  remainingBytes: number;
  remainingLabel: string;
  usagePercent: number;
  objectCount: number;
  bucketCount: number;
  bucketBreakdown: StorageUsageBreakdownItem[];
  extensionBreakdown: StorageUsageBreakdownItem[];
  businessBreakdown: StorageUsageBreakdownItem[];
  largestFiles: StorageUsageLargestFile[];
  source: StorageQuotaSource;
  warnings: string[];
};

type StorageUsageDeltaItem = {
  key: string;
  label: string;
  currentBytes: number;
  previousBytes: number;
  deltaBytes: number;
  deltaPercent: number | null;
};

export type StorageUsageMonthComparison = {
  previousSnapshotMonth: string | null;
  deltaBytes: number;
  deltaPercent: number | null;
  bucketGrowth: StorageUsageDeltaItem[];
  extensionGrowth: StorageUsageDeltaItem[];
};

export type StorageUsageSnapshotRecord = {
  snapshot_month: string;
  generated_at: string;
  quota_bytes: number;
  total_bytes: number;
  remaining_bytes: number;
  usage_percent: string | number;
  object_count: number;
  bucket_breakdown: unknown;
  extension_breakdown: unknown;
  business_breakdown: unknown;
  largest_files: unknown;
  business_contributions: unknown;
  warnings: unknown;
};
