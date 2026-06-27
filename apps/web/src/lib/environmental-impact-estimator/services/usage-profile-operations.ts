import { resolveNumber, round6 } from "./utils";
import type {
  EnvironmentalImpactInfrastructureInput,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactUsageProvenanceItem,
  EnvironmentalImpactUsageProvenanceSource,
} from "../types";

interface UsageProfileContext {
  infrastructureInput: EnvironmentalImpactInfrastructureInput | null | undefined;
  siteInput: EnvironmentalImpactScopeInput | null | undefined;
  userInput: EnvironmentalImpactScopeInput | null | undefined;
  usageInput: EnvironmentalImpactInfrastructureInput["usage"] | null;
  pushProvenance: (item: EnvironmentalImpactUsageProvenanceItem) => void;
}

function getTrafficSignalDetail(label: string): string {
  return `Dérivé du signal site ${label}`;
}

function getStorageDetail(hasSignals: boolean): string {
  return hasSignals
    ? "Dérivé des signaux de stockage du site et de l'utilisateur"
    : "Référence mensuelle minimale pour garder le poste visible";
}

function getStorageSource(hasSignals: boolean): EnvironmentalImpactUsageProvenanceSource {
  return hasSignals ? "derived" : "reference";
}

function appendDerivedSource(target: string[], hasSource: boolean, source: string) {
  if (hasSource) {
    target.push(source);
  }
}

function resolveUsageField(
  ctx: UsageProfileContext,
  key: string,
  label: string,
  inputValue: number | null | undefined,
  fallbackValue: number,
  detail: string,
  source: EnvironmentalImpactUsageProvenanceSource,
): number {
  const hasInput = inputValue !== null && inputValue !== undefined;
  const value = resolveNumber(inputValue, fallbackValue);

  ctx.pushProvenance({
    key,
    label,
    value,
    source: hasInput ? "input" : source,
    detail,
  });

  return value;
}

function resolveMonthlyStorageGbMonthsMetric(ctx: UsageProfileContext): number {
  const hasStorageSignals =
    ctx.siteInput?.storageGbMonths != null ||
    ctx.siteInput?.storedImages != null ||
    ctx.userInput?.storageGbMonths != null;

  return resolveUsageField(
    ctx,
    "monthlyStorageGbMonths",
    "Stockage GB-mois",
    ctx.usageInput?.monthlyStorageGbMonths,
    Math.max(
      0.1,
      round6(
        resolveNumber(ctx.siteInput?.storageGbMonths, 0) +
          resolveNumber(ctx.siteInput?.storedImages, 0) * 0.0025 +
          resolveNumber(ctx.userInput?.storageGbMonths, 0) * 0.35,
      ),
    ),
    getStorageDetail(hasStorageSignals),
    getStorageSource(hasStorageSignals),
  );
}

function resolveMonthlyApiRequestsMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlySessions: number,
  monthlyPdfExports: number,
): number {
  const hasSiteApiRequests = ctx.siteInput?.apiRequests != null;

  return resolveUsageField(
    ctx,
    "monthlyApiRequests",
    "Requêtes API",
    ctx.usageInput?.monthlyApiRequests,
    Math.max(
      1,
      Math.round(
        resolveNumber(ctx.siteInput?.apiRequests, monthlyPageViews * 0.32) +
          monthlySessions * 0.12 +
          monthlyPdfExports * 2,
      ),
    ),
    hasSiteApiRequests ? getTrafficSignalDetail("apiRequests") : "Dérivé des pages vues, sessions et exports",
    "derived",
  );
}

function resolveMonthlyAuthEventsMetric(
  ctx: UsageProfileContext,
  monthlyActiveUsers: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyAuthEvents",
    "Événements d'auth",
    ctx.usageInput?.monthlyAuthEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 1.45)),
    "Dérivé des utilisateurs actifs",
    "derived",
  );
}

function resolveMonthlyRealtimeEventsMetric(
  ctx: UsageProfileContext,
  monthlyActiveUsers: number,
  monthlySessions: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyRealtimeEvents",
    "Événements realtime",
    ctx.usageInput?.monthlyRealtimeEvents,
    Math.max(1, Math.round(monthlyActiveUsers * 10 + monthlySessions * 0.55)),
    "Dérivé des utilisateurs actifs et des sessions",
    "derived",
  );
}

function resolveMonthlyEgressGbMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyMapViews: number,
  monthlyStorageGbMonths: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyEgressGb",
    "Egress GB",
    ctx.usageInput?.monthlyEgressGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00008 + monthlyMapViews * 0.0014 + monthlyStorageGbMonths * 0.12),
    ),
    "Dérivé des pages vues, cartes et stockage",
    "derived",
  );
}

function resolveMonthlyBandwidthGbMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyMapViews: number,
  monthlyPdfExports: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyBandwidthGb",
    "Bande passante GB",
    ctx.usageInput?.monthlyBandwidthGb,
    Math.max(
      0.1,
      round6(monthlyPageViews * 0.00011 + monthlyMapViews * 0.0012 + monthlyPdfExports * 0.002),
    ),
    "Dérivé des pages vues, cartes et exports",
    "derived",
  );
}

