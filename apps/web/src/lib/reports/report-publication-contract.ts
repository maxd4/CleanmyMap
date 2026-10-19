import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import type { ReportGenerationHistoryTheme } from "./report-generation-history-contract";
import { periodLabel } from "./report-pdf-data";

export type ReportPublicLibrarySort = "asc" | "desc";
export type ReportPublicLibraryTheme = ReportGenerationHistoryTheme;
export type ReportPublicLibraryPeriod =
  | "thirty_days"
  | "three_months"
  | "six_months"
  | "twelve_months"
  | "current_year"
  | "full_history"
  | "custom_range";

export type ReportPublicLibraryRow = {
  id: string;
  title: string;
  period: string;
  scope: string;
  theme: ReportPublicLibraryTheme;
  publishedAt: string;
  authorLabel: string | null;
  viewUrl: string;
  downloadUrl: string;
};

export type ReportPublicLibraryPage = {
  rows: ReportPublicLibraryRow[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ReportPublicLibraryFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  periodId?: ReportPublicLibraryPeriod;
  theme?: ReportPublicLibraryTheme;
  sort?: ReportPublicLibrarySort;
};

export type ReportPublicationRecord = {
  id: string;
  generationId: string;
  artifactId: string;
  createdByClerkId: string;
  title: string;
  periodId: ReportPublicLibraryPeriod;
  scopeLabel: string;
  theme: ReportPublicLibraryTheme;
  publishedAt: string;
  revokedAt: string | null;
  publicAuthorLabel: string | null;
};

export class ReportPublicationProjectionError extends Error {
  constructor(message = "Ce rapport ne peut pas être publié sans exposer de données privées.") {
    super(message);
    this.name = "ReportPublicationProjectionError";
  }
}

const PRIVATE_MARKERS = new Set([
  "id",
  "uuid",
  "email",
  "phone",
  "tel",
  "clerk",
  "user",
  "owner",
  "token",
  "secret",
  "media",
  "storage",
  "signed",
  "private",
  "coordinate",
  "latitude",
  "longitude",
  "lat",
  "lon",
  "url",
]);
const UUID_HYPHEN_POSITIONS = new Set([8, 13, 18, 23]);

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAsciiDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function containsPrivateMarkerWord(value: string): boolean {
  let tokenStart = -1;
  for (let index = 0; index <= value.length; index += 1) {
    const code = index < value.length ? value.charCodeAt(index) : 0;
    if (isAsciiLetter(code)) {
      if (tokenStart < 0) tokenStart = index;
      continue;
    }
    if (tokenStart >= 0) {
      if (PRIVATE_MARKERS.has(value.slice(tokenStart, index).toLowerCase())) return true;
      tokenStart = -1;
    }
  }
  return value.toLowerCase().includes("e-mail");
}

function containsPrivateKeyMarker(value: string): boolean {
  const lowered = value.toLowerCase();
  for (const marker of PRIVATE_MARKERS) {
    let searchFrom = 0;
    while (searchFrom < lowered.length) {
      const markerIndex = lowered.indexOf(marker, searchFrom);
      if (markerIndex < 0) break;
      const before = value[markerIndex - 1];
      const after = value[markerIndex + marker.length];
      const hasLexicalBoundary =
        (markerIndex === 0 || !isAsciiLetter(before?.charCodeAt(0) ?? 0)) &&
        (markerIndex + marker.length === value.length || !isAsciiLetter(after?.charCodeAt(0) ?? 0));
      const hasCamelBoundary =
        (before !== undefined && before === before.toUpperCase() && isAsciiLetter(before.charCodeAt(0))) ||
        (after !== undefined && after === after.toUpperCase() && isAsciiLetter(after.charCodeAt(0)));
      if (hasLexicalBoundary || hasCamelBoundary) return true;
      searchFrom = markerIndex + 1;
    }
  }
  return lowered.includes("e-mail");
}

function isHexDigit(code: number): boolean {
  return isAsciiDigit(code) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}

function containsUuid(value: string): boolean {
  for (let start = 0; start + 36 <= value.length; start += 1) {
    let valid = true;
    for (let offset = 0; offset < 36; offset += 1) {
      const code = value.charCodeAt(start + offset);
      if (UUID_HYPHEN_POSITIONS.has(offset) ? code !== 45 : !isHexDigit(code)) {
        valid = false;
        break;
      }
    }
    if (valid && "12345".includes(value[start + 14]) && "89abAB".includes(value[start + 19])) return true;
  }
  return false;
}

function isEmailSegmentCharacter(code: number): boolean {
  return isAsciiLetter(code) || isAsciiDigit(code) || "+._-@".includes(String.fromCharCode(code));
}

function containsEmail(value: string): boolean {
  let segmentStart = -1;
  for (let index = 0; index <= value.length; index += 1) {
    const code = index < value.length ? value.charCodeAt(index) : 0;
    if (index < value.length && isEmailSegmentCharacter(code)) {
      if (segmentStart < 0) segmentStart = index;
      continue;
    }
    if (segmentStart < 0) continue;
    const segment = value.slice(segmentStart, index);
    const atIndex = segment.indexOf("@");
    const domain = atIndex >= 0 ? segment.slice(atIndex + 1) : "";
    const lastDot = domain.lastIndexOf(".");
    if (
      atIndex > 0 &&
      atIndex === segment.lastIndexOf("@") &&
      lastDot > 0 &&
      lastDot < domain.length - 2 &&
      domain[0] !== "-" &&
      domain.at(-1) !== "-"
    ) return true;
    segmentStart = -1;
  }
  return false;
}

function containsPhoneLikeValue(value: string): boolean {
  let segmentStart = -1;
  for (let index = 0; index <= value.length; index += 1) {
    const character = index < value.length ? value[index] : "";
    const isAllowed = index < value.length && (isAsciiDigit(value.charCodeAt(index)) || "+ .-".includes(character));
    if (isAllowed) {
      if (segmentStart < 0) segmentStart = index;
      continue;
    }
    if (segmentStart < 0) continue;
    const segment = value.slice(segmentStart, index);
    let digitCount = 0;
    let firstDigitIndex = -1;
    let lastDigitIndex = -1;
    for (const digit of segment) if (isAsciiDigit(digit.charCodeAt(0))) digitCount += 1;
    for (let digitIndex = 0; digitIndex < segment.length; digitIndex += 1) {
      if (!isAsciiDigit(segment.charCodeAt(digitIndex))) continue;
      if (firstDigitIndex < 0) firstDigitIndex = digitIndex;
      lastDigitIndex = digitIndex;
    }
    if (
      digitCount >= 9 &&
      firstDigitIndex >= 0 &&
      lastDigitIndex === segment.length - 1 &&
      segment.slice(0, firstDigitIndex).split("").every((character) => "+ .-".includes(character))
    ) return true;
    segmentStart = -1;
  }
  return false;
}

function startsWithIsoDate(value: string): boolean {
  return value.length >= 10 && value[4] === "-" && value[7] === "-" &&
    isAsciiDigit(value.charCodeAt(0)) && isAsciiDigit(value.charCodeAt(1)) &&
    isAsciiDigit(value.charCodeAt(2)) && isAsciiDigit(value.charCodeAt(3)) &&
    isAsciiDigit(value.charCodeAt(5)) && isAsciiDigit(value.charCodeAt(6)) &&
    isAsciiDigit(value.charCodeAt(8)) && isAsciiDigit(value.charCodeAt(9));
}

function containsUrl(value: string): boolean {
  const lowered = value.toLowerCase();
  return lowered.includes("://") || lowered.includes("www.");
}

function containsPrivateMarker(value: unknown): boolean {
  if (typeof value === "string") {
    const isDate = startsWithIsoDate(value);
    return containsPrivateMarkerWord(value) || containsUuid(value) || containsEmail(value) || containsUrl(value) || (!isDate && containsPhoneLikeValue(value));
  }
  if (Array.isArray(value)) return value.some(containsPrivateMarker);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => containsPrivateKeyMarker(key) || (key !== "generatedAt" && containsPrivateMarker(child)));
  }
  return false;
}

