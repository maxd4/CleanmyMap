export type SpogomiGalleryPhotoStatus = "draft" | "published" | "withdrawn";

export type SpogomiGalleryPhoto = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string | null;
  credit: string | null;
  sourceUrl: string;
  ownerName: string;
  rightsStatus: "authorized";
  approvedForPublication: true;
  subjectProtectionReviewed: true;
  minorProtectionReviewed: true;
  status: SpogomiGalleryPhotoStatus;
  approvedAt: string;
  publishedAt: string | null;
  withdrawnAt: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function nonEmptyString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function safeHttpUrl(value: unknown): string | null {
  const raw = nonEmptyString(value, 2_000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeDimension(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20_000 ? value : null;
}

export function parseSpogomiGalleryPhoto(value: unknown): SpogomiGalleryPhoto | null {
  const record = asRecord(value);
  if (!record) return null;
  const status = record.status;
  if (status !== "draft" && status !== "published" && status !== "withdrawn") return null;
  const id = nonEmptyString(record.id, 120);
  const url = safeHttpUrl(record.url);
  const sourceUrl = safeHttpUrl(record.sourceUrl);
  const alt = nonEmptyString(record.alt, 300);
  const ownerName = nonEmptyString(record.ownerName, 200);
  const approvedAt = nonEmptyString(record.approvedAt, 80);
  if (!id || !url || !sourceUrl || !alt || !ownerName || !approvedAt) return null;
  if (record.rightsStatus !== "authorized" || record.approvedForPublication !== true) return null;
  if (record.subjectProtectionReviewed !== true || record.minorProtectionReviewed !== true) return null;
  if (status === "published" && !nonEmptyString(record.publishedAt, 80)) return null;
  if (status === "withdrawn" && !nonEmptyString(record.withdrawnAt, 80)) return null;
  return {
    id,
    url,
    width: safeDimension(record.width),
    height: safeDimension(record.height),
    alt,
    caption: nonEmptyString(record.caption, 500),
    credit: nonEmptyString(record.credit, 300),
    sourceUrl,
    ownerName,
    rightsStatus: "authorized",
    approvedForPublication: true,
    subjectProtectionReviewed: true,
    minorProtectionReviewed: true,
    status,
    approvedAt,
    publishedAt: nonEmptyString(record.publishedAt, 80),
    withdrawnAt: nonEmptyString(record.withdrawnAt, 80),
  };
}

export function resolvePublicSpogomiGallery(value: unknown): SpogomiGalleryPhoto[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map(parseSpogomiGalleryPhoto)
    .filter((photo): photo is SpogomiGalleryPhoto => Boolean(photo))
    .filter((photo) => photo.status === "published" && !seen.has(photo.id) && seen.add(photo.id))
    .sort((left, right) => (left.publishedAt ?? "").localeCompare(right.publishedAt ?? ""));
}

export function buildSpogomiGalleryPhotoInput(input: {
  id: string;
  url: string;
  alt: string;
  caption?: string | null;
  credit?: string | null;
  sourceUrl: string;
  ownerName: string;
  status: SpogomiGalleryPhotoStatus;
  approvedAt: string;
  publishedAt?: string | null;
  withdrawnAt?: string | null;
}): SpogomiGalleryPhoto {
  const photo = parseSpogomiGalleryPhoto({
    ...input,
    rightsStatus: "authorized",
    approvedForPublication: true,
    subjectProtectionReviewed: true,
    minorProtectionReviewed: true,
  });
  if (!photo) throw new Error("Validation: la photo SPOGOMI ne respecte pas le contrat de publication.");
  return photo;
}
