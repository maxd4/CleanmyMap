export type CreatorInboxRecordCursor = {
  createdAt: string;
  id: string;
};

export type CreatorInboxHistoricalRecordCursor = {
  version: 1;
  kind: "historical";
  createdAt: string;
  id: string;
};

export type CreatorInboxPaginationCursor =
  | CreatorInboxRecordCursor
  | CreatorInboxHistoricalRecordCursor;

const CREATOR_INBOX_HISTORICAL_CURSOR_PREFIX = "historic-v1.";
const CREATOR_INBOX_HISTORICAL_CURSOR_MAX_LENGTH = 1024;
const CREATOR_INBOX_HISTORICAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function compareCreatorInboxRecordCursors(
  left: CreatorInboxRecordCursor,
  right: CreatorInboxRecordCursor,
): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);
  const leftIsValid = Number.isFinite(leftTime);
  const rightIsValid = Number.isFinite(rightTime);
  if (leftIsValid !== rightIsValid) {
    return leftIsValid ? 1 : -1;
  }
  if (leftIsValid && rightIsValid) {
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  }
  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }
  return left.id.localeCompare(right.id);
}
export function isCreatorInboxRecordCursor(
  value: unknown,
): value is CreatorInboxRecordCursor {
  if (!isRecord(value)) {
    return false;
  }
  const cursor = value;
  return (
    typeof cursor.createdAt === "string" &&
    Number.isFinite(Date.parse(cursor.createdAt)) &&
    typeof cursor.id === "string" &&
    cursor.id.trim().length > 0 &&
    cursor.id.length <= 128
  );
}

export function isCreatorInboxHistoricalRecordCursor(
  value: unknown,
): value is CreatorInboxHistoricalRecordCursor {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "createdAt,id,kind,version") {
    return false;
  }
  return (
    value.version === 1 &&
    value.kind === "historical" &&
    typeof value.createdAt === "string" &&
    value.createdAt.length > 0 &&
    value.createdAt.length <= 256 &&
    !Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.id === "string" &&
    CREATOR_INBOX_HISTORICAL_ID_PATTERN.test(value.id)
  );
}

export function createCreatorInboxContinuationCursor(value: {
  createdAt: string;
  id: string;
}): CreatorInboxPaginationCursor {
  if (isCreatorInboxRecordCursor(value as unknown)) {
    return { createdAt: value.createdAt, id: value.id };
  }
  const historicalCursor: CreatorInboxHistoricalRecordCursor = {
    version: 1,
    kind: "historical",
    createdAt: value.createdAt,
    id: value.id,
  };
  if (!isCreatorInboxHistoricalRecordCursor(historicalCursor)) {
    throw new Error("Invalid creator inbox continuation cursor.");
  }
  return historicalCursor;
}

export function encodeCreatorInboxHistoricalCursor(
  cursor: CreatorInboxHistoricalRecordCursor,
): string {
  if (!isCreatorInboxHistoricalRecordCursor(cursor)) {
    throw new Error("Invalid historical creator inbox cursor.");
  }
  const encoded = Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  return `${CREATOR_INBOX_HISTORICAL_CURSOR_PREFIX}${encoded}`;
}

export function parseCreatorInboxHistoricalCursor(
  value: string | null | undefined,
): CreatorInboxHistoricalRecordCursor | null {
  if (
    !value ||
    !value.startsWith(CREATOR_INBOX_HISTORICAL_CURSOR_PREFIX) ||
    value.length > CREATOR_INBOX_HISTORICAL_CURSOR_MAX_LENGTH
  ) {
    return null;
  }
  const encoded = value.slice(CREATOR_INBOX_HISTORICAL_CURSOR_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return null;
  }
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    if (Buffer.from(decoded, "utf8").toString("base64url") !== encoded) {
      return null;
    }
    const parsed: unknown = JSON.parse(decoded);
    return isCreatorInboxHistoricalRecordCursor(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
