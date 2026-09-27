import { formatObservedDate } from "./action-popup-content.helpers";
import type { ActionPollutionProjectionPresentation } from "@/lib/actions/pollution/revisit-priority";
import { formatProjectionConfidenceLabel } from "@/lib/actions/pollution/projection-confidence";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import { formatScorePercent } from "@/lib/formatters/score";

type ActionPopupContentHeaderModelInput = {
  score: number;
  scoreLoading: boolean;
  observedAt: string;
  actionProjection: ActionPollutionProjectionPresentation | null;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState: CurrentPlaceState | null;
  scoreScope: PollutionScoreScope;
  scoreUnavailable: boolean;
};

function resolveDisplayedScoreLabel({
  scoreLoading,
  scoreUnavailable,
  scoreScope,
  scopedCurrentPlaceState,
  displayedScore,
}: {
  scoreLoading: boolean;
  scoreUnavailable: boolean;
  scoreScope: PollutionScoreScope;
  scopedCurrentPlaceState: CurrentPlaceState | null;
  displayedScore: number;
}) {
  if (scoreLoading) {
    return "Chargement du score";
  }
  if (scoreUnavailable) {
    return scoreScope === "department"
      ? "Score départemental indisponible"
      : "Score global indisponible";
  }
  if (scopedCurrentPlaceState?.scoreKind === "unavailable") {
    return "Niveau non quantifié";
  }
  return formatScorePercent(Math.round(displayedScore));
}

function resolveCompactScoreLabel({
  scoreLoading,
  scoreUnavailable,
  scopedCurrentPlaceState,
  displayedScore,
}: {
  scoreLoading: boolean;
  scoreUnavailable: boolean;
  scopedCurrentPlaceState: CurrentPlaceState | null;
  displayedScore: number;
}) {
  if (scoreLoading) {
    return "…";
  }
  if (scoreUnavailable || scopedCurrentPlaceState?.scoreKind === "unavailable") {
    return "Indisponible";
  }
  return formatScorePercent(Math.round(displayedScore));
}

function resolveActionDisplayState({
  score,
  displayMode,
  currentPlaceState,
  scoreScope,
  scoreUnavailable,
  actionProjection,
}: Pick<ActionPopupContentHeaderModelInput, "score" | "displayMode" | "currentPlaceState" | "scoreScope" | "scoreUnavailable" | "actionProjection">) {
  const scopedCurrentPlaceState = scoreScope === "global" ? currentPlaceState : null;
  const hasDisplayState = scoreScope === "global" && Boolean(displayMode || currentPlaceState);
  const isDisplayedProjection =
    scoreScope === "global" &&
    (hasDisplayState
      ? scopedCurrentPlaceState?.source === "projected" ||
        (!currentPlaceState && displayMode === "projected_today")
      : true);
  const displayedScore = scoreUnavailable
    ? 0
    : scopedCurrentPlaceState?.score ??
      (isDisplayedProjection
        ? actionProjection?.projectedPollutionScore ?? score
        : score);
  return { scopedCurrentPlaceState, isDisplayedProjection, displayedScore };
}

function resolveActionScoreLabels({
  score,
  scoreLoading,
  scoreUnavailable,
  scoreScope,
  actionProjection,
  scopedCurrentPlaceState,
  displayedScore,
  isDisplayedProjection,
}: {
  score: number;
  scoreLoading: boolean;
  scoreUnavailable: boolean;
  scoreScope: PollutionScoreScope;
  actionProjection: ActionPollutionProjectionPresentation | null;
  scopedCurrentPlaceState: CurrentPlaceState | null;
  displayedScore: number;
  isDisplayedProjection: boolean;
}) {
  const compactScoreLabel = resolveCompactScoreLabel({
    scoreLoading,
    scoreUnavailable,
    scopedCurrentPlaceState,
    displayedScore,
  });
  return {
    displayedScoreLabel: resolveDisplayedScoreLabel({
      scoreLoading,
      scoreUnavailable,
      scoreScope,
      scopedCurrentPlaceState,
      displayedScore,
    }),
    compactScoreLabel,
    historicalScoreLabel: scoreLoading
      ? "…"
      : scoreUnavailable
        ? "Indisponible"
        : formatScorePercent(Math.round(actionProjection?.historicalScore ?? score)),
    projectedScoreLabel: isDisplayedProjection
      ? compactScoreLabel
      : scoreUnavailable
        ? "Indisponible"
        : formatScorePercent(Math.round(displayedScore)),
    projectionConfidence: actionProjection?.projectionConfidence
      ? formatProjectionConfidenceLabel(actionProjection.projectionConfidence.level)
      : null,
  };
}

export function resolveActionPopupContentHeaderModel(
  input: ActionPopupContentHeaderModelInput,
) {
  const displayState = resolveActionDisplayState(input);
  const displayedDate = displayState.scopedCurrentPlaceState?.date
    ? formatObservedDate(displayState.scopedCurrentPlaceState.date)
    : input.observedAt;
  const labels = resolveActionScoreLabels({
    ...input,
    ...displayState,
  });
  return {
    ...displayState,
    ...labels,
    displayedDate,
  };
}
