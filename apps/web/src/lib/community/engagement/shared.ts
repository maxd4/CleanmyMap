import { extractEventRefFromNotes } from "../../actions/event-link";
import type { ActionListItem } from "../../actions/types";

export function toFinite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return round1((numerator / denominator) * 100);
}

export function parseEventDateMs(eventDate: string): number | null {
  const ms = new Date(`${eventDate}T12:00:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function extractEventRefFromAction(item: ActionListItem): string | null {
  const candidates = [
    item.notes,
    item.notes_plain,
    item.contract?.metadata.notes,
    item.contract?.metadata.notesPlain,
  ];
  for (const candidate of candidates) {
    const ref = extractEventRefFromNotes(candidate);
    if (ref) {
      return ref;
    }
  }
  return null;
}
