import { average, toFrNumber, toFrInt } from "@/components/reports/web-document/analytics";
import type { ReportModel } from "@/components/reports/web-document/types";

export type ExecutiveNarrative = {
  readinessScore: number;
  readinessLabel: string;
  headline: string;
  summary: string;
  evidence: string[];
  budgetUseCases: string[];
  watchouts: string[];
};

export function computeExecutiveNarrative(report: ReportModel): ExecutiveNarrative {
  const readinessScore = average([
    report.quality.completenessScore,
    report.quality.coherenceScore,
    report.map.geoCoverage,
    report.moderation.conversion,
  ]);

  const readinessLabel =
    readinessScore >= 85
      ? "Livrable Institutionnel (Haute Fiabilité)"
      : readinessScore >= 70
        ? "Livrable Opérationnel (Crédibilité satisfaisante)"
        : "Livrable de Travail (À consolider)";

  const topArea = report.areas[0];
  const topAreaSummary = topArea
    ? `Zone critique identifiée : ${topArea.area} (${toFrNumber(topArea.kg)} kg collectés).`
    : "Répartition homogène de l'impact sur le territoire.";

  return {
    readinessScore: Math.round(readinessScore * 10) / 10,
    readinessLabel,
    headline: "Synthèse Stratégique d'Impact",
    summary: `${topAreaSummary} La fiabilité globale est de ${toFrNumber(readinessScore)}%.`,
    evidence: [
      `${toFrInt(report.totals.actions)} interventions validées`,
      `${toFrNumber(report.totals.kg)} kg de déchets retirés`,
      `${toFrNumber(report.map.geoCoverage)}% de traçabilité spatiale`,
    ],
    budgetUseCases: [
      "Optimisation de la fréquence de collecte sur les zones de récurrence.",
      "Renforcement des campagnes de sensibilisation ciblées.",
    ],
    watchouts: [
      `Délai de traitement : ${toFrNumber(report.moderation.delayDays)} jours.`,
      "Proxies environnementaux à utiliser avec la méthodologie jointe.",
    ],
  };
}
