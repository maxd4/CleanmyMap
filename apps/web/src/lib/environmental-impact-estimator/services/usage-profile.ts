import { ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK } from "../constants";
import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProvenanceItem,
  EnvironmentalImpactUsageProvenanceSource,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import {
  WEEKS_PER_MONTH,
  clampUsageMultiplier,
  hasScopeSignalInput,
  hasUsageInput,
  resolveNumber,
  round6,
} from "./utils";

export function buildUsageProfileEstimate(
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined,
  siteInput: EnvironmentalImpactScopeInput | null | undefined,
  userInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactUsageProfileEstimate {
  const usageInput = infrastructureInput?.usage ?? null;
  const provenance: EnvironmentalImpactUsageProvenanceItem[] = [];

  function pushProvenance(item: EnvironmentalImpactUsageProvenanceItem) {
    provenance.push(item);
  }

  function resolveField(
    key: string,
    label: string,
    inputValue: number | null | undefined,
    fallbackValue: number,
    detail: string,
    source: EnvironmentalImpactUsageProvenanceSource,
  ): number {
    const hasInput = inputValue !== null && inputValue !== undefined;
    const value = resolveNumber(inputValue, fallbackValue);

    pushProvenance({
      key,
      label,
      value,
      source: hasInput ? "input" : source,
      detail,
    });

    return value;
  }

  const sitePageViews = resolveNumber(siteInput?.pageViews, 0);
  const userPageViews = resolveNumber(userInput?.pageViews, 0);
  const fallbackPageViews = Math.max(1, sitePageViews + userPageViews);
  const monthlyPageViews = resolveField(
    "monthlyPageViews",
    "Pages vues",
    usageInput?.monthlyPageViews,
    fallbackPageViews > 1 ? fallbackPageViews : 60_000,
    sitePageViews > 0 || userPageViews > 0
      ? "Dérivé des signaux site/utilisateur"
      : "Référence mensuelle si aucun signal n'est branché",
    sitePageViews > 0 || userPageViews > 0 ? "derived" : "reference",
  );
  const monthlyActiveUsers = resolveField(
    "monthlyActiveUsers",
    "Utilisateurs actifs",
    usageInput?.monthlyActiveUsers,
    Math.max(25, Math.round(monthlyPageViews / 18)),
    "Dérivé des pages vues mensuelles",
    "derived",
  );
  const monthlySessions = resolveField(
    "monthlySessions",
    "Sessions",
    usageInput?.monthlySessions,
    Math.max(Math.round(monthlyActiveUsers * 1.8), Math.round(monthlyPageViews / 1.35)),
    "Dérivé des pages vues et des utilisateurs actifs",
    "derived",
  );
  const monthlyPdfExports = resolveField(
    "monthlyPdfExports",
    "Exports PDF",
    usageInput?.monthlyPdfExports,
    Math.max(0, Math.round(resolveNumber(siteInput?.pdfExports, monthlyPageViews * 0.004))),
    siteInput?.pdfExports != null
      ? "Dérivé du signal site pdfExports"
      : "Dérivé des pages vues du site",
    "derived",
  );
  const monthlyMapViews = resolveField(
    "monthlyMapViews",
    "Vues carte",
    usageInput?.monthlyMapViews,
    Math.max(0, Math.round(resolveNumber(siteInput?.maps, monthlyPageViews * 0.03))),
    siteInput?.maps != null
      ? "Dérivé du signal site maps"
      : "Dérivé des pages vues du site",
    "derived",
  );
  const monthlyAiCalls = resolveField(
    "monthlyAiCalls",
    "Appels IA",
    usageInput?.monthlyAiCalls,
    Math.max(0, Math.round(resolveNumber(siteInput?.aiCalls, monthlyPageViews * 0.0012))),
    siteInput?.aiCalls != null
      ? "Dérivé du signal site aiCalls"
      : "Dérivé des pages vues du site",
    "derived",
  );
  const monthlyChatgptConversationHours = resolveField(
    "monthlyChatgptConversationHours",
    "Heures GPT-5.4 mini",
    usageInput?.monthlyChatgptConversationHours,
    ENVIRONMENTAL_IMPACT_CHATGPT_EXTENDED_MODE_HOURS_PER_WEEK * WEEKS_PER_MONTH,
    "Référence CleanMyMap documentée à 2h hebdomadaires",
    "reference",
  );
  const monthlyCodexSessions = resolveField(
    "monthlyCodexSessions",
    "Sessions Codex",
    usageInput?.monthlyCodexSessions,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexConversationTurns = resolveField(
    "monthlyCodexConversationTurns",
    "Conversations Codex",
    usageInput?.monthlyCodexConversationTurns,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexToolActions = resolveField(
    "monthlyCodexToolActions",
    "Actions outillées Codex",
    usageInput?.monthlyCodexToolActions,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexShellCommands = resolveField(
    "monthlyCodexShellCommands",
    "Commandes shell Codex",
    usageInput?.monthlyCodexShellCommands,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexFilesTouched = resolveField(
    "monthlyCodexFilesTouched",
    "Fichiers touchés Codex",
    usageInput?.monthlyCodexFilesTouched,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexTestsRun = resolveField(
    "monthlyCodexTestsRun",
    "Tests Codex",
    usageInput?.monthlyCodexTestsRun,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexChangedLines = resolveField(
    "monthlyCodexChangedLines",
    "Lignes modifiées Codex",
    usageInput?.monthlyCodexChangedLines,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyCodexActiveMinutes = resolveField(
    "monthlyCodexActiveMinutes",
    "Minutes actives Codex",
    usageInput?.monthlyCodexActiveMinutes,
    0,
    "Référence zéro tant qu'aucun journal hebdomadaire n'est branché",
    "reference",
  );
  const monthlyStorageGbMonths = resolveField(
    "monthlyStorageGbMonths",
    "Stockage GB-mois",
    usageInput?.monthlyStorageGbMonths,
    Math.max(
      0.1,
      round6(
        resolveNumber(siteInput?.storageGbMonths, 0) +
          resolveNumber(siteInput?.storedImages, 0) * 0.0025 +
          resolveNumber(userInput?.storageGbMonths, 0) * 0.35,
      ),
    ),
    siteInput?.storageGbMonths != null || siteInput?.storedImages != null || userInput?.storageGbMonths != null
      ? "Dérivé des signaux de stockage du site et de l'utilisateur"
      : "Référence mensuelle minimale pour garder le poste visible",
    siteInput?.storageGbMonths != null || siteInput?.storedImages != null || userInput?.storageGbMonths != null
      ? "derived"
      : "reference",
  );
  const monthlyApiRequests = resolveField(
    "monthlyApiRequests",
    "Requêtes API",
    usageInput?.monthlyApiRequests,
    Math.max(
      1,
      Math.round(
        resolveNumber(siteInput?.apiRequests, monthlyPageViews * 0.32) +
          monthlySessions * 0.12 +
          monthlyPdfExports * 2,
      ),
    ),
    siteInput?.apiRequests != null
      ? "Dérivé du signal site apiRequests"
      : "Dérivé des pages vues, sessions et exports",
    "derived",
  );
  const monthlyAuthEvents = resolveField(
    "monthlyAuthEvents",
    "Événements d'auth",
    usageInput?.monthlyAuthEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 1.45)),
    "Dérivé des utilisateurs actifs",
    "derived",
  );
  const monthlyRealtimeEvents = resolveField(
    "monthlyRealtimeEvents",
    "Événements realtime",
    usageInput?.monthlyRealtimeEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 10 + monthlySessions * 0.55)),
    "Dérivé des utilisateurs actifs et des sessions",
    "derived",
  );
  const monthlyEgressGb = resolveField(
    "monthlyEgressGb",
    "Egress GB",
    usageInput?.monthlyEgressGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00008 + monthlyMapViews * 0.0014 + monthlyStorageGbMonths * 0.12),
    ),
    "Dérivé des pages vues, cartes et stockage",
    "derived",
  );
  const monthlyBandwidthGb = resolveField(
    "monthlyBandwidthGb",
    "Bande passante GB",
    usageInput?.monthlyBandwidthGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00011 + monthlyMapViews * 0.0012 + monthlyPdfExports * 0.002),
    ),
    "Dérivé des pages vues, cartes et exports",
    "derived",
  );
  const monthlyEmailsSent = resolveField(
    "monthlyEmailsSent",
    "Emails envoyés",
    usageInput?.monthlyEmailsSent,
    Math.max(0, Math.round(monthlyActiveUsers * 0.08 + monthlyPdfExports * 0.15)),
    "Dérivé des utilisateurs actifs et des exports PDF",
    "derived",
  );
  const monthlyDeployments = resolveField(
    "monthlyDeployments",
    "Déploiements",
    usageInput?.monthlyDeployments,
    Math.max(1, Math.round(2 + monthlyActiveUsers / 250)),
    "Dérivé des utilisateurs actifs tant qu'aucun compteur de déploiements n'est branché",
    "derived",
  );
  const monthlyErrorEvents = resolveField(
    "monthlyErrorEvents",
    "Erreurs",
    usageInput?.monthlyErrorEvents,
    Math.max(0, Math.round(monthlyApiRequests * 0.0025)),
    "Dérivé des requêtes API",
    "derived",
  );
  const growthRateMonthly = resolveField(
    "growthRateMonthly",
    "Croissance mensuelle",
    usageInput?.growthRateMonthly,
    Math.min(
      0.12,
      Math.max(0.01, monthlyPageViews > 0 ? Math.min(0.1, monthlyActiveUsers / monthlyPageViews) : 0.04),
    ),
    "Dérivé des pages vues et des utilisateurs actifs",
    "derived",
  );
  const seasonalityAmplitude = resolveField(
    "seasonalityAmplitude",
    "Saisonnalité",
    usageInput?.seasonalityAmplitude,
    0.08,
    "Référence par défaut tant qu'aucune saisonnalité spécifique n'est branchée",
    "reference",
  );
  const horizonMonths = resolveField(
    "horizonMonths",
    "Horizon",
    usageInput?.horizonMonths,
    infrastructureInput?.referencePeriodMonths ?? 12,
    "Référence du cycle d'observation",
    "reference",
  );

  const source: "input" | "derived" =
    hasUsageInput(usageInput) || hasScopeSignalInput(siteInput) || hasScopeSignalInput(userInput)
      ? "input"
      : "derived";
  const derivedFrom =
    source === "input"
    ? []
    : [
        ...(siteInput?.pageViews != null ? ["site.pageViews"] : []),
        ...(siteInput?.apiRequests != null ? ["site.apiRequests"] : []),
        ...(siteInput?.pdfExports != null ? ["site.pdfExports"] : []),
        ...(siteInput?.maps != null ? ["site.maps"] : []),
        ...(siteInput?.storageGbMonths != null ? ["site.storageGbMonths"] : []),
        ...(siteInput?.aiCalls != null ? ["site.aiCalls"] : []),
        ...(userInput?.pageViews != null ? ["user.pageViews"] : []),
      ];

  return {
    monthlyPageViews,
    monthlyActiveUsers,
    monthlySessions,
    monthlyEmailsSent,
    monthlyDeployments,
    monthlyPdfExports,
    monthlyMapViews,
    monthlyAiCalls,
    monthlyChatgptConversationHours,
    monthlyCodexSessions,
    monthlyCodexConversationTurns,
    monthlyCodexToolActions,
    monthlyCodexShellCommands,
    monthlyCodexFilesTouched,
    monthlyCodexTestsRun,
    monthlyCodexChangedLines,
    monthlyCodexActiveMinutes,
    monthlyStorageGbMonths,
    monthlyApiRequests,
    monthlyAuthEvents,
    monthlyRealtimeEvents,
    monthlyEgressGb,
    monthlyBandwidthGb,
    monthlyErrorEvents,
    growthRateMonthly,
    seasonalityAmplitude,
    horizonMonths,
    source,
    derivedFrom,
    provenance,
  };
}

