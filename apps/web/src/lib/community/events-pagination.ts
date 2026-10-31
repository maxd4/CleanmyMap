export type CommunityEventsPagePhase = "upcoming" | "past";

export type CommunityEventsPageCursor = {
  version: 1;
  phase: CommunityEventsPagePhase;
  eventDate: string;
  createdAt: string;
  id: string;
};

const CURSOR_VERSION = "v1";
const MAX_ID_LENGTH = 128;
const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CREATED_AT_PATTERN = /^[0-9T:.+Z-]+$/;
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function isValidDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

function decodePart(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

function isValidCommunityEventsCursorParts(
  parts: string[],
  eventDate: string | null,
  createdAt: string | null,
  id: string | null,
): boolean {
  return parts[1] === "upcoming" || parts[1] === "past"
    ? Boolean(eventDate && createdAt && id && EVENT_DATE_PATTERN.test(eventDate) && CREATED_AT_PATTERN.test(createdAt) &&
      isValidDate(eventDate) && isValidDate(createdAt) && ID_PATTERN.test(id) && id.length <= MAX_ID_LENGTH)
    : false;
}

export function buildCommunityEventsPageCursor(
  cursor: Omit<CommunityEventsPageCursor, "version">,
): string {
  return [
    CURSOR_VERSION,
    cursor.phase,
    encodePart(cursor.eventDate),
    encodePart(cursor.createdAt),
    encodePart(cursor.id),
  ].join("|");
}

export function parseCommunityEventsPageCursor(
  value: string | null | undefined,
): CommunityEventsPageCursor | null {
  if (!value || value.length > 512) return null;

  const parts = value.split("|");
  if (parts.length !== 5 || parts[0] !== CURSOR_VERSION) return null;

  const eventDate = decodePart(parts[2]);
  const createdAt = decodePart(parts[3]);
  const id = decodePart(parts[4]);
  if (!isValidCommunityEventsCursorParts(parts, eventDate, createdAt, id)) {
    return null;
  }

  return {
    version: 1,
    phase: parts[1] as CommunityEventsPagePhase,
    eventDate: eventDate!,
    createdAt: createdAt!,
    id: id!,
  };
}
