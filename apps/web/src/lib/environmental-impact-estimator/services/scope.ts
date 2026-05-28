import { addWeeks } from "date-fns";
import { ENVIRONMENTAL_IMPACT_POST_DEFINITIONS } from "../constants";
import type {
  EnvironmentalImpactDataGapNote,
  EnvironmentalImpactPostDefinition,
  EnvironmentalImpactPostEstimate,
  EnvironmentalImpactScopeCurvePoint,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeInput,
  EnvironmentalImpactScopeKey,
  EnvironmentalImpactUsageProfileEstimate,
} from "../types";
import { projectUsageProfileAtWeek } from "./usage-profile";
import {
  WEEKS_PER_MONTH,
  buildScopeCurveDriverBreakdown,
  clamp,
  clampUsageMultiplier,
  formatWeekLabel,
  hasNumericInput,
  parseDateOrNull,
  round6,
  sumDefined,
} from "./utils";

export function buildPostEstimate(
  definition: EnvironmentalImpactPostDefinition,
  scopeInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactPostEstimate {
  const quantity = hasNumericInput(scopeInput?.[definition.key])
    ? scopeInput?.[definition.key] ?? null
    : null;
  const estimatedKgCo2eProxy =
    quantity === null ? null : round6(quantity * definition.proxyKgCo2ePerUnit);

  return {
    ...definition,
    quantity,
    estimatedKgCo2eProxy,
    state: quantity === null ? "missing" : "available",
  };
}

export function buildScopeStatus(availablePostCount: number, totalPostCount: number) {
  if (availablePostCount === 0) {
    return "unbound" as const;
  }

  if (availablePostCount < totalPostCount) {
    return "partial" as const;
  }

  return "ready" as const;
}

export function buildScopeEstimate(
  key: EnvironmentalImpactScopeKey,
  scopeInput: EnvironmentalImpactScopeInput | null | undefined,
): EnvironmentalImpactScopeEstimate {
  const posts = ENVIRONMENTAL_IMPACT_POST_DEFINITIONS.map((definition) =>
    buildPostEstimate(definition, scopeInput),
  );
  const availablePostCount = posts.filter((post) => post.state === "available").length;
  const missingPostCount = posts.length - availablePostCount;
  const totalKgCo2eProxy = sumDefined(
    posts.map((post) => post.estimatedKgCo2eProxy),
  );

  return {
    key,
    label:
      key === "site"
        ? "Impact total du site au jour J"
        : "Impact par utilisateur depuis la création du compte",
    periodLabel:
      key === "site" ? "Lecture globale" : "Lecture depuis ouverture du compte",
    accountCreatedAt: scopeInput?.accountCreatedAt ?? null,
    measuredAt: scopeInput?.measuredAt ?? null,
    status: buildScopeStatus(availablePostCount, posts.length),
    totalKgCo2eProxy,
    availablePostCount,
    missingPostCount,
    coveragePercent:
      posts.length > 0 ? round6((availablePostCount / posts.length) * 100) : 0,
    posts,
    curve: [],
  };
}

export function buildScopeCurveEstimate(params: {
  scope: EnvironmentalImpactScopeEstimate;
  usageProfile: EnvironmentalImpactUsageProfileEstimate;
  referencePeriodMonths: number;
  anchorDate: string;
}): EnvironmentalImpactScopeCurvePoint[] {
  const { scope, usageProfile, referencePeriodMonths, anchorDate } = params;
  const launchedAt = parseDateOrNull(anchorDate) ?? new Date(anchorDate);
  const weeks = Math.max(1, Math.round(referencePeriodMonths * WEEKS_PER_MONTH));
  const rawWeights: number[] = [];

  for (let index = 0; index <= weeks; index += 1) {
    if (index === 0) {
      rawWeights.push(0);
      continue;
    }

    const projectedUsage = projectUsageProfileAtWeek(usageProfile, index);
    const baseWeeklyPageViews = Math.max(1, usageProfile.monthlyPageViews / WEEKS_PER_MONTH);
    rawWeights.push(
      clampUsageMultiplier(projectedUsage.monthlyPageViews / Math.max(1, baseWeeklyPageViews)),
    );
  }

  const weightTotal = rawWeights.reduce((acc, value) => acc + value, 0);
  const fallbackWeight = weeks > 0 ? 1 / weeks : 1;
  const pointConfidenceBase = clamp(round6(58 + (scope.coveragePercent / 100) * 26), 46, 94);
  let cumulativeKgCo2eProxy = 0;

  return rawWeights.map((rawWeight, index) => {
    const normalizedWeight =
      index === 0
        ? 0
        : weightTotal > 0
          ? rawWeight / weightTotal
          : fallbackWeight;
    const weeklyKgCo2eProxy = round6((scope.totalKgCo2eProxy ?? 0) * normalizedWeight);
    cumulativeKgCo2eProxy = round6(cumulativeKgCo2eProxy + weeklyKgCo2eProxy);
    const pointDate = addWeeks(launchedAt, index);
    const breakdown = Object.fromEntries(
      scope.posts.map((post) => [
        post.key,
        round6((post.estimatedKgCo2eProxy ?? 0) * normalizedWeight),
      ]),
    ) as Partial<Record<EnvironmentalImpactPostDefinition["key"], number>>;
    const pointConfidence = clamp(round6(pointConfidenceBase - index * 0.18), 42, 96);
    const pointUncertainty = round6(100 - pointConfidence);

    return {
      index,
      weekLabel: formatWeekLabel(pointDate, index === 0),
      date: pointDate.toISOString(),
      weeklyKgCo2eProxy,
      cumulativeKgCo2eProxy,
      lowerKgCo2eProxy: round6(
        Math.max(0, cumulativeKgCo2eProxy * (1 - pointUncertainty / 100)),
      ),
      upperKgCo2eProxy: round6(
        cumulativeKgCo2eProxy * (1 + pointUncertainty / 100),
      ),
      confidencePercent: pointConfidence,
      breakdown,
      driverBreakdown: buildScopeCurveDriverBreakdown(breakdown, scope.key),
    };
  });
}

export function buildScopeMissingDataNotes(
  scope: EnvironmentalImpactScopeEstimate,
): EnvironmentalImpactDataGapNote[] {
  const scopeLabel = scope.key === "site" ? "Site" : "Utilisateur";

  return scope.posts
    .filter((post) => post.state === "missing")
    .map((post) => ({
      key: `${scope.key}.${post.key}`,
      title: `${scopeLabel} - ${post.label} non branché`,
      detail: `Aucune donnée directe n'est disponible pour ${post.label.toLowerCase()} sur cette portée. Le calcul conserve ce poste comme manquant au lieu de le transformer en zéro implicite.`,
      scope: scope.key,
      severity: "warn" as const,
    }));
}
