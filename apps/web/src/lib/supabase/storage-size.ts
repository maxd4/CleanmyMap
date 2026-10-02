export function parseStorageSizeBytes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

export function extractStorageFileExtension(name: string): string {
  const fileName = name.split("/").pop() ?? name;
  const index = fileName.lastIndexOf(".");
  if (index <= 0 || index === fileName.length - 1) {
    return "";
  }
  return fileName.slice(index + 1).toLowerCase();
}

export function compareStorageUsageEntries(
  left: { bytes: number; count: number; label: string },
  right: { bytes: number; count: number; label: string },
): number {
  if (right.bytes !== left.bytes) {
    return right.bytes - left.bytes;
  }
  if (right.count !== left.count) {
    return right.count - left.count;
  }
  return left.label.localeCompare(right.label, "fr");
}
