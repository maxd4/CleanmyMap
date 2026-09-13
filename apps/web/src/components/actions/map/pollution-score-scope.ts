import type { ActionMapItem } from "@/lib/actions/types";
import {
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
  | "global_unavailable"
  | "department_unavailable"
  | "department_insufficient_data";

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
    ? value.trim().toUpperCase()
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

function insufficientDepartmentScore(): ScopedActionPollutionScore {
  return {
    score: null,
    historicalScore: null,
    wasteScore: null,
    buttsScore: null,
    departmentRelativeScore: null,
    availability: "department_insufficient_data",
    source: "department",
  };
}

function unavailableGlobalScore(): ScopedActionPollutionScore {
  return {
    score: null,
    historicalScore: null,
    wasteScore: null,
    buttsScore: null,
    departmentRelativeScore: null,
    availability: "global_unavailable",
    source: "global",
  };
}

function resolveGlobalActionScore(
  item: ActionMapItem,
  references: PollutionScoreReferences | null | undefined,
  now: string | Date | number,
  displayMode: CurrentPlaceStateMode,
  currentPlaceState: CurrentPlaceState | null,
): ScopedActionPollutionScore {
  if (!references) {
    return unavailableGlobalScore();
  }

  const scores = computePollutionScoresRelativeToReferences(
    {
      wasteKg: item.waste_kg,
      cigaretteButts: item.cigarette_butts,
      volunteersCount:
        item.contract?.metadata.volunteersCount ?? item.volunteers_count,
      durationMinutes:
        item.contract?.metadata.durationMinutes ?? item.duration_minutes,
      actionType: mapItemType(item),
      status: item.status,
      actionPhase: item.contract?.metadata.actionPhase,
    },
    references.global,
  );
  const historicalScore = scores.severityScore;
  if (historicalScore === null) {
    return unavailableGlobalScore();
  }
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

  if (!departmentReference) {
    return unavailableDepartmentScore();
  }

  if (
    !Number.isFinite(departmentReference.eligibleActionCount) ||
    departmentReference.eligibleActionCount < 2
  ) {
    return insufficientDepartmentScore();
  }

  const departmentScoringReference = {
    ...departmentReference,
    wastePerVolunteer:
      departmentReference.wasteSourceCount >= 2
        ? departmentReference.wastePerVolunteer
        : null,
    buttsPerVolunteer:
      departmentReference.buttsSourceCount >= 2
        ? departmentReference.buttsPerVolunteer
        : null,
  };

  const scores = computePollutionScoresRelativeToReferences(
    {
      wasteKg: item.waste_kg,
      cigaretteButts: item.cigarette_butts,
      volunteersCount:
        item.contract?.metadata.volunteersCount ?? item.volunteers_count,
      durationMinutes:
        item.contract?.metadata.durationMinutes ?? item.duration_minutes,
      actionType: mapItemType(item),
      status: item.status,
      actionPhase: item.contract?.metadata.actionPhase,
    },
    departmentScoringReference,
  );
  const departmentRelativeScore = scores.severityScore;
  if (departmentRelativeScore === null) {
    return unavailableDepartmentScore();
  }

  return {
    score: departmentRelativeScore,
    // Relative departmental values never become temporal model input.
    historicalScore: null,
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
