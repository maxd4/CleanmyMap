export const EVENT_REF_NOTE_PREFIX = "[EVENT_REF]";

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
  const stripped = raw
    .replace(/\s*\[EVENT_REF\][a-zA-Z0-9-]{6,80}\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
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
