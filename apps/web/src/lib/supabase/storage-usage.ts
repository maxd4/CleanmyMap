import {
  type StorageBusinessDomainId,
} from "./storage-business-taxonomy";
import {
  classifyStorageBusinessObject,
  type StorageBusinessClassificationSignalType,
} from "./storage-business-classification";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;
const STORAGE_HISTORY_LIMIT = 12;
const STORAGE_OBJECT_PAGE_SIZE = 1000;

const IMAGE_MIME_PREFIXES = ["image/"];
const VIDEO_MIME_PREFIXES = ["video/"];
const AUDIO_MIME_PREFIXES = ["audio/"];

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const ARCHIVE_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
]);

const MIME_EXTENSION_MAP = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["application/zip", "zip"],
  ["application/x-zip-compressed", "zip"],
  ["application/x-7z-compressed", "7z"],
  ["application/x-rar-compressed", "rar"],
  ["text/plain", "txt"],
  ["text/markdown", "md"],
  ["text/csv", "csv"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
  ["image/avif", "avif"],
  ["video/mp4", "mp4"],
  ["audio/mpeg", "mp3"],
]);

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

export type StorageUsageLargestFile = {
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

export type StorageUsageDeltaItem = {
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

export type StorageUsageReport = {
  current: StorageUsageSnapshot;
  history: StorageUsageHistoryPoint[];
  comparison: StorageUsageMonthComparison;
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

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes >= BYTES_PER_GB) {
    return `${formatNumber(bytes / BYTES_PER_GB)} GB`;
  }

  if (bytes >= BYTES_PER_MB) {
    return `${formatNumber(bytes / BYTES_PER_MB)} MB`;
  }

  if (bytes >= BYTES_PER_KB) {
    return `${formatNumber(bytes / BYTES_PER_KB)} KB`;
  }

  return `${Math.round(bytes)} B`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 10 && value % 1 !== 0 ? 2 : 0,
  }).format(value);
}

