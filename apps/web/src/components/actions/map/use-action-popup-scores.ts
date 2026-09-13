"use client";

import { useMemo } from "react";
import {
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
  type PollutionScoreScope,
} from "@/lib/actions/pollution/pollution-score";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemType } from "@/lib/actions/data-contract";
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
      },
      references,
    );
  }, [hasPollution, fallbackScores, references, volunteersCount, wasteKg, cigaretteButts]);

  const globalActionScore = useMemo(
    () =>
      mapItemType(item) === "action"
        ? resolveActionPollutionScore(item, references, { scope: "global" })
        : null,
    [item, references],
  );
  const departmentActionScore = useMemo(
    () =>
      mapItemType(item) === "action"
        ? resolveActionPollutionScore(item, references, { scope: "department" })
        : null,
    [item, references],
  );
  const scopedActionScore = scoreScope === "department"
    ? departmentActionScore
    : globalActionScore;
  const isDepartmentScoreUnavailable =
    mapItemType(item) === "action" &&
    scoreScope === "department" &&
    scopedActionScore?.score === null;

  const score = isDepartmentScoreUnavailable
    ? 0
    : scopedActionScore?.score ?? pollutionScores.severityScore;
  const wasteScore = isDepartmentScoreUnavailable
    ? 0
    : scopedActionScore?.wasteScore ?? pollutionScores.wasteScore;
  const buttsScore = isDepartmentScoreUnavailable
    ? 0
    : scopedActionScore?.buttsScore ?? pollutionScores.buttsScore;
  const scoreReading = getScoreReading(score);
  const scoreLoading = hasPollution && isLoading;

  const scoreSourceLabel = !hasPollution
    ? "Aucun calcul nécessaire"
    : isDepartmentScoreUnavailable
      ? "Score départemental indisponible"
      : scoreLoading
        ? "Référence locale provisoire"
        : error
          ? "Référence locale"
          : "Référence terrain";

  return {
    score,
    historicalScore: isDepartmentScoreUnavailable
      ? null
      : scopedActionScore?.historicalScore ?? pollutionScores.severityScore,
    wasteScore,
    buttsScore,
    scoreReading,
    scoreLoading,
    scoreSourceLabel,
    scoreUnavailable: isDepartmentScoreUnavailable,
    globalScore: globalActionScore,
    departmentScore: departmentActionScore,
  };
}
