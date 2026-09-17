"use client";

import { useMemo } from "react";
import {
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
  type PollutionScoreScope,
} from "@/lib/actions/pollution/pollution-score";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemType } from "@/lib/actions/data-contract";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import {
  resolveActionPollutionScore,
  type ScopedActionPollutionScore,
} from "./pollution-score-scope";
import { getScoreReading, type ScoreReading } from "./action-popup-content.helpers";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

type UseActionPopupScoresParams = {
  item: ActionMapItem;
  hasPollution: boolean;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  scoreScope?: PollutionScoreScope;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState?: CurrentPlaceState | null;
};

type UseActionPopupScoresResult = {
  score: number;
  historicalScore: number | null;
  wasteScore: number;
  buttsScore: number;
  scoreReading: ScoreReading;
  scoreLoading: boolean;
  scoreSourceLabel: string;
  scoreUnavailable: boolean;
  globalScore: ScopedActionPollutionScore | null;
  departmentScore: ScopedActionPollutionScore | null;
};

export function useActionPopupScores({
  item,
  hasPollution,
  wasteKg,
  cigaretteButts,
  volunteersCount,
  scoreScope = "global",
  displayMode = "projected_today",
  currentPlaceState = null,
}: UseActionPopupScoresParams): UseActionPopupScoresResult {
  const { references, isLoading, error } = useActionPollutionScoreReferences();

  const fallbackScores = useMemo(
    () =>
      computePollutionScores({
        wasteKg,
        cigaretteButts,
      }),
    [cigaretteButts, wasteKg],
  );

  const pollutionScores = useMemo(() => {
    if (!hasPollution) {
      return fallbackScores;
    }

    return computePollutionScoresRelativeToReferences(
      {
        wasteKg,
        cigaretteButts,
        volunteersCount,
        durationMinutes: item.contract?.metadata.durationMinutes ?? item.duration_minutes,
        actionType: mapItemType(item),
        status: item.status,
        actionPhase: item.contract?.metadata.actionPhase,
      },
      references?.global,
    );
  }, [
    hasPollution,
    fallbackScores,
    item,
    references,
    volunteersCount,
    wasteKg,
    cigaretteButts,
  ]);

  const globalActionScore = useMemo(
    () =>
      mapItemType(item) === "action"
        ? resolveActionPollutionScore(item, references, {
            scope: "global",
            displayMode,
            currentPlaceState,
          })
        : null,
    [currentPlaceState, displayMode, item, references],
  );
  const departmentActionScore = useMemo(
    () =>
      mapItemType(item) === "action"
        ? resolveActionPollutionScore(item, references, {
            scope: "department",
            displayMode,
            currentPlaceState,
          })
        : null,
    [currentPlaceState, displayMode, item, references],
  );
  const scopedActionScore = scoreScope === "department"
    ? departmentActionScore
    : globalActionScore;
  const isAction = mapItemType(item) === "action";
  const scoreLoading = hasPollution && isLoading && !references;
  const isDepartmentScoreUnavailable =
    mapItemType(item) === "action" &&
    scoreScope === "department" &&
    scopedActionScore?.score === null &&
    !scoreLoading;
  const isGlobalScoreUnavailable =
    mapItemType(item) === "action" &&
    scoreScope === "global" &&
    scopedActionScore?.score === null &&
    !scoreLoading;
  const isScoreUnavailable = isDepartmentScoreUnavailable || isGlobalScoreUnavailable;

  const score = isScoreUnavailable || scoreLoading
    ? 0
    : scopedActionScore?.score ?? (isAction ? 0 : pollutionScores.severityScore) ?? 0;
  const wasteScore = isScoreUnavailable || scoreLoading
    ? 0
    : scopedActionScore?.wasteScore ?? (isAction ? 0 : pollutionScores.wasteScore) ?? 0;
  const buttsScore = isScoreUnavailable || scoreLoading
    ? 0
    : scopedActionScore?.buttsScore ?? (isAction ? 0 : pollutionScores.buttsScore) ?? 0;
  const scoreReading = getScoreReading(score);

  const scoreSourceLabel = !hasPollution
    ? "Aucun calcul nécessaire"
    : scoreLoading
      ? "Chargement de la référence globale"
      : isScoreUnavailable
        ? scoreScope === "department"
          ? "Score départemental indisponible"
          : "Score global indisponible"
        : error
          ? "Référence locale"
          : "Référence terrain";

  return {
    score,
    historicalScore: isScoreUnavailable
      ? null
      : scoreScope === "department"
        ? null
      : scopedActionScore?.historicalScore ?? (isAction ? null : pollutionScores.severityScore),
    wasteScore,
    buttsScore,
    scoreReading,
    scoreLoading,
    scoreSourceLabel,
    scoreUnavailable: isScoreUnavailable,
    globalScore: globalActionScore,
    departmentScore: departmentActionScore,
  };
}
