import type { ActionListItem } from "@/lib/actions/types";
import {
  ACTION_QUALITY_RULESET_VERSION,
  ACTION_QUALITY_WEIGHTS,
  toActionQualityGrade,
} from "./quality-rules";

export type ActionQualityGrade = "A" | "B" | "C";

export type ActionQualityBreakdown = {
  completeness: number;
  coherence: number;
  geoloc: number;
  traceability: number;
  freshness: number;
};

export type ActionQualityResult = {
  score: number;
  grade: ActionQualityGrade;
  breakdown: ActionQualityBreakdown;
  flags: string[];
  rulesVersion?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toFiniteNumber(input: unknown, fallback: number): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function hasValidDate(raw: string | null | undefined): boolean {
  if (!raw) {
    return false;
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed);
}

function parseObservedAt(item: ActionListItem): string {
  return item.contract?.dates.observedAt ?? item.action_date;
}

function parseCreatedAt(item: ActionListItem): string | null {
  return item.contract?.dates.createdAt ?? item.created_at ?? null;
}

function hasValidCoordinates(item: ActionListItem): boolean {
  const latitude = item.contract?.location.latitude ?? item.latitude;
  const longitude = item.contract?.location.longitude ?? item.longitude;
  if (latitude === null || longitude === null) {
    return false;
  }
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

function hasManualDrawing(item: ActionListItem): boolean {
  if (item.contract?.metadata.manualDrawing) {
    return true;
  }
  if (item.manual_drawing) {
    return true;
  }
  if (item.geometry_kind === "polyline" || item.geometry_kind === "polygon") {
    return true;
  }
  return false;
}

function computeCompleteness(item: ActionListItem): {
  score: number;
  flags: string[];
} {
  const checks = [
    hasValidDate(parseObservedAt(item)),
    (item.location_label ?? "").trim().length >= 3,
    toFiniteNumber(item.waste_kg, -1) >= 0,
    toFiniteNumber(item.volunteers_count, 0) >= 1,
    toFiniteNumber(item.duration_minutes, -1) >= 0,
    (item.actor_name ?? item.contract?.metadata.actorName ?? "").trim().length >
      0,
  ];

  const flags: string[] = [];
  if (!checks[1]) flags.push("Lieu incomplet");
  if (!checks[5]) flags.push("Auteur non trace");
  if (!checks[3]) flags.push("Participants absents");

  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  return { score, flags };
}

function computeCoherence(item: ActionListItem): {
  score: number;
  flags: string[];
} {
  const wasteKg = toFiniteNumber(item.waste_kg, 0);
  const butts = toFiniteNumber(item.cigarette_butts, 0);
  const volunteers = toFiniteNumber(item.volunteers_count, 0);
  const minutes = toFiniteNumber(item.duration_minutes, 0);
  const coords =
    (item.latitude === null && item.longitude === null) ||
    (item.latitude !== null &&
      item.longitude !== null &&
      item.latitude >= -90 &&
      item.latitude <= 90 &&
      item.longitude >= -180 &&
      item.longitude <= 180);

  const checks = [
    wasteKg >= 0 && wasteKg <= 1000,
    butts >= 0 && butts <= 200000,
    volunteers >= 1 && volunteers <= 500,
    minutes >= 0 && minutes <= 1440,
    coords,
  ];

  const flags: string[] = [];
  if (!checks[0]) flags.push("Poids incoherent");
  if (!checks[2]) flags.push("Volontaires incoherents");
  if (!checks[4]) flags.push("Coordonnees incoherentes");

  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  return { score, flags };
}

function computeGeoloc(item: ActionListItem): {
  score: number;
  flags: string[];
} {
  if (hasValidCoordinates(item) && hasManualDrawing(item)) {
    return { score: 100, flags: [] };
  }
  if (hasValidCoordinates(item)) {
    return { score: 80, flags: ["Trace geometrique manquante"] };
  }
  if (hasManualDrawing(item)) {
    return { score: 65, flags: ["Centroide geoloc manquant"] };
  }
  return { score: 30, flags: ["Geolocalisation faible"] };
}

function computeTraceability(item: ActionListItem): {
  score: number;
  flags: string[];
} {
  const checks = [
    (item.id ?? "").trim().length > 0,
    (item.source ?? item.contract?.source ?? "").trim().length > 0,
    hasValidDate(parseCreatedAt(item)),
    hasValidDate(parseObservedAt(item)),
  ];
  const score = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
  const flags: string[] = [];
  if (!checks[1]) flags.push("Source absente");
  if (!checks[2]) flags.push("Date creation absente");
  return { score, flags };
}

function computeFreshness(
  item: ActionListItem,
  nowMs: number,
): { score: number; flags: string[] } {
  const observed = parseObservedAt(item);
  const observedMs = new Date(observed).getTime();
  if (!Number.isFinite(observedMs)) {
    return { score: 30, flags: ["Date action invalide"] };
  }

  const ageDays = Math.max(0, (nowMs - observedMs) / DAY_MS);
  if (ageDays <= 7) return { score: 100, flags: [] };
  if (ageDays <= 30) return { score: 85, flags: [] };
  if (ageDays <= 90) return { score: 65, flags: ["Fraicheur moyenne"] };
  if (ageDays <= 180) return { score: 45, flags: ["Donnee ancienne"] };
  return { score: 25, flags: ["Donnee stale"] };
}

export function evaluateActionQuality(
  item: ActionListItem,
  now: Date = new Date(),
): ActionQualityResult {
  const nowMs = now.getTime();
  const completeness = computeCompleteness(item);
  const coherence = computeCoherence(item);
  const geoloc = computeGeoloc(item);
  const traceability = computeTraceability(item);
  const freshness = computeFreshness(item, nowMs);

  const score = Math.round(
    completeness.score * ACTION_QUALITY_WEIGHTS.completeness +
      coherence.score * ACTION_QUALITY_WEIGHTS.coherence +
      geoloc.score * ACTION_QUALITY_WEIGHTS.geoloc +
      traceability.score * ACTION_QUALITY_WEIGHTS.traceability +
      freshness.score * ACTION_QUALITY_WEIGHTS.freshness,
  );

  const flags = Array.from(
    new Set([
      ...completeness.flags,
      ...coherence.flags,
      ...geoloc.flags,
      ...traceability.flags,
      ...freshness.flags,
    ]),
  ).slice(0, 4);

  return {
    score,
    grade: toActionQualityGrade(score),
    breakdown: {
      completeness: completeness.score,
      coherence: coherence.score,
      geoloc: geoloc.score,
      traceability: traceability.score,
      freshness: freshness.score,
    },
    flags,
    rulesVersion: ACTION_QUALITY_RULESET_VERSION,
  };
}
