import type { ActionMapItem } from "@/lib/actions/types";
import {
  computeAveragePollutionScore,
  computePollutionScoresRelativeToReferences,
  type PollutionScoreReferences,
  type PollutionScoreScope,
} from "@/lib/actions/pollution/pollution-score";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import { presentActionPollutionProjection } from "@/lib/actions/pollution/revisit-priority";
import {
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
  mapItemType,
} from "@/lib/actions/data-contract";

export type ActionPollutionScoreAvailability =
  | "available"
  | "department_unavailable";

export type ScopedActionPollutionScore = {
  score: number | null;
  historicalScore: number | null;
  wasteScore: number | null;
  buttsScore: number | null;
  departmentRelativeScore: number | null;
  availability: ActionPollutionScoreAvailability;
  source: PollutionScoreScope;
};

export const POLLUTION_SCORE_UNAVAILABLE_COLOR = "#94a3b8";

function resolveDepartmentCode(item: ActionMapItem): string | null {
  const value = item.contract?.location.departmentCode;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function unavailableDepartmentScore(): ScopedActionPollutionScore {
  return {
    score: null,
    historicalScore: null,
    wasteScore: null,
    buttsScore: null,
    departmentRelativeScore: null,
    availability: "department_unavailable",
    source: "department",
  };
}

function resolveGlobalActionScore(
  item: ActionMapItem,
  references: PollutionScoreReferences | null | undefined,
  now: string | Date | number,
  displayMode: CurrentPlaceStateMode,
  currentPlaceState: CurrentPlaceState | null,
): ScopedActionPollutionScore {
  const scores = computePollutionScoresRelativeToReferences(
    {
      wasteKg: item.waste_kg,
      cigaretteButts: item.cigarette_butts,
      volunteersCount: item.volunteers_count,
    },
    references ?? undefined,
  );
  const historicalScore = computeAveragePollutionScore(scores);
  const observedScore = mapItemPostActionPollutionScore(item) ?? historicalScore;
  const score = currentPlaceState?.score ??
    (displayMode === "observed"
      ? observedScore
      : presentActionPollutionProjection(
          historicalScore,
          mapItemObservedAt(item),
          now,
          { postActionScore: mapItemPostActionPollutionScore(item) },
        ).projectedPollutionScore);

  return {
    score,
    historicalScore,
    wasteScore: scores.wasteScore,
    buttsScore: scores.buttsScore,
    departmentRelativeScore: null,
    availability: "available",
    source: "global",
  };
}

function resolveDepartmentActionScore(
  item: ActionMapItem,
  references: PollutionScoreReferences | null | undefined,
): ScopedActionPollutionScore {
  const departmentCode = resolveDepartmentCode(item);
  const departmentReference = departmentCode
    ? references?.departmentReferences?.[departmentCode]
    : undefined;

  if (
    !departmentReference ||
    !Number.isFinite(departmentReference.eligibleActionCount) ||
    departmentReference.eligibleActionCount < 2
  ) {
    return unavailableDepartmentScore();
  }

  const scores = computePollutionScoresRelativeToReferences(
    {
      wasteKg: item.waste_kg,
      cigaretteButts: item.cigarette_butts,
      volunteersCount: item.volunteers_count,
    },
    departmentReference,
  );
  const departmentRelativeScore = computeAveragePollutionScore(scores);

  return {
    score: departmentRelativeScore,
    historicalScore: departmentRelativeScore,
    wasteScore: scores.wasteScore,
    buttsScore: scores.buttsScore,
    departmentRelativeScore,
    availability: "available",
    source: "department",
  };
}

export function resolveActionPollutionScore(
  item: ActionMapItem,
  references: PollutionScoreReferences | null | undefined,
  options: {
    scope?: PollutionScoreScope;
    now?: string | Date | number;
    displayMode?: CurrentPlaceStateMode;
    currentPlaceState?: CurrentPlaceState | null;
  } = {},
): ScopedActionPollutionScore {
  if (mapItemType(item) !== "action") {
    return options.scope === "department"
      ? unavailableDepartmentScore()
      : resolveGlobalActionScore(
          item,
          references,
          options.now ?? new Date(),
          options.displayMode ?? "projected_today",
          options.currentPlaceState ?? null,
        );
  }

  if (options.scope === "department") {
    return resolveDepartmentActionScore(item, references);
  }

  return resolveGlobalActionScore(
    item,
    references,
    options.now ?? new Date(),
    options.displayMode ?? "projected_today",
    options.currentPlaceState ?? null,
  );
}
