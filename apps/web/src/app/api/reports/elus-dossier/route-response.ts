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

function buildMarkdownPack(payload: ElusDossierPayload): string {
  const priorities = payload.decisionPriorities
    .map(
      (row, index) =>
        `${index + 1}. **${row.area}** (urgence ${row.urgency.toUpperCase()}, score ${row.normalizedScore.toFixed(1)}) - ${row.reason}`,
    )
    .join("\n");

  const actionsFailed = payload.sourceHealth.failedSources.includes("actions");
  const corpusIncomplete =
    payload.isTruncated ||
    payload.sourceHealth.partial ||
    payload.sourceHealth.failedSources.length > 0;
  const territorial = payload.territorialPriorities
    .slice(0, 8)
    .map(
      (row) =>
        `- ${row.area}: ${row.normalizedScore === null ? "non evaluable" : row.normalizedScore.toFixed(1)} | ${row.actionsPerKm2.toFixed(1)} act/km2 | ${row.kgPerKm2.toFixed(1)} kg/km2 | ${row.decisionLabel}`,
    )
    .join("\n");

  const zoneComparisons = payload.zoneComparisons
    .slice(0, 12)
    .map((zone) => {
      const currentKgLabel =
        zone.currentWasteKnownActions === 0 && zone.currentActions > 0
          ? "non renseigné"
          : zone.currentKg.toFixed(1);
      const previousKgLabel =
        zone.previousWasteKnownActions === 0 && zone.previousActions > 0
          ? "non renseigné"
          : zone.previousKg.toFixed(1);
      return `- ${zone.area}: actions ${zone.currentActions}/${zone.previousActions} (${formatOptionalSigned(zone.deltaActionsAbsolute)} ; ${formatOptionalSigned(zone.deltaActionsPercent, "%")}), kg ${currentKgLabel}/${previousKgLabel} (${formatOptionalSigned(zone.deltaKgAbsolute)} ; ${formatOptionalSigned(zone.deltaKgPercent, "%")}), couverture ${zone.currentCoverageRate.toFixed(1)}%/${zone.previousCoverageRate.toFixed(1)}% (${formatOptionalSigned(zone.deltaCoverageRateAbsolute, " pt")}), delai moderation ${formatOptionalNumber(zone.currentModerationDelayDays)}j/${formatOptionalNumber(zone.previousModerationDelayDays)}j (${formatOptionalSigned(zone.deltaModerationDelayDaysAbsolute, "j")}). Action: ${zone.recommendedAction}`;
    })
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
    ...(actionsFailed || payload.summary.totalActions === null
      ? [
          "- Actions validees: Indisponible (source actions en echec)",
          "- Volume collecte: Indisponible (source actions en echec)",
          "- Mobilisation: Indisponible (source actions en echec)",
          "- Geocouverture: Indisponible (source actions en echec)",
        ]
      : [
          `- Actions validees: ${payload.summary.totalActions}`,
          `- Volume collecte: ${payload.summary.knownWasteActions === 0 && payload.summary.totalActions > 0 ? "Non renseigné" : `${(payload.summary.totalKg ?? 0).toFixed(1)} kg`}${payload.summary.knownWasteActions !== undefined && payload.summary.knownWasteActions !== null ? ` (${payload.summary.knownWasteActions}/${payload.summary.totalActions} actions renseignées)` : ""}`,
          `- Mobilisation: ${payload.summary.volunteersKnownActions === 0 && payload.summary.totalActions > 0 ? "Non renseignée" : `${payload.summary.totalVolunteers ?? 0} benevoles`}${payload.summary.volunteersKnownActions !== undefined && payload.summary.volunteersKnownActions !== null ? ` (${payload.summary.volunteersKnownActions}/${payload.summary.totalActions} actions renseignées)` : ""}`,
          `- Geocouverture: ${payload.summary.geocoverageRate ?? 0}%`,
        ]),
    "",
    "## Top priorites territoriales",
    priorities ||
      (actionsFailed
        ? "- Non evaluable (source actions indisponible)."
        : corpusIncomplete
          ? "- Non evaluable (corpus partiel ou tronque)."
          : "- Aucune priorite detectee."),
    "",
    "## Benchmark territorial (normalise)",
    territorial ||
      (actionsFailed
        ? "- Non evaluable (source actions indisponible)."
        : "- Donnees insuffisantes."),
    "",
    "## Comparatif zone par zone (courant vs precedent)",
    zoneComparisons ||
      (actionsFailed
        ? "- Non evaluable (source actions indisponible)."
        : "- Donnees zonales insuffisantes."),
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