function formatMonthLabel(snapshotMonth: string): string {
  const parsed = new Date(`${snapshotMonth}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return snapshotMonth;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function extractSizeBytes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return 0;
}

function extractExtension(name: string): string {
  const fileName = name.split("/").pop() ?? name;
  const index = fileName.lastIndexOf(".");
  if (index <= 0 || index === fileName.length - 1) {
    return "";
  }
  return fileName.slice(index + 1).toLowerCase();
}

export function inferStorageFileTypeLabel(extension: string, mimeType: string | null): string {
  if (mimeType) {
    const normalized = mimeType.trim().toLowerCase();
    if (IMAGE_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return "Image";
    }
    if (VIDEO_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return "Vidéo";
    }
    if (AUDIO_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return "Audio";
    }
    if (DOCUMENT_MIME_TYPES.has(normalized)) {
      if (normalized === "text/csv") {
        return "Données";
      }
      if (normalized === "text/plain" || normalized === "text/markdown") {
        return "Texte";
      }
      return "Document";
    }
    if (ARCHIVE_MIME_TYPES.has(normalized)) {
      return "Archive";
    }
    const mapped = MIME_EXTENSION_MAP.get(normalized);
    if (mapped) {
      return mapped.toUpperCase();
    }
  }

  if (!extension) {
    return "Sans extension";
  }

  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(extension)) {
    return "Image";
  }
  if (["pdf", "doc", "docx"].includes(extension)) {
    return "Document";
  }
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return "Données";
  }
  if (["ppt", "pptx"].includes(extension)) {
    return "Présentation";
  }
  if (["zip", "rar", "7z"].includes(extension)) {
    return "Archive";
  }
  if (["mp4", "mov", "webm"].includes(extension)) {
    return "Vidéo";
  }

  return extension.toUpperCase();
}

function groupStorageObjects<T extends StorageUsageObjectRow>(
  objects: T[],
  selector: (object: T) => { key: string; label: string },
): StorageUsageBreakdownItem[] {
  const grouped = new Map<
    string,
    { label: string; bytes: number; count: number }
  >();

  for (const object of objects) {
    const size = extractSizeBytes(object.metadata?.["size"]);
    const { key, label } = selector(object);
    const current = grouped.get(key) ?? {
      label,
      bytes: 0,
      count: 0,
    };
    current.bytes += size;
    current.count += 1;
    grouped.set(key, current);
  }

  const totalBytes = objects.reduce(
    (accumulator, object) => accumulator + extractSizeBytes(object.metadata?.["size"]),
    0,
  );

  return Array.from(grouped.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      bytes: item.bytes,
      count: item.count,
      sharePercent: totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0,
      averageBytes: item.count > 0 ? item.bytes / item.count : 0,
    }))
    .sort((left, right) => {
      if (right.bytes !== left.bytes) {
        return right.bytes - left.bytes;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label, "fr");
    });
}

function buildLargestFiles(
  objects: StorageUsageObjectRow[],
  limit: number,
): StorageUsageLargestFile[] {
  return objects
    .map((object) => {
      const size = extractSizeBytes(object.metadata?.["size"]);
      const extension = extractExtension(object.name);
      const classification = classifyStorageBusinessObject({
        bucketId: object.bucket_id,
        name: object.name,
        mimeType: toStringOrNull(object.metadata?.["mimetype"]),
        metadata: object.metadata ?? null,
      });
      return {
        bucketId: object.bucket_id,
        bucketLabel: object.bucket_id,
        businessDomainId: classification.id,
        businessLabel: classification.label,
        businessSignal: classification.signal,
        businessEvidence: classification.evidence,
        businessDomain: classification.businessDomain,
        sourceTable: classification.sourceTable,
        businessContext: classification.businessContext,
        fileTypeLabel: inferStorageFileTypeLabel(extension, toStringOrNull(object.metadata?.["mimetype"])),
        name: object.name,
        extension: extension || "sans-extension",
        bytes: size,
        sizeLabel: formatStorageBytes(size),
        createdAt: toStringOrNull(object.created_at),
        updatedAt: toStringOrNull(object.updated_at),
      };
    })
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, limit);
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function buildStorageUsageSnapshot(
  objects: StorageUsageObjectRow[],
  quotaInfo: StorageQuotaInfo,
  generatedAt = new Date().toISOString(),
): StorageUsageSnapshot {
  const totalBytes = objects.reduce(
    (accumulator, object) => accumulator + extractSizeBytes(object.metadata?.["size"]),
    0,
  );
  const remainingBytes = quotaInfo.bytes - totalBytes;
  const usagePercent =
    quotaInfo.bytes > 0 ? (totalBytes / quotaInfo.bytes) * 100 : 0;

  const bucketBreakdown = groupStorageObjects(objects, (object) => ({
    key: object.bucket_id,
    label: object.bucket_id,
  }));

  const businessBreakdown = groupStorageObjects(objects, (object) => {
    const classification = classifyStorageBusinessObject({
      bucketId: object.bucket_id,
      name: object.name,
      mimeType: toStringOrNull(object.metadata?.["mimetype"]),
      metadata: object.metadata ?? null,
    });

    return {
      key: classification.id,
      label: classification.label,
    };
  });

  const extensionBreakdown = groupStorageObjects(objects, (object) => {
    const extension = extractExtension(object.name);
    const fileTypeLabel = inferStorageFileTypeLabel(
      extension,
      toStringOrNull(object.metadata?.["mimetype"]),
    );
    return {
      key: extension || "no-extension",
      label: fileTypeLabel,
    };
  });

  const warnings = [];
  if (usagePercent >= 80) {
    warnings.push("Le quota Supabase Storage approche de la limite.");
  }
  if (usagePercent >= 100) {
    warnings.push("Le quota Supabase Storage est dépassé.");
  }

  return {
    generatedAt,
    snapshotMonth: generatedAt.slice(0, 7) + "-01",
    quotaBytes: quotaInfo.bytes,
    quotaLabel: quotaInfo.label,
    totalBytes,
    totalLabel: formatStorageBytes(totalBytes),
    remainingBytes,
    remainingLabel: formatStorageBytes(Math.max(0, remainingBytes)),
    usagePercent,
    objectCount: objects.length,
    bucketCount: bucketBreakdown.length,
    bucketBreakdown,
    extensionBreakdown,
    businessBreakdown,
    largestFiles: buildLargestFiles(objects, 12),
    source: quotaInfo.source,
    warnings,
  };
}

export function compareStorageBreakdowns(
  current: StorageUsageBreakdownItem[],
  previous: StorageUsageBreakdownItem[] | null | undefined,
): StorageUsageDeltaItem[] {
  const previousByKey = new Map(
    (previous ?? []).map((item) => [item.key, item] as const),
  );

  return current
    .map((item) => {
      const previousItem = previousByKey.get(item.key);
      const previousBytes = previousItem?.bytes ?? 0;
      const deltaBytes = item.bytes - previousBytes;
      const deltaPercent =
        previousBytes > 0 ? (deltaBytes / previousBytes) * 100 : null;

      return {
        key: item.key,
        label: item.label,
        currentBytes: item.bytes,
        previousBytes,
        deltaBytes,
        deltaPercent,
      };
    })
    .filter((item) => item.deltaBytes !== 0)
    .sort((left, right) => {
      const leftAbs = Math.abs(left.deltaBytes);
      const rightAbs = Math.abs(right.deltaBytes);
      if (rightAbs !== leftAbs) {
        return rightAbs - leftAbs;
      }
      return left.label.localeCompare(right.label, "fr");
    });
}

export async function fetchAllStorageObjects<T>(
  queryBuilder: {
    select: (columns: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean },
      ) => {
        range: (from: number, to: number) => unknown;
      };
    };
  },
  columns = "bucket_id,name,created_at,updated_at,metadata",
): Promise<T[]> {
  const items: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + STORAGE_OBJECT_PAGE_SIZE - 1;
    const result = (await queryBuilder
      .select(columns)
      .order("created_at", { ascending: true })
      .range(from, to)) as {
      data: T[] | null;
      error: { message: string } | null;
    };
    const { data, error } = result;

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    items.push(...data);

    if (data.length < STORAGE_OBJECT_PAGE_SIZE) {
      break;
    }

    from += STORAGE_OBJECT_PAGE_SIZE;
  }

  return items;
}

export function toStorageUsageHistoryPoint(record: StorageUsageSnapshotRecord): StorageUsageHistoryPoint {
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
    usagePercent:
      typeof record.usage_percent === "number"
        ? record.usage_percent
        : Number(record.usage_percent),
    objectCount: record.object_count,
    bucketCount: Array.isArray(record.bucket_breakdown)
      ? record.bucket_breakdown.length
      : 0,
    bucketBreakdown: Array.isArray(record.bucket_breakdown)
      ? (record.bucket_breakdown as StorageUsageBreakdownItem[])
      : [],
    extensionBreakdown: Array.isArray(record.extension_breakdown)
      ? (record.extension_breakdown as StorageUsageBreakdownItem[])
      : [],
    businessBreakdown: Array.isArray(record.business_breakdown)
      ? (record.business_breakdown as StorageUsageBreakdownItem[])
      : [],
    largestFiles: Array.isArray(record.largest_files)
      ? (record.largest_files as StorageUsageLargestFile[])
      : [],
    source,
    warnings: Array.isArray(record.warnings)
      ? (record.warnings as string[])
      : [],
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

export function buildStorageUsageComparison(
  current: StorageUsageSnapshot,
  previous: StorageUsageSnapshot | null,
): StorageUsageMonthComparison {
  return {
    previousSnapshotMonth: previous?.snapshotMonth ?? null,
    deltaBytes: current.totalBytes - (previous?.totalBytes ?? 0),
    deltaPercent:
      previous && previous.totalBytes > 0
        ? ((current.totalBytes - previous.totalBytes) / previous.totalBytes) * 100
        : null,
    bucketGrowth: compareStorageBreakdowns(
      current.bucketBreakdown,
      previous?.bucketBreakdown,
    ).slice(0, 5),
    extensionGrowth: compareStorageBreakdowns(
      current.extensionBreakdown,
      previous?.extensionBreakdown,
    ).slice(0, 5),
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
