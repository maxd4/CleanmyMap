"use client";

import { useMemo } from "react";
import {
  computePollutionScores,
  computePollutionScoresRelativeToReferences,
} from "@/lib/actions/pollution-score";
import { getScoreReading, type ScoreReading } from "./action-popup-content.helpers";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";

type UseActionPopupScoresParams = {
  hasPollution: boolean;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
};

type UseActionPopupScoresResult = {
  score: number;
  wasteScore: number;
  buttsScore: number;
  scoreReading: ScoreReading;
  scoreLoading: boolean;
  scoreSourceLabel: string;
};

export function useActionPopupScores({
  hasPollution,
  wasteKg,
  cigaretteButts,
  volunteersCount,
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

  const score = pollutionScores.severityScore;
  const wasteScore = pollutionScores.wasteScore;
  const buttsScore = pollutionScores.buttsScore;
  const scoreReading = getScoreReading(score);
  const scoreLoading = hasPollution && isLoading;

  const scoreSourceLabel = !hasPollution
    ? "Aucun calcul nécessaire"
    : scoreLoading
      ? "Référence locale provisoire"
      : error
        ? "Référence locale"
        : "Référence terrain";

  return {
    score,
    wasteScore,
    buttsScore,
    scoreReading,
    scoreLoading,
    scoreSourceLabel,
  };
}
