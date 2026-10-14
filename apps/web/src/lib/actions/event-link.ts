const EVENT_REF_NOTE_PREFIX = "[EVENT_REF]";

function normalizeEventId(value: string | null | undefined): string | null {
  const candidate = (value ?? "").trim();
  if (!candidate) {
    return null;
  }
  if (!/^[a-zA-Z0-9-]{6,80}$/.test(candidate)) {
    return null;
  }
  return candidate;
}

export function extractEventRefFromNotes(
  notes: string | null | undefined,
): string | null {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return null;
  }
  const regex = /\[EVENT_REF\]([a-zA-Z0-9-]{6,80})/g;
  let match: RegExpExecArray | null = null;
  let last: string | null = null;
  while (true) {
    match = regex.exec(raw);
    if (!match) {
      break;
    }
    last = match[1];
  }
  return normalizeEventId(last);
}

export function stripEventRefFromNotes(
  notes: string | null | undefined,
): string | null {
  const raw = (notes ?? "").trim();
  if (!raw) {
    return null;
  }
  let stripped = "";
  let cursor = 0;
  while (cursor < raw.length) {
    const markerStart = raw.indexOf(EVENT_REF_NOTE_PREFIX, cursor);
    if (markerStart < 0) {
      stripped += raw.slice(cursor);
      break;
    }
    const candidateStart = markerStart + EVENT_REF_NOTE_PREFIX.length;
    let candidateEnd = candidateStart;
    while (candidateEnd < raw.length && /[a-zA-Z0-9-]/.test(raw[candidateEnd] ?? "")) candidateEnd += 1;
    const candidate = raw.slice(candidateStart, candidateEnd);
    if (!normalizeEventId(candidate)) {
      stripped += raw.slice(cursor, candidateStart);
      cursor = candidateStart;
      continue;
    }
    let replaceStart = markerStart;
    while (replaceStart > cursor && /\s/.test(raw[replaceStart - 1] ?? "")) replaceStart -= 1;
    let replaceEnd = candidateEnd;
    while (replaceEnd < raw.length && /\s/.test(raw[replaceEnd] ?? "")) replaceEnd += 1;
    stripped += raw.slice(cursor, replaceStart);
    stripped += "\n";
    cursor = replaceEnd;
  }
  while (stripped.includes("\n\n")) stripped = stripped.replaceAll("\n\n", "\n");
  stripped = stripped.trim();
  return stripped.length > 0 ? stripped : null;
}

export function appendEventRefToNotes(
  notes: string | null | undefined,
  eventId: string | null | undefined,
): string | undefined {
  const normalizedEventId = normalizeEventId(eventId);
  const cleaned = stripEventRefFromNotes(notes);
  if (!normalizedEventId) {
    return cleaned ?? undefined;
  }
  const marker = `${EVENT_REF_NOTE_PREFIX}${normalizedEventId}`;
  return cleaned ? `${cleaned}\n${marker}` : marker;
}
