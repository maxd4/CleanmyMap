import { getGeometryTone } from "./action-popup-content.helpers";
import { ActionPopupContentActionHeader } from "./action-popup-content-action-header";
import { CompactActionHeader } from "./action-popup-content-compact-header";
import { ActionPopupContentSignalHeader } from "./action-popup-content-signal-header";
import { resolveActionPopupContentHeaderModel } from "./action-popup-content-header-model";
import type { ActionPopupContentHeaderProps } from "./action-popup-content-header.types";

export type { ActionPopupContentHeaderProps } from "./action-popup-content-header.types";
export function ActionPopupContentHeader({
  recordTypeLabel,
  locationLabel,
  actionTitle,
  isAction,
  color,
  score,
  scoreLoading,
  scoreReading,
  scoreSourceLabel,
  wasteScore,
  buttsScore,
  statusLabel,
  placeType,
  quality,
  geometryLabel,
  geometryModeLabel,
  geometryKind,
  geometryPointLabel,
  geometryConfidenceLabel,
  geometryMetricLabel,
  geometryReality,
  observedAt,
  wasteKg,
  butts,
  actionProjection,
  displayMode,
  currentPlaceState = null,
  scoreScope = "global",
  scoreUnavailable = false,
  globalScore = null,
  departmentScore = null,
  departmentName = null,
  hasQuantifiedPollutionScore = true,
  compact = false,
}: ActionPopupContentHeaderProps) {
  const geometryTone = getGeometryTone(geometryReality, isAction);
  if (isAction) {
    const model = resolveActionPopupContentHeaderModel({
      score,
      scoreLoading,
      observedAt,
      actionProjection,
      displayMode,
      currentPlaceState,
      scoreScope,
      scoreUnavailable,
    });
    if (compact) {
      return (
        <CompactActionHeader
          recordTypeLabel={recordTypeLabel}
          locationLabel={locationLabel}
          actionTitle={actionTitle}
          color={color}
          score={model.displayedScore}
          scoreLoading={scoreLoading}
          displayedScoreLabel={model.compactScoreLabel}
          historicalScoreLabel={model.historicalScoreLabel}
          projectedScoreLabel={model.projectedScoreLabel}
          elapsedDays={actionProjection?.elapsedDays ?? 0}
          statusLabel={statusLabel}
          displayedDate={model.displayedDate}
          scoreScope={scoreScope}
          isDisplayedProjection={model.isDisplayedProjection}
          projectionConfidence={model.projectionConfidence}
          wasteScore={wasteScore}
          buttsScore={buttsScore}
          globalScore={globalScore}
          departmentScore={departmentScore}
          departmentName={departmentName}
          placeType={placeType}
          quality={quality}
          geometryLabel={geometryLabel}
          geometryTone={geometryTone.shell}
          hasQuantifiedPollutionScore={hasQuantifiedPollutionScore}
        />
      );
    }
    return (
      <ActionPopupContentActionHeader
        recordTypeLabel={recordTypeLabel}
        locationLabel={locationLabel}
        actionTitle={actionTitle}
        color={color}
        score={score}
        scoreLoading={scoreLoading}
        wasteScore={wasteScore}
        buttsScore={buttsScore}
        statusLabel={statusLabel}
        geometryLabel={geometryLabel}
        geometryModeLabel={geometryModeLabel}
        geometryKind={geometryKind}
        geometryPointLabel={geometryPointLabel}
        geometryConfidenceLabel={geometryConfidenceLabel}
        geometryMetricLabel={geometryMetricLabel}
        observedAt={observedAt}
        wasteKg={wasteKg}
        butts={butts}
        actionProjection={actionProjection}
        scoreScope={scoreScope}
        scoreUnavailable={scoreUnavailable}
        globalScore={globalScore}
        departmentScore={departmentScore}
        departmentName={departmentName}
        displayedScore={model.displayedScore}
        displayedScoreLabel={model.displayedScoreLabel}
        displayedDate={model.displayedDate}
        isDisplayedProjection={model.isDisplayedProjection}
        scopedCurrentPlaceState={model.scopedCurrentPlaceState}
      />
    );
  }

  return (
    <ActionPopupContentSignalHeader
      recordTypeLabel={recordTypeLabel}
      locationLabel={locationLabel}
      color={color}
      score={score}
      scoreLoading={scoreLoading}
      scoreReading={scoreReading}
      scoreSourceLabel={scoreSourceLabel}
      wasteScore={wasteScore}
      buttsScore={buttsScore}
      statusLabel={statusLabel}
      placeType={placeType}
      quality={quality}
      geometryLabel={geometryLabel}
      geometryModeLabel={geometryModeLabel}
      geometryPointLabel={geometryPointLabel}
      geometryConfidenceLabel={geometryConfidenceLabel}
      geometryMetricLabel={geometryMetricLabel}
      displayMode={displayMode}
      currentPlaceState={currentPlaceState}
      hasQuantifiedPollutionScore={hasQuantifiedPollutionScore}
      geometryTone={geometryTone}
    />
  );
}
