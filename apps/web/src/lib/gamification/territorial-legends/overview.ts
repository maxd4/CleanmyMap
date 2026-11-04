import type { SupabaseClient } from "@supabase/supabase-js";

import { campaignYearForCivilDate } from "./campaign";
import {
  loadTerritorialLegendAwardProofs,
  loadTerritorialLegendHoldPeriods,
} from "./award-facts";
import { inclusiveCivilDays } from "./rewards";
import { buildTerritorialLegendPage, loadTerritorialLegendFacts } from "./engine";
import {
  TERRITORIAL_LEGEND_LEVELS,
  type TerritorialLegendAwardProof,
  type TerritorialLegendHoldPeriod,
  type TerritorialLegendLevel,
} from "./types";

const TERRITORIAL_OVERVIEW_SCOPE_LIMIT = 100;

export type TerritorialLegendOverviewItem = {
  /** Includes owner-eligible canonical territories even without a hold or reward. */
  level: TerritorialLegendLevel;
  territoryCode: string;
  territoryLabel: string | null;
  private: {
    rank: number | null;
    score: number;
    distinctActions: number;
    tied: boolean;
    tieSize: number;
    title: string | null;
  } | null;
  public: {
    competitorCount: number;
    maxScore: number;
    titleEligible: boolean;
    title: string | null;
    items: Array<{
      rank: number;
      publicLabel: string;
      score: number;
      distinctActions: number;
      tied: boolean;
      tieSize: number;
    }>;
  };
  currentHold: {
    startedOn: string;
    lastVerifiedOn: string;
    days: number;
  } | null;
  bestHistory: {
    campaignYear: number;
    startedOn: string;
    endedOn: string | null;
    days: number;
  } | null;
  rewards: Array<{
    awardKind: TerritorialLegendAwardProof["awardKind"];
    thresholdDays: number;
    validityStatus: TerritorialLegendAwardProof["validityStatus"];
  }>;
};

export type TerritorialLegendOverview = {
  campaignYear: number;
  windowDays: 90;
  levels: typeof TERRITORIAL_LEGEND_LEVELS;
  territories: TerritorialLegendOverviewItem[];
};

function parisDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function scopeKey(level: TerritorialLegendLevel, territoryCode: string): string {
  return `${level}:${territoryCode}`;
}

function chooseBestHistory(periods: TerritorialLegendHoldPeriod[]): TerritorialLegendOverviewItem["bestHistory"] {
  const best = periods
    .filter((period) => period.validityStatus !== "invalidated")
    .map((period) => ({
      campaignYear: period.campaignYear,
      startedOn: period.startedOn,
      endedOn: period.endedOn ?? period.lastVerifiedOn,
      days: inclusiveCivilDays(period.startedOn, period.endedOn ?? period.lastVerifiedOn),
    }))
    .sort((left, right) => right.days - left.days || right.campaignYear - left.campaignYear)[0];
  return best ?? null;
}

function toCurrentHold(period: TerritorialLegendHoldPeriod | undefined): TerritorialLegendOverviewItem["currentHold"] {
  if (!period || period.validityStatus !== "active") return null;
  return {
    startedOn: period.startedOn,
    lastVerifiedOn: period.lastVerifiedOn,
    days: inclusiveCivilDays(period.startedOn, period.lastVerifiedOn),
  };
}

function projectRewards(
  proofs: TerritorialLegendAwardProof[],
): TerritorialLegendOverviewItem["rewards"] {
  return proofs.map((proof) => ({
    awardKind: proof.awardKind,
    thresholdDays: proof.thresholdDays,
    validityStatus: proof.validityStatus,
  }));
}

export async function loadTerritorialLegendOverview(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<TerritorialLegendOverview> {
  const campaignYear = campaignYearForCivilDate(parisDate(now));
  const [proofs, periods] = await Promise.all([
    loadTerritorialLegendAwardProofs(supabase, userId, { includeInvalidated: true }),
    loadTerritorialLegendHoldPeriods(supabase, userId, { includeInvalidated: true }),
  ]);
  const facts = await loadTerritorialLegendFacts(supabase, { now, ownerUserId: userId });
  const scopes = new Map<string, { level: TerritorialLegendLevel; territoryCode: string }>();
  const labels = new Map<string, string>();
  for (const period of periods) {
    scopes.set(scopeKey(period.level, period.territoryCode), { level: period.level, territoryCode: period.territoryCode });
    labels.set(scopeKey(period.level, period.territoryCode), period.territoryLabel);
  }
  for (const proof of proofs) {
    scopes.set(scopeKey(proof.level, proof.territoryCode), { level: proof.level, territoryCode: proof.territoryCode });
  }
  for (const action of facts.actions) {
    for (const level of TERRITORIAL_LEGEND_LEVELS) {
      const territory = action.territory[level];
      if (!territory) continue;
      const key = scopeKey(level, territory.code);
      scopes.set(key, { level, territoryCode: territory.code });
      labels.set(key, territory.name);
    }
  }

  const territories = await Promise.all([...scopes.values()].slice(0, TERRITORIAL_OVERVIEW_SCOPE_LIMIT).map(async ({ level, territoryCode }) => {
    const page = buildTerritorialLegendPage({
      level,
      territoryCode,
      territoryLabel: labels.get(scopeKey(level, territoryCode)) ?? null,
      limit: 100,
      cursor: null,
      ownerUserId: userId,
      now,
      ...facts,
    });
    if (!page.owner && !periods.some((period) => period.level === level && period.territoryCode === territoryCode)
      && !proofs.some((proof) => proof.level === level && proof.territoryCode === territoryCode)) return null;
    const scopedPeriods = periods.filter((period) => period.level === level && period.territoryCode === territoryCode);
    const currentPeriod = scopedPeriods.find((period) =>
      period.campaignYear === campaignYear && period.validityStatus === "active",
    );
    const scopedProofs = proofs.filter((proof) => proof.level === level && proof.territoryCode === territoryCode);
    const privateRank = page.owner?.rank ?? null;
    return {
      level,
      territoryCode,
      territoryLabel: page.territoryLabel,
      private: page.owner
        ? {
            ...page.owner,
            title: privateRank === 1 && page.titleEligible ? page.title : null,
          }
        : null,
      public: {
        competitorCount: page.competitorCount,
        maxScore: page.maxScore,
        titleEligible: page.titleEligible,
        title: page.title,
        items: page.items,
      },
      currentHold: currentPeriod ? toCurrentHold(currentPeriod) : null,
      bestHistory: chooseBestHistory(scopedPeriods),
      rewards: projectRewards(scopedProofs.filter((proof) => proof.campaignYear === campaignYear)),
    } satisfies TerritorialLegendOverviewItem;
  })).then((items) => items.filter((item): item is TerritorialLegendOverviewItem => item !== null));

  return {
    campaignYear,
    windowDays: 90,
    levels: TERRITORIAL_LEGEND_LEVELS,
    territories: territories.sort((left, right) =>
      left.level.localeCompare(right.level) ||
      (left.territoryLabel ?? left.territoryCode).localeCompare(right.territoryLabel ?? right.territoryCode, "fr"),
    ),
  };
}
