import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { monthKey } from "@/components/sections/rubriques/helpers";
import type { MonthRow, ReportModel, RouteStep } from "../types";
import { distanceKm, scoreAction } from "./math";
import { toFrInt, toFrNumber } from "./formatters";
import { average } from "./math";

export function buildRouteSteps(items: ActionMapItem[], maxStops: number): RouteStep[] {
  const geolocated = items
    .map((item) => {
      const coordinates = mapItemCoordinates(item);
      return {
        item,
        label: mapItemLocationLabel(item),
        kg: mapItemWasteKg(item) ?? 0,
        butts: mapItemCigaretteButts(item) ?? 0,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        item: ActionMapItem;
        label: string;
        kg: number;
        butts: number;
        latitude: number;
        longitude: number;
      } => entry.latitude !== null && entry.longitude !== null,
    )
    .sort((a, b) => scoreAction(b.kg, b.butts) - scoreAction(a.kg, a.butts))
    .slice(0, maxStops);

  const ordered = [...geolocated].sort((a, b) => {
    if (a.latitude !== b.latitude) return a.latitude - b.latitude;
    return a.longitude - b.longitude;
  });

  return ordered.map((entry, index) => {
    const previous = ordered[index - 1];
    const segmentKm = previous
      ? distanceKm(
          { latitude: previous.latitude, longitude: previous.longitude },
          { latitude: entry.latitude, longitude: entry.longitude },
        )
      : 0;
    return {
      index: index + 1,
      label: entry.label,
      kg: entry.kg,
      butts: entry.butts,
      segmentKm,
      latitude: entry.latitude,
      longitude: entry.longitude,
    };
  });
}

export function buildMonthRows(items: ActionListItem[]): MonthRow[] {
  const grouped = new Map<string, MonthRow>();
  for (const item of items) {
    const key = monthKey(item.action_date);
    const previous = grouped.get(key) ?? {
      month: key,
      actions: 0,
      kg: 0,
      butts: 0,
      volunteers: 0,
      minutes: 0,
    };
    previous.actions += 1;
    previous.kg += Number(item.waste_kg || 0);
    previous.butts += Number(item.cigarette_butts || 0);
    previous.volunteers += Number(item.volunteers_count || 0);
    previous.minutes += Number(item.duration_minutes || 0);
    grouped.set(key, previous);
  }
  return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function buildCalendarRows(now: Date): Array<[string, string, string, string]> {
  const monthLabels = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
  const entries: Array<[string, string, string, string]> = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const current = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthLabel = monthLabels[current.getMonth()];
    const slot = `${monthLabel} ${current.getFullYear()}`;
    if (offset === 0) {
      entries.push([
        `Sprint 1 - ${monthLabel}`,
        slot,
        "Consolidation data quality + moderation, socle KPI stable.",
        "Data + Ops",
      ]);
      continue;
    }
    if (offset === 1) {
      entries.push([
        `Sprint 2 - ${monthLabel}`,
        slot,
        "Accélération terrain (itinéraires, zones récurrence, couverture tracée).",
        "Ops terrain",
      ]);
      continue;
    }
    if (offset === 2) {
      entries.push([
        `Sprint 3 - ${monthLabel}`,
        slot,
        "Pack elus/institutions (benchmark, annexes, dossier budgetaire).",
        "Pilotage + Collectivites",
      ]);
      continue;
    }
    entries.push([
      `Sprint 4 - ${monthLabel}`,
      slot,
      "Diffusion nationale et boucle d'amelioration continue du rapport web.",
      "Produit + Communication",
    ]);
  }
  return entries;
}

export type ExecutiveNarrative = {
  readinessScore: number;
  readinessLabel: string;
  headline: string;
  summary: string;
  evidence: string[];
  budgetUseCases: string[];
  watchouts: string[];
};

export function buildExecutiveNarrative(report: ReportModel): ExecutiveNarrative {
  const readinessScore = average([
    report.quality.completenessScore,
    report.quality.coherenceScore,
    report.map.geoCoverage,
    report.moderation.conversion,
  ]);

  const readinessLabel =
    readinessScore >= 85
      ? "Lecture budgétaire solide"
      : readinessScore >= 70
        ? "Lecture crédible avec vigilance"
        : "Lecture à consolider";

  const topArea = report.areas[0];
  const topAreaSummary = topArea
    ? `${topArea.area} concentre ${toFrNumber(topArea.kg)} kg sur ${toFrInt(topArea.actions)} actions et reste la zone la plus sensible.`
    : "Aucune zone prioritaire n'est ressortie sur la fenêtre analysée.";

  const summary = [
    topAreaSummary,
    `La géolocalisation atteint ${toFrNumber(report.map.geoCoverage)}%, la qualité de données ${toFrNumber(report.quality.completenessScore)}% et la conversion de modération ${toFrNumber(report.moderation.conversion)}%.`,
  ].join(" ");

  return {
    readinessScore: Math.round(readinessScore * 10) / 10,
    readinessLabel,
    headline: "Rapport d'impact institutionnel prêt à diffuser",
    summary,
    evidence: [
      `${toFrInt(report.totals.actions)} actions validées`,
      `${toFrNumber(report.totals.kg)} kg collectés`,
      `${toFrNumber(report.map.geoCoverage)}% de géolocalisation`,
      `${toFrNumber(report.quality.coherenceScore)}% de cohérence`,
    ],
    budgetUseCases: [
      "Appuyer une demande de budget par la preuve territoriale.",
      "Prioriser les zones de récurrence et les renforts de terrain.",
      "Documenter la crédibilité des indicateurs avant diffusion institutionnelle.",
    ],
    watchouts: [
      `Délai de modération moyen: ${toFrNumber(report.moderation.delayDays)} jours.`,
      `Taux de traces/polygones: ${toFrNumber(report.map.traceCoverage)}%.`,
      "Les montants restent des proxies de décision et doivent être lus avec la méthodologie jointe.",
    ],
  };
}
