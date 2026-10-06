import { classifyStorageBusinessObject } from "./storage-business-classification";
import { compareStorageUsageEntries, extractStorageFileExtension, parseStorageSizeBytes } from "./storage-size";
import type {
  StorageQuotaInfo,
  StorageUsageBreakdownItem,
  StorageUsageObjectRow,
  StorageUsageSnapshot,
} from "./storage-usage-types";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;
const BYTES_PER_GB = BYTES_PER_MB * 1024;
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

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes >= BYTES_PER_GB) return `${formatStorageNumber(bytes / BYTES_PER_GB)} GB`;
  if (bytes >= BYTES_PER_MB) return `${formatStorageNumber(bytes / BYTES_PER_MB)} MB`;
  if (bytes >= BYTES_PER_KB) return `${formatStorageNumber(bytes / BYTES_PER_KB)} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatStorageNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value >= 10 && value % 1 !== 0 ? 2 : 0,
  }).format(value);
}

export function inferStorageFileTypeLabel(extension: string, mimeType: string | null): string {
  if (mimeType) {
    const normalized = mimeType.trim().toLowerCase();
    if (IMAGE_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "Image";
    if (VIDEO_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "Vidéo";
    if (AUDIO_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "Audio";
    if (DOCUMENT_MIME_TYPES.has(normalized)) {
      if (normalized === "text/csv") return "Données";
      if (normalized === "text/plain" || normalized === "text/markdown") return "Texte";
      return "Document";
    }
    if (ARCHIVE_MIME_TYPES.has(normalized)) return "Archive";
    const mapped = MIME_EXTENSION_MAP.get(normalized);
    if (mapped) return mapped.toUpperCase();
  }
  if (!extension) return "Sans extension";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"].includes(extension)) return "Image";
  if (["pdf", "doc", "docx"].includes(extension)) return "Document";
  if (["xls", "xlsx", "csv"].includes(extension)) return "Données";
  if (["ppt", "pptx"].includes(extension)) return "Présentation";
  if (["zip", "rar", "7z"].includes(extension)) return "Archive";
  if (["mp4", "mov", "webm"].includes(extension)) return "Vidéo";
  return extension.toUpperCase();
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function groupStorageObjects<T extends StorageUsageObjectRow>(
  objects: T[],
  selector: (object: T) => { key: string; label: string },
): StorageUsageBreakdownItem[] {
  const grouped = new Map<string, { label: string; bytes: number; count: number }>();
  for (const object of objects) {
    const size = parseStorageSizeBytes(object.metadata?.["size"]) ?? 0;
    const { key, label } = selector(object);
    const current = grouped.get(key) ?? { label, bytes: 0, count: 0 };
    current.bytes += size;
    current.count += 1;
    grouped.set(key, current);
  }
  const totalBytes = objects.reduce(
    (accumulator, object) => accumulator + (parseStorageSizeBytes(object.metadata?.["size"]) ?? 0),
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
    .sort(compareStorageUsageEntries);
}

function buildLargestFiles(objects: StorageUsageObjectRow[], limit: number) {
  return objects
    .map((object) => {
      const size = parseStorageSizeBytes(object.metadata?.["size"]) ?? 0;
      const extension = extractStorageFileExtension(object.name);
      const mimeType = toStringOrNull(object.metadata?.["mimetype"]);
      const classification = classifyStorageBusinessObject({
        bucketId: object.bucket_id,
        name: object.name,
        mimeType,
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
        fileTypeLabel: inferStorageFileTypeLabel(extension, mimeType),
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

export function buildStorageUsageSnapshot(
  objects: StorageUsageObjectRow[],
  quotaInfo: StorageQuotaInfo,
  generatedAt = new Date().toISOString(),
): StorageUsageSnapshot {
  const totalBytes = objects.reduce(
    (accumulator, object) => accumulator + (parseStorageSizeBytes(object.metadata?.["size"]) ?? 0),
    0,
  );
  const remainingBytes = quotaInfo.bytes - totalBytes;
  const usagePercent = quotaInfo.bytes > 0 ? (totalBytes / quotaInfo.bytes) * 100 : 0;
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
    return { key: classification.id, label: classification.label };
  });
  const extensionBreakdown = groupStorageObjects(objects, (object) => {
    const extension = extractStorageFileExtension(object.name);
    return {
      key: extension || "no-extension",
      label: inferStorageFileTypeLabel(extension, toStringOrNull(object.metadata?.["mimetype"])),
    };
  });
  const warnings = [];
  if (usagePercent >= 80) warnings.push("Le quota Supabase Storage approche de la limite.");
  if (usagePercent >= 100) warnings.push("Le quota Supabase Storage est dépassé.");
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