export function projectUsageProfileAtWeek(
  usage: EnvironmentalImpactUsageProfileEstimate,
  weekIndex: number,
): EnvironmentalImpactUsageProfileEstimate {
  const weeklyGrowthRate = Math.pow(1 + usage.growthRateMonthly, 1 / WEEKS_PER_MONTH) - 1;
  const growthMultiplier = Math.pow(1 + weeklyGrowthRate, weekIndex);
  const seasonalMultiplier =
    1 +
    usage.seasonalityAmplitude *
      Math.sin(((weekIndex % 52) / 52) * Math.PI * 2);
  const multiplier = clampUsageMultiplier(growthMultiplier * seasonalMultiplier);
  const weeklyScale = 1 / WEEKS_PER_MONTH;

  return {
    ...usage,
    monthlyPageViews: round6(usage.monthlyPageViews * weeklyScale * multiplier),
    monthlyActiveUsers: round6(usage.monthlyActiveUsers * weeklyScale * multiplier),
    monthlySessions: round6(usage.monthlySessions * weeklyScale * multiplier),
    monthlyEmailsSent: round6(usage.monthlyEmailsSent * weeklyScale * multiplier),
    monthlyDeployments: round6(usage.monthlyDeployments * weeklyScale * multiplier),
    monthlyPdfExports: round6(usage.monthlyPdfExports * weeklyScale * multiplier),
    monthlyMapViews: round6(usage.monthlyMapViews * weeklyScale * multiplier),
    monthlyAiCalls: round6(usage.monthlyAiCalls * weeklyScale * multiplier),
    monthlyChatgptConversationHours: round6(
      usage.monthlyChatgptConversationHours * weeklyScale * multiplier,
    ),
    monthlyCodexSessions: round6(usage.monthlyCodexSessions * weeklyScale * multiplier),
    monthlyCodexConversationTurns: round6(
      usage.monthlyCodexConversationTurns * weeklyScale * multiplier,
    ),
    monthlyCodexToolActions: round6(usage.monthlyCodexToolActions * weeklyScale * multiplier),
    monthlyCodexShellCommands: round6(usage.monthlyCodexShellCommands * weeklyScale * multiplier),
    monthlyCodexFilesTouched: round6(usage.monthlyCodexFilesTouched * weeklyScale * multiplier),
    monthlyCodexTestsRun: round6(usage.monthlyCodexTestsRun * weeklyScale * multiplier),
    monthlyCodexChangedLines: round6(usage.monthlyCodexChangedLines * weeklyScale * multiplier),
    monthlyCodexActiveMinutes: round6(usage.monthlyCodexActiveMinutes * weeklyScale * multiplier),
    monthlyStorageGbMonths: round6(usage.monthlyStorageGbMonths * weeklyScale * multiplier),
    monthlyApiRequests: round6(usage.monthlyApiRequests * weeklyScale * multiplier),
    monthlyAuthEvents: round6(usage.monthlyAuthEvents * weeklyScale * multiplier),
    monthlyRealtimeEvents: round6(usage.monthlyRealtimeEvents * weeklyScale * multiplier),
    monthlyEgressGb: round6(usage.monthlyEgressGb * weeklyScale * multiplier),
    monthlyBandwidthGb: round6(usage.monthlyBandwidthGb * weeklyScale * multiplier),
    monthlyErrorEvents: round6(usage.monthlyErrorEvents * weeklyScale * multiplier),
    horizonMonths: usage.horizonMonths,
    growthRateMonthly: usage.growthRateMonthly,
    seasonalityAmplitude: usage.seasonalityAmplitude,
    source: usage.source,
    derivedFrom: usage.derivedFrom,
  };
}
