"use client";

import type { ReactNode } from "react";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ActionMapItem } from "@/lib/actions/types";
import { formatActionSourceLabel } from "@/lib/actions/source-presentation";
import { ActionPopupContentBody } from "./action-popup-content-body";
import { ActionPopupContentHeader } from "./action-popup-content-header";
import { useActionPopupScores } from "./use-action-popup-scores";
import {
  buildSingleActionPopupDetails,
  buildSingleActionPopupProjection,
  buildSingleActionPopupScoreContext,
  resolveSingleActionPopupScore,
} from "./action-popup-content-single.model";
import { isSignalementMapItem } from "./action-popup-content.helpers";

export type SingleActionPopupContentProps = {
  item: ActionMapItem;
  color: string;
  coords: { latitude: number | null; longitude: number | null };
  onViewGeometry?: () => void;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState?: CurrentPlaceState | null;
  scoreScope?: PollutionScoreScope;
  compact?: boolean;
  wrap?: boolean;
};

export function SingleActionPopupContent({
  item,
  color,
  coords,
  onViewGeometry,
  displayMode,
  currentPlaceState = null,
  scoreScope = "global",
  compact = false,
  wrap = true,
}: SingleActionPopupContentProps) {
  const details = buildSingleActionPopupDetails(item, coords);
  const scoreContext = buildSingleActionPopupScoreContext(
    item,
    details.identity.isAction,
    currentPlaceState,
  );
  const scores = useActionPopupScores({
    item,
    hasPollution: details.metrics.hasPollution,
    wasteKg: details.metrics.wasteKg,
    cigaretteButts: details.metrics.butts,
    volunteersCount: details.metrics.volunteers,
    scoreScope,
    displayMode,
    currentPlaceState,
  });
  const popupScore = resolveSingleActionPopupScore(
    item,
    scores.score,
    details.identity.isAction,
  );
  const actionProjection = buildSingleActionPopupProjection({
    item,
    isAction: details.identity.isAction,
    scoreScope,
    historicalScore: scores.historicalScore,
    geometryConfidence: details.geometry.geometryView.confidence,
  });

  return (
    <ActionPopupFrame wrap={wrap}>
      <SingleActionPopupView
        details={details}
        scores={scores}
        color={color}
        compact={compact}
        actionProjection={actionProjection}
        popupScore={popupScore}
        scoreScope={scoreScope}
        displayMode={displayMode}
        currentPlaceState={currentPlaceState}
        hasQuantifiedPollutionScore={scoreContext.hasQuantifiedPollutionScore}
        onViewGeometry={onViewGeometry}
        signalementId={isSignalementMapItem(item) ? item.id : null}
      />
    </ActionPopupFrame>
  );
}
function SingleActionPopupView({
  details,
  scores,
  color,
  compact,
  actionProjection,
  popupScore,
  scoreScope,
  displayMode,
  currentPlaceState,
  hasQuantifiedPollutionScore,
  onViewGeometry,
  signalementId,
}: {
  details: ReturnType<typeof buildSingleActionPopupDetails>;
  scores: ReturnType<typeof useActionPopupScores>;
  color: string;
  compact: boolean;
  actionProjection: ReturnType<typeof buildSingleActionPopupProjection>;
  popupScore: number;
  scoreScope: PollutionScoreScope;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceState: CurrentPlaceState | null;
  hasQuantifiedPollutionScore: boolean;
  onViewGeometry?: () => void;
  signalementId: string | null;
}) {
  const { contract, metrics, context, identity, geometry, links } = details;

  return (
    <>
      <ActionPopupContentHeader
        recordTypeLabel={identity.recordTypeLabel}
        locationLabel={identity.locationLabel}
        actionTitle={identity.actionTitle}
        isAction={identity.isAction}
        color={color}
        score={popupScore}
        scoreLoading={scores.scoreLoading}
        scoreReading={scores.scoreReading}
        scoreSourceLabel={scores.scoreSourceLabel}
        wasteScore={scores.wasteScore}
        buttsScore={scores.buttsScore}
        statusLabel={identity.statusLabel}
        placeType={contract?.metadata.placeType?.trim() ?? null}
        quality={identity.quality}
        geometryLabel={geometry.geometry.label}
        geometryModeLabel={geometry.geometryModeLabel}
        geometryKind={geometry.geometryView.kind}
        geometryPointLabel={geometry.geometryPointLabel}
        geometryConfidenceLabel={geometry.geometryConfidenceLabel}
        geometryMetricLabel={geometry.geometryMetricLabel}
        geometryReality={geometry.geometry.reality}
        observedAt={identity.observedAt}
        wasteKg={metrics.wasteKg}
        butts={metrics.butts}
        actionProjection={actionProjection}
        displayMode={displayMode}
        currentPlaceState={currentPlaceState}
        scoreScope={scoreScope}
        scoreUnavailable={scores.scoreUnavailable}
        globalScore={scores.globalScore}
        departmentScore={scores.departmentScore}
        departmentName={contract?.location.departmentName ?? null}
        hasQuantifiedPollutionScore={hasQuantifiedPollutionScore}
        compact={compact}
      />
      <ActionPopupContentBody
        wasteKg={metrics.wasteKg}
        butts={metrics.butts}
        volunteers={metrics.volunteers}
        durationMinutes={metrics.durationMinutes}
        operationalEngagementHours={context.operationalEngagementHours}
        associationName={context.associationName}
        departure={context.departure}
        arrival={context.arrival}
        notes={context.notes}
        observedAt={identity.observedAt}
        sourceLabel={`Source: ${formatActionSourceLabel(details.source, "fr")}`}
        updateHref={links.updateHref}
        joinHref={links.joinHref}
        joinStatusLabel={links.joinStatusLabel}
        hasPollution={metrics.hasPollution}
        isAction={identity.isAction}
        actionId={identity.isAction ? details.itemId : null}
        signalementId={signalementId}
        onViewGeometry={onViewGeometry}
        geometryKind={geometry.geometryView.kind}
        compact={compact}
      />
    </>
  );
}

function ActionPopupFrame({
  children,
  wrap,
}: {
  children: ReactNode;
  wrap: boolean;
}) {
  return wrap ? (
    <div className="min-w-[300px] max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95">
      {children}
    </div>
  ) : (
    children
  );
}