export function assertReportPublicationEligibility(
  generation: ReportGenerationSnapshotRecord,
): void {
  if (generation.scopeKind === "single_action") {
    throw new ReportPublicationProjectionError("Les rapports mono-action ne sont pas publiables dans la bibliothèque commune.");
  }
  const payload = generation.snapshot;
  if (payload.organizationName?.trim() || payload.data.rows?.length || payload.data.columns?.length) {
    throw new ReportPublicationProjectionError();
  }
  if (containsPrivateMarker(payload.title) || containsPrivateMarker(generation.scopeLabel) || containsPrivateMarker(payload.data)) {
    throw new ReportPublicationProjectionError();
  }
}

export function projectReportPublicationPreview(params: {
  generation: ReportGenerationSnapshotRecord;
  theme: ReportPublicLibraryTheme;
  artifactReady: boolean;
  publishedAt?: string | null;
}) {
  assertReportPublicationEligibility(params.generation);
  return {
    title: params.generation.snapshot.title,
    period: params.generation.snapshot.periode,
    scope: params.generation.scopeLabel,
    theme: params.theme,
    artifactReady: params.artifactReady,
    publishedAt: params.publishedAt ?? null,
    authorLabel: null,
    documentUrl: `/api/reports/generations/${encodeURIComponent(params.generation.id)}/pdf?theme=${params.theme}`,
    communicatedContent: "Le PDF réellement accessible pour cette variante, sans JSON, CSV, action ni média privé.",
  };
}

export function projectReportPublicationRow(record: ReportPublicationRecord): ReportPublicLibraryRow {
  return {
    id: record.id,
    title: record.title,
    period: periodLabel(record.periodId),
    scope: record.scopeLabel,
    theme: record.theme,
    publishedAt: record.publishedAt,
    authorLabel: record.publicAuthorLabel,
    viewUrl: `/api/reports/library/${encodeURIComponent(record.id)}/pdf`,
    downloadUrl: `/api/reports/library/${encodeURIComponent(record.id)}/pdf?download=1`,
  };
}
