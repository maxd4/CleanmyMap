import type { PilotageComparisonResult } from "./metrics";
import { PILOTAGE_THRESHOLDS, PRIORITIZATION_RULESET } from "./constants";
import {
  ADMIN_ROUTE,
  PILOTAGE_ROUTE,
} from "@/lib/accueil-pilotage-routes";

export type ZoneComparisonRow = {
  area: string;
  currentActions: number;
  previousActions: number;
  deltaActionsAbsolute: number;
  currentKg: number;
  previousKg: number;
  deltaKgAbsolute: number;
  deltaActionsPercent: number;
  deltaKgPercent: number;
  currentCoverageRate: number;
  previousCoverageRate: number;
  deltaCoverageRateAbsolute: number;
  deltaCoverageRatePercent: number;
  currentModerationDelayDays: number;
  previousModerationDelayDays: number;
  deltaModerationDelayDaysAbsolute: number;
  deltaModerationDelayDaysPercent: number;
  normalizedScore: number;
  urgency: "critique" | "elevee" | "moderee";
  justification: string;
  recommendedAction: string;
};

export type OperationalPriority = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  score: number;
  reason: string;
  impactEstimate: string;
  suggestedOwner: string;
  recommendedAction: {
    href: string;
    label: string;
  };
  evidence: string[];
  engineVersion: string;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function severityFromScore(score: number): OperationalPriority["severity"] {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function backlogPriority(
  comparison: PilotageComparisonResult,
): OperationalPriority {
  const pending = comparison.current.pendingCount;
  const delay = comparison.current.moderationDelayDays;
  const pendingScore = Math.min(
    100,
    (pending / PILOTAGE_THRESHOLDS.backlogCriticalCount) * 100,
  );
  const delayScore = Math.min(
    100,
    (delay / PILOTAGE_THRESHOLDS.moderationDelayCriticalDays) * 100,
  );
  const score = round1(pendingScore * 0.6 + delayScore * 0.4);

  return {
    id: "admin-backlog",
    title: "Resorber le backlog de moderation",
    severity: severityFromScore(score),
    score,
    reason:
      "Le delai de moderation et le volume pending degradent la fiabilite de publication.",
    impactEstimate:
      "Publication plus rapide des donnees et baisse du risque de pilotage en retard.",
    suggestedOwner: "Admin moderation",
    recommendedAction: { href: ADMIN_ROUTE, label: "Traiter la file admin" },
    evidence: [`Pending: ${pending}`, `Delai median: ${delay.toFixed(1)} j`],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

function qualityPriority(
  comparison: PilotageComparisonResult,
): OperationalPriority {
  const qualityScore = comparison.current.qualityScore;
  const coverageRate = comparison.current.coverageRate;
  const qualityRisk = Math.max(
    0,
    (PILOTAGE_THRESHOLDS.qualityWarningScore - qualityScore) * 3.2,
  );
  const coverageRisk = Math.max(
    0,
    (PILOTAGE_THRESHOLDS.coverageWarningRate - coverageRate) * 1.8,
  );
  const score = round1(Math.min(100, qualityRisk * 0.65 + coverageRisk * 0.35));

  return {
    id: "data-quality",
    title: "Rehausser la qualite des donnees terrain",
    severity: severityFromScore(score),
    score,
    reason:
      "La qualite et la geo-couverture conditionnent la lecture KPI et les exports institutionnels.",
    impactEstimate:
      "Moins de faux signaux KPI et meilleure defendabilite des arbitrages.",
    suggestedOwner: "Referent data quality",
    recommendedAction: {
      href: "/actions/history",
      label: "Corriger les fiches faibles",
    },
    evidence: [
      `Score qualite: ${qualityScore.toFixed(1)}/100`,
      `Geo-couverture: ${coverageRate.toFixed(1)}%`,
    ],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

function territorialPriority(zones: ZoneComparisonRow[]): OperationalPriority {
  const top = zones[0];
  if (!top) {
    return {
      id: "territorial-none",
      title: "Aucune zone prioritaire detectee",
      severity: "low",
      score: 0,
      reason:
        "Pas de signal territorial suffisamment robuste sur la fenetre courante.",
      impactEstimate:
        "Maintien d'un niveau de surveillance sans surcharge operationnelle.",
      suggestedOwner: "Coordination territoriale",
      recommendedAction: { href: PILOTAGE_ROUTE, label: "Suivre le pilotage" },
      evidence: ["Zone prioritaire: n/a"],
      engineVersion: PRIORITIZATION_RULESET.version,
    };
  }

  const progression = Math.max(0, top.deltaKgPercent);
  const score = round1(
    Math.min(100, top.normalizedScore * 0.75 + progression * 0.25),
  );

  return {
    id: `territorial-${top.area}`,
    title: `Prioriser ${top.area}`,
    severity: severityFromScore(score),
    score,
    reason:
      "La zone combine impact eleve et pression recurrente sur la periode recente.",
    impactEstimate:
      "Reduction ciblee de la pression locale via allocation terrain prioritaire.",
    suggestedOwner: "Coordination territoriale",
    recommendedAction: {
      href: PILOTAGE_ROUTE,
      label: "Ouvrir le pilotage",
    },
    evidence: [
      `Score normalise: ${top.normalizedScore.toFixed(1)}`,
      `Variation kg: ${top.deltaKgPercent.toFixed(1)}%`,
    ],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

function coveragePriority(
  comparison: PilotageComparisonResult,
): OperationalPriority {
  const coverage = comparison.current.coverageRate;
  const risk = Math.max(
    0,
    (PILOTAGE_THRESHOLDS.coverageWarningRate - coverage) * 2,
  );
  const score = round1(Math.min(100, risk));

  return {
    id: "coverage",
    title: "Renforcer la preuve spatiale",
    severity: severityFromScore(score),
    score,
    reason:
      "Les traces geolocalisees conditionnent la defendabilite des analyses de terrain.",
    impactEstimate:
      "Hausse de la fiabilite cartographique et des comparatifs inter-zones.",
    suggestedOwner: "Equipe terrain",
    recommendedAction: {
      href: "/actions/new",
      label: "Activer trace/polygone",
    },
    evidence: [`Geo-couverture: ${coverage.toFixed(1)}%`],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

function sobrietyPriority(
  comparison: PilotageComparisonResult,
): OperationalPriority {
  const iur = comparison.current.iurIndex;
  // Si l'IUR est inférieur à 1, l'impact numérique dépasse l'impact terrain (DANGER)
  const risk = Math.max(0, (2.0 - iur) * 20); 
  const score = round1(Math.min(100, risk));

  return {
    id: "sobriety",
    title: "Optimiser le rendement écologique (IUR)",
    severity: severityFromScore(score),
    score,
    reason: "L'indice d'utilité réelle est trop bas. L'infrastructure consomme trop par rapport à l'impact terrain généré.",
    impactEstimate: "Meilleure justification du projet devant les instances écologiques et baisse de l'empreinte carbone.",
    suggestedOwner: "Lead Architect / Sobriety Officer",
    recommendedAction: {
      href: "/documentation/ai-guides/impact_IA.md",
      label: "Consulter l'audit",
    },
    evidence: [`IUR Actuel: ${iur.toFixed(2)}`, "Seuil cible: > 2.00"],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

function dataIntegrityPriority(
  comparison: PilotageComparisonResult,
): OperationalPriority {
  const anomalies = comparison.current.anomaliesCount;
  const risk = Math.min(100, anomalies * 15);
  const score = round1(risk);

  return {
    id: "data-integrity",
    title: "Nettoyage du registre de données",
    severity: severityFromScore(score),
    score,
    reason: `Détection de ${anomalies} anomalies de saisie (Impact suspect ou date manquante).`,
    impactEstimate: "Fiabilisation des rapports institutionnels et de l'IUR global.",
    suggestedOwner: "Data Steward",
    recommendedAction: {
      href: ADMIN_ROUTE,
      label: "Vérifier le registre",
    },
    evidence: [`Anomalies détectées: ${anomalies}`, "Seuil tolérance: 2"],
    engineVersion: PRIORITIZATION_RULESET.version,
  };
}

export function buildOperationalPriorities(params: {
  comparison: PilotageComparisonResult;
  zones: ZoneComparisonRow[];
}): OperationalPriority[] {
  const all = [
    backlogPriority(params.comparison),
    qualityPriority(params.comparison),
    territorialPriority(params.zones),
    coveragePriority(params.comparison),
    sobrietyPriority(params.comparison),
    dataIntegrityPriority(params.comparison),
  ];

  return all
    .map((item) => {
      const weightedScore = item.id.startsWith("admin")
        ? item.score * PRIORITIZATION_RULESET.weights.backlog
        : item.id.startsWith("data")
          ? item.score * PRIORITIZATION_RULESET.weights.quality
          : item.id.startsWith("territorial")
            ? item.score * PRIORITIZATION_RULESET.weights.territorial
            : item.id.startsWith("sobriety")
              ? item.score * 0.30 
              : item.id.startsWith("data-integrity")
                ? item.score * 0.25
                : item.score * PRIORITIZATION_RULESET.weights.coverage;
      return {
        ...item,
        score: round1(weightedScore * 3),
        severity: severityFromScore(round1(weightedScore * 3)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
