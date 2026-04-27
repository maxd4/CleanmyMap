import { extractEventRefFromNotes } from "../actions/event-link";
import type { ActionListItem } from "../actions/types";

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
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
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

export function badgeFromQuality(
  avgQuality: number,
  actions: number,
  rateA: number,
): string {
  if (avgQuality >= 85 && actions >= 8 && rateA >= 0.5) {
    return "Ambassadeur qualite";
  }
  if (avgQuality >= 75 && actions >= 10) {
    return "Pilier terrain";
  }
  if (avgQuality >= 70 && actions >= 5) {
    return "Contributeur fiable";
  }
  return "En progression";
}

export function roleFromPartner(actions: number, avgQuality: number): string {
  if (actions >= 20 && avgQuality >= 75) {
    return "Coordinateur terrain";
  }
  if (actions >= 10) {
    return "Referent associatif";
  }
  return "Relais local";
}

export function capacityLabel(actions: number): string {
  const monthly = actions / 12;
  if (monthly >= 3) {
    return "Forte (>=3 sorties/mois)";
  }
  if (monthly >= 1.5) {
    return "Moyenne (1 a 3 sorties/mois)";
  }
  return "Ponctuelle (<1.5 sortie/mois)";
}

export function nextActionFromPartner(zone: string, avgQuality: number): string {
  if (avgQuality < 70) {
    return "Renforcer la qualite de declaration (preuve geo, completude).";
  }
  if (zone === "Hors arrondissement") {
    return "Preciser la zone d'action pour la prochaine intervention.";
  }
  return `Programmer une co-animation sur ${zone} avec objectif qualite maintenu.`;
}
