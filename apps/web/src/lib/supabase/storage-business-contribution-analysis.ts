import {
  listStorageBusinessDomains,
  type StorageBusinessDomainId,
} from "./storage-business-taxonomy";
import {
  classifyStorageBusinessObject,
} from "./storage-business-classification";
import {
  formatStorageBytes,
  inferStorageFileTypeLabel,
  type StorageUsageObjectRow,
} from "./storage-usage";
import {
  compareStorageUsageEntries,
  extractStorageFileExtension,
  parseStorageSizeBytes,
} from "./storage-size";
import type {
  StorageBusinessContributionMimeSubtype,
  StorageBusinessContributionTopFile,
} from "./storage-business-contribution-contracts";

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function classifyObject(object: StorageUsageObjectRow) {
  return classifyStorageBusinessObject({
    bucketId: object.bucket_id,
    name: object.name,
    mimeType: toStringOrNull(object.metadata?.["mimetype"]),
    metadata: object.metadata ?? null,
  });
}

export function buildStorageBusinessContributionTopFilesByDomain(
  objects: StorageUsageObjectRow[],
): Map<StorageBusinessDomainId, StorageBusinessContributionTopFile[]> {
  const grouped = new Map<StorageBusinessDomainId, StorageBusinessContributionTopFile[]>();

  for (const object of objects) {
    const size = parseStorageSizeBytes(object.metadata?.["size"]);
    if (size === null) {
      continue;
    }
    const classification = classifyObject(object);

    const current = grouped.get(classification.id) ?? [];
    current.push({
      bucketId: object.bucket_id,
      bucketLabel: object.bucket_id,
      businessSignal: classification.signal,
      businessEvidence: classification.evidence,
      businessDomain: classification.businessDomain,
      sourceTable: classification.sourceTable,
      businessContext: classification.businessContext,
      name: object.name,
      extension: extractStorageFileExtension(object.name) || "sans-extension",
      bytes: size,
      sizeLabel: formatStorageBytes(size),
      createdAt: toStringOrNull(object.created_at),
      updatedAt: toStringOrNull(object.updated_at),
    });
    grouped.set(classification.id, current);
  }

  for (const domain of listStorageBusinessDomains()) {
    const files = grouped.get(domain.id);
    if (!files) {
      continue;
    }
    files.sort((left, right) => {
      if (right.bytes !== left.bytes) {
        return right.bytes - left.bytes;
      }
      return left.name.localeCompare(right.name, "fr");
    });
    grouped.set(domain.id, files.slice(0, 3));
  }

  return grouped;
}

export function buildStorageBusinessContributionMimeSubtypesByDomain(
  objects: StorageUsageObjectRow[],
): Map<StorageBusinessDomainId, StorageBusinessContributionMimeSubtype[]> {
  const grouped = new Map<
    StorageBusinessDomainId,
    Map<string, { label: string; bytes: number; count: number; knownSizeCount: number }>
  >();

  for (const object of objects) {
    const size = parseStorageSizeBytes(object.metadata?.["size"]);
    const classification = classifyObject(object);
    const mimeType = toStringOrNull(object.metadata?.["mimetype"]);
    const extension = extractStorageFileExtension(object.name);
    const key = mimeType ?? `file-type:${extension || "sans-extension"}`;
    const label = mimeType ?? inferStorageFileTypeLabel(extension, mimeType);

    const domain = grouped.get(classification.id) ?? new Map();
    const current = domain.get(key) ?? {
      label,
      bytes: 0,
      count: 0,
      knownSizeCount: 0,
    };
    current.count += 1;
    if (size !== null) {
      current.bytes += size;
      current.knownSizeCount += 1;
    }
    domain.set(key, current);
    grouped.set(classification.id, domain);
  }

  const result = new Map<StorageBusinessDomainId, StorageBusinessContributionMimeSubtype[]>();

  for (const [domainId, entries] of grouped.entries()) {
    const sortedEntries = Array.from(entries.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        bytes: item.bytes,
        count: item.count,
        sharePercent: null,
        averageBytes: item.knownSizeCount > 0 ? item.bytes / item.knownSizeCount : null,
        knownSizeCount: item.knownSizeCount,
      }))
      .sort(compareStorageUsageEntries);

    const totalBytes = sortedEntries.reduce((sum, item) => sum + item.bytes, 0);
    const hasUnknownSizes = sortedEntries.some((item) => item.knownSizeCount < item.count);
    const topFive = sortedEntries.slice(0, 5);
    result.set(
      domainId,
      topFive.map((item) => ({
        ...item,
        sharePercent: totalBytes > 0
          ? (item.bytes / totalBytes) * 100
          : hasUnknownSizes
            ? null
            : 0,
      })),
    );
  }

  return result;
}
