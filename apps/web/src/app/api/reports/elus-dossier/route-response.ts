import { buildDeliverableHeaders } from "@/lib/reports/http";
import { formatScorePercent } from "@/lib/formatters/score";
import {
  ELUS_DOSSIER_RESPONSE_CACHE_CONTROL,
} from "./route-scope";
import type { ElusDossierPayload } from "./route-aggregation";

function formatOptionalNumber(value: number | null, digits = 1): string {
  return value === null ? "indisponible" : value.toFixed(digits);
}

function formatOptionalSigned(value: number | null, suffix = ""): string {
  if (value === null) {
    return "indisponible";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

export function buildMarkdownPack(payload: ElusDossierPayload): string {
  const priorities = payload.decisionPriorities
    .map(
      (row, index) =>
        `${index + 1}. **${row.area}** (urgence ${row.urgency.toUpperCase()}, score ${row.normalizedScore.toFixed(1)}) - ${row.reason}`,
    )
    .join("\n");

  const territorial = payload.territorialPriorities
    .slice(0, 8)
    .map(
      (row) =>
        `- ${row.area}: ${row.normalizedScore.toFixed(1)} | ${row.actionsPerKm2.toFixed(1)} act/km2 | ${row.kgPerKm2.toFixed(1)} kg/km2 | ${row.decisionLabel}`,
    )
    .join("\n");

  const zoneComparisons = payload.zoneComparisons
    .slice(0, 12)
    .map(
      (zone) =>
        `- ${zone.area}: actions ${zone.currentActions}/${zone.previousActions} (${zone.deltaActionsAbsolute >= 0 ? "+" : ""}${zone.deltaActionsAbsolute.toFixed(1)} ; ${zone.deltaActionsPercent.toFixed(1)}%), kg ${zone.currentKg.toFixed(1)}/${zone.previousKg.toFixed(1)} (${zone.deltaKgAbsolute >= 0 ? "+" : ""}${zone.deltaKgAbsolute.toFixed(1)} ; ${zone.deltaKgPercent.toFixed(1)}%), couverture ${zone.currentCoverageRate.toFixed(1)}%/${zone.previousCoverageRate.toFixed(1)}% (${zone.deltaCoverageRateAbsolute >= 0 ? "+" : ""}${zone.deltaCoverageRateAbsolute.toFixed(1)} pt), delai moderation ${formatOptionalNumber(zone.currentModerationDelayDays)}j/${formatOptionalNumber(zone.previousModerationDelayDays)}j (${formatOptionalSigned(zone.deltaModerationDelayDaysAbsolute, "j")}). Action: ${zone.recommendedAction}`,
    )
    .join("\n");

  const availability = [
    payload.isTruncated
      ? "- Volume: partiellement charge (limite atteinte)."
      : "- Volume: aucune troncature détectée dans la fenêtre chargée.",
    payload.sourceHealth.partial
      ? "- Sources: résultat partiel, certains indicateurs ne sont pas exhaustifs."
      : "- Sources: résultat unifié sans source marquée partielle.",
    ...payload.sourceHealth.warnings.map((warning) => `- Avertissement source: ${warning}`),
  ];

  return [
    "# Dossier elu - Pack institutionnel",
    "",
    `Genere le ${payload.generatedAt}`,
    `Periode observee: ${payload.periodDays} jours`,
    "",
    "## Disponibilité des données",
    ...availability,
    "",
    "## Resume executif",
    `- Actions validees: ${payload.summary.totalActions}`,
    `- Volume collecte: ${payload.summary.totalKg.toFixed(1)} kg`,
    `- Mobilisation: ${payload.summary.totalVolunteers} benevoles`,
    `- Geocouverture: ${payload.summary.geocoverageRate}%`,
    "",
    "## Top priorites territoriales",
    priorities || "- Aucune priorite detectee.",
    "",
    "## Benchmark territorial (normalise)",
    territorial || "- Donnees insuffisantes.",
    "",
    "## Comparatif zone par zone (courant vs precedent)",
    zoneComparisons || "- Donnees zonales insuffisantes.",
    "",
    "## Comparatif N vs N-1 (trace JSON)",
    "```json",
    JSON.stringify(payload.comparison, null, 2),
    "```",
    "",
    "## Methode",
    `Version: ${payload.methodology.version} | Proxy: ${payload.methodology.proxyVersion} | Regles qualite: ${payload.methodology.qualityRulesVersion}`,
    `Score pollution moyen: ${formatScorePercent(payload.methodology.pollutionScoreAverage, 1)}`,
    "",
    "Formules:",
    ...payload.methodology.formulas.map((line) => `- ${line}`),
    "",
    "Sources:",
    ...payload.methodology.sources.map((line) => `- ${line}`),
    "",
    "Limites:",
    ...payload.methodology.limits.map((line) => `- ${line}`),
    "",
    "Marges d'erreur indicatives:",
    `- Eau sauvee: +/- ${payload.methodology.errorMargins.waterSavedLitersPct}%`,
    `- CO2 evite: +/- ${payload.methodology.errorMargins.co2AvoidedKgPct}%`,
    `- Surface nettoyee: +/- ${payload.methodology.errorMargins.surfaceCleanedM2Pct}%`,
    `- Score pollution moyen: +/- ${payload.methodology.errorMargins.pollutionScoreMeanPoints} points`,
    "",
  ].join("\n");
}

export function buildDossierResponse(payload: ElusDossierPayload, format: "json" | "md"): Response {
  const { headers: responseHeaders } = buildDeliverableHeaders({
    rubrique: "reports_elus_dossier",
    extension: format === "md" ? "md" : "json",
    contentType:
      format === "md"
        ? "text/markdown; charset=utf-8"
        : "application/json; charset=utf-8",
    cacheControl: ELUS_DOSSIER_RESPONSE_CACHE_CONTROL,
  });
  const headers: Record<string, string> = { ...responseHeaders };
  const exportWarnings = [
    ...(payload.isTruncated ? ["Dataset truncated to limit"] : []),
    ...(payload.sourceHealth.partial || payload.sourceHealth.failedSources.length > 0
      ? payload.sourceHealth.warnings.length > 0
        ? payload.sourceHealth.warnings
        : ["Source dataset partial or unavailable"]
      : []),
  ];
  if (exportWarnings.length > 0) {
    headers["X-Export-Warning"] = exportWarnings.join(" | ");
  }

  if (format === "md") {
    return new Response(buildMarkdownPack(payload), { status: 200, headers });
  }

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers,
  });
}