function resolveMonthlyEmailsSentMetric(
  ctx: UsageProfileContext,
  monthlyActiveUsers: number,
  monthlyPdfExports: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyEmailsSent",
    "Emails envoyés",
    ctx.usageInput?.monthlyEmailsSent,
    Math.max(0, Math.round(monthlyActiveUsers * 0.08 + monthlyPdfExports * 0.15)),
    "Dérivé des utilisateurs actifs et des exports PDF",
    "derived",
  );
}

function resolveMonthlyDeploymentsMetric(
  ctx: UsageProfileContext,
  monthlyActiveUsers: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyDeployments",
    "Déploiements",
    ctx.usageInput?.monthlyDeployments,
    Math.max(1, Math.round(2 + monthlyActiveUsers / 250)),
    "Dérivé des utilisateurs actifs tant qu'aucun compteur de déploiements n'est branché",
    "derived",
  );
}

function resolveMonthlyErrorEventsMetric(
  ctx: UsageProfileContext,
  monthlyApiRequests: number,
): number {
  return resolveUsageField(
    ctx,
    "monthlyErrorEvents",
    "Erreurs",
    ctx.usageInput?.monthlyErrorEvents,
    Math.max(0, Math.round(monthlyApiRequests * 0.0025)),
    "Dérivé des requêtes API",
    "derived",
  );
}

function resolveGrowthRateMonthlyMetric(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyActiveUsers: number,
): number {
  return resolveUsageField(
    ctx,
    "growthRateMonthly",
    "Croissance mensuelle",
    ctx.usageInput?.growthRateMonthly,
    Math.min(
      0.12,
      Math.max(0.01, monthlyPageViews > 0 ? Math.min(0.1, monthlyActiveUsers / monthlyPageViews) : 0.04),
    ),
    "Dérivé des pages vues et des utilisateurs actifs",
    "derived",
  );
}

function resolveSeasonalityAmplitudeMetric(ctx: UsageProfileContext): number {
  return resolveUsageField(
    ctx,
    "seasonalityAmplitude",
    "Saisonnalité",
    ctx.usageInput?.seasonalityAmplitude,
    0.08,
    "Référence par défaut tant qu'aucune saisonnalité spécifique n'est branchée",
    "reference",
  );
}

function resolveHorizonMonthsMetric(ctx: UsageProfileContext): number {
  return resolveUsageField(
    ctx,
    "horizonMonths",
    "Horizon",
    ctx.usageInput?.horizonMonths,
    ctx.infrastructureInput?.referencePeriodMonths ?? 12,
    "Référence du cycle d'observation",
    "reference",
  );
}

export function buildUsageOperationsMetrics(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyActiveUsers: number,
  monthlySessions: number,
  monthlyPdfExports: number,
  monthlyMapViews: number,
) {
  const monthlyStorageGbMonths = resolveMonthlyStorageGbMonthsMetric(ctx);
  const monthlyApiRequests = resolveMonthlyApiRequestsMetric(ctx, monthlyPageViews, monthlySessions, monthlyPdfExports);
  return {
    monthlyStorageGbMonths,
    monthlyApiRequests,
    monthlyAuthEvents: resolveMonthlyAuthEventsMetric(ctx, monthlyActiveUsers),
    monthlyRealtimeEvents: resolveMonthlyRealtimeEventsMetric(ctx, monthlyActiveUsers, monthlySessions),
    monthlyEgressGb: resolveMonthlyEgressGbMetric(ctx, monthlyPageViews, monthlyMapViews, monthlyStorageGbMonths),
    monthlyBandwidthGb: resolveMonthlyBandwidthGbMetric(ctx, monthlyPageViews, monthlyMapViews, monthlyPdfExports),
    monthlyEmailsSent: resolveMonthlyEmailsSentMetric(ctx, monthlyActiveUsers, monthlyPdfExports),
    monthlyDeployments: resolveMonthlyDeploymentsMetric(ctx, monthlyActiveUsers),
    monthlyErrorEvents: resolveMonthlyErrorEventsMetric(ctx, monthlyApiRequests),
  };
}

export function buildUsageTrendMetrics(
  ctx: UsageProfileContext,
  monthlyPageViews: number,
  monthlyActiveUsers: number,
) {
  return {
    growthRateMonthly: resolveGrowthRateMonthlyMetric(ctx, monthlyPageViews, monthlyActiveUsers),
    seasonalityAmplitude: resolveSeasonalityAmplitudeMetric(ctx),
    horizonMonths: resolveHorizonMonthsMetric(ctx),
  };
}

export function buildUsageDerivedFrom(
  source: "input" | "derived",
  siteInput: EnvironmentalImpactScopeInput | null | undefined,
  userInput: EnvironmentalImpactScopeInput | null | undefined,
) {
  if (source === "input") {
    return [];
  }
  const derivedFrom: string[] = [];
  appendDerivedSource(derivedFrom, siteInput?.pageViews != null, "site.pageViews");
  appendDerivedSource(derivedFrom, siteInput?.apiRequests != null, "site.apiRequests");
  appendDerivedSource(derivedFrom, siteInput?.pdfExports != null, "site.pdfExports");
  appendDerivedSource(derivedFrom, siteInput?.maps != null, "site.maps");
  appendDerivedSource(derivedFrom, siteInput?.storageGbMonths != null, "site.storageGbMonths");
  appendDerivedSource(derivedFrom, siteInput?.aiCalls != null, "site.aiCalls");
  appendDerivedSource(derivedFrom, userInput?.pageViews != null, "user.pageViews");
  return derivedFrom;
}
