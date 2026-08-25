"use client";

import {
  getActionOperationalContext,
  getGeometryPresentation,
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { formatActionSourceLabel } from "@/lib/actions/source-presentation";
import { ActionMapItem } from "@/lib/actions/types";
import type { CorridorHistory } from "@/lib/actions/corridor-history";
import { buildActionUpdateHref } from "./action-popup-content.utils";
import {
  formatObservedDate,
  formatRecordType,
  formatStatusLabel,
  isActionMapItem,
  resolveActionTitle,
} from "./action-popup-content.helpers";
import { ActionPopupContentBody } from "./action-popup-content-body";
import { ActionPopupContentHeader } from "./action-popup-content-header";
import { CorridorPopupContent } from "./corridor-popup-content";
import { useActionPopupScores } from "./use-action-popup-scores";
import { presentActionPollutionProjection } from "@/lib/actions/revisit-priority";
import {
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveGeometryConfidenceLabel,
  resolveActionMapGeometryViewModel,
} from "./actions-map-geometry.utils";

type ActionPopupContentProps = {
  item: ActionMapItem;
  color: string;
  coords: { latitude: number | null; longitude: number | null };
  onViewGeometry?: () => void;
  corridorItems?: readonly ActionMapItem[];
  corridorHistory?: CorridorHistory;
  onViewGeometryForItem?: (item: ActionMapItem) => void;
  resolveColorForItem?: (item: ActionMapItem) => string;
};

export function ActionPopupContent(props: ActionPopupContentProps) {
  const corridorItems = props.corridorItems ?? [];
  if (corridorItems.length >= 2 && props.corridorHistory) {
    return (
      <CorridorPopupContent
        corridorItems={corridorItems}
        corridorHistory={props.corridorHistory}
        color={props.color}
        renderAction={(item) => (
          <SingleActionPopupContent
            item={item}
            color={props.resolveColorForItem?.(item) ?? props.color}
            coords={mapItemCoordinates(item)}
            onViewGeometry={
              props.onViewGeometryForItem?.bind(null, item) ?? props.onViewGeometry
            }
            wrap={false}
          />
        )}
      />
    );
  }

  return <SingleActionPopupContent {...props} wrap />;
}

function SingleActionPopupContent({
  item,
  color,
  coords,
  onViewGeometry,
  wrap = true,
}: {
  item: ActionMapItem;
  color: string;
  coords: { latitude: number | null; longitude: number | null };
  onViewGeometry?: () => void;
  wrap?: boolean;
}) {
  const contract = item.contract;
  const geometry = getGeometryPresentation(item);
  const wasteKg = mapItemWasteKg(item) ?? 0;
  const butts = mapItemCigaretteButts(item) ?? 0;
  const volunteers = Number(contract?.metadata.volunteersCount ?? 0);
  const durationMinutes = Number(contract?.metadata.durationMinutes ?? 0);
  const placeType = contract?.metadata.placeType?.trim();
  const associationName = contract?.metadata.associationName?.trim();
  const notes =
    contract?.metadata.notesPlain?.trim() || contract?.metadata.notes?.trim();
  const departure = contract?.metadata.departureLocationLabel?.trim();
  const arrival = contract?.metadata.arrivalLocationLabel?.trim();
  const operational = getActionOperationalContext(contract);
  const quality = item.quality_grade ? `Qualité ${item.quality_grade}` : null;
  const locationLabel = mapItemLocationLabel(item);
  const isAction = isActionMapItem(item);
  const actionTitle = isAction ? resolveActionTitle(item) : locationLabel;
  const observedAt = formatObservedDate(
    contract?.dates.observedAt ?? mapItemObservedAt(item),
  );
  const statusLabel = formatStatusLabel(contract?.status ?? item.status);
  const recordTypeLabel = formatRecordType(item);
  const hasPollution = wasteKg > 0 || butts > 0;
  const updateHref = buildActionUpdateHref(hasPollution, coords, isAction);
  const geometryView = resolveActionMapGeometryViewModel(item);
  const geometryConfidenceLabel = resolveGeometryConfidenceLabel(
    geometryView.presentation,
    geometryView.confidence,
  );
  const geometryModeLabel = formatGeometryModeLabel(geometryView.presentation);
  const geometryPointLabel = formatGeometryPointCount(geometryView.pointCount);
  const geometryMetricLabel = geometryView.metrics.label;

  const {
    score,
    wasteScore,
    buttsScore,
    scoreReading,
    scoreLoading,
    scoreSourceLabel,
  } = useActionPopupScores({
    hasPollution,
    wasteKg,
    cigaretteButts: butts,
    volunteersCount: volunteers,
  });
  const actionProjection = isAction
    ? presentActionPollutionProjection(
        score,
        mapItemObservedAt(item),
        new Date(),
        {
          postActionScore: mapItemPostActionPollutionScore(item),
          geometryConfidence: geometryView.confidence,
          sourceCompleteness: "partial",
        },
      )
    : null;
  const isJoinableAction =
    item.status === "approved" &&
    (item.record_type === "action" || contract?.type === "action");
  const groupJoinEnabled = contract?.metadata.groupJoinEnabled === true;
  const joinHref =
    isJoinableAction && groupJoinEnabled
      ? `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(item.id)}`
      : null;
  const joinStatusLabel =
    isJoinableAction && !groupJoinEnabled
      ? "Formulaire fermé par l'organisateur"
      : null;

  const content = (
    <>
      <ActionPopupContentHeader
        recordTypeLabel={recordTypeLabel}
        locationLabel={locationLabel}
        actionTitle={actionTitle}
        isAction={isAction}
        color={color}
        score={score}
        scoreLoading={scoreLoading}
        scoreReading={scoreReading}
        scoreSourceLabel={scoreSourceLabel}
        wasteScore={wasteScore}
        buttsScore={buttsScore}
        statusLabel={statusLabel}
        placeType={placeType ?? null}
        quality={quality}
        geometryLabel={geometry.label}
        geometryModeLabel={geometryModeLabel}
        geometryPointLabel={geometryPointLabel}
        geometryConfidenceLabel={geometryConfidenceLabel}
        geometryMetricLabel={geometryMetricLabel}
        geometryReality={geometry.reality}
        observedAt={observedAt}
        wasteKg={wasteKg}
        butts={butts}
        actionProjection={actionProjection}
      />

      <ActionPopupContentBody
        wasteKg={wasteKg}
        butts={butts}
        volunteers={volunteers}
        durationMinutes={durationMinutes}
        operationalEngagementHours={operational.engagementHours}
        associationName={associationName ?? null}
        departure={departure ?? null}
        arrival={arrival ?? null}
        notes={notes ?? null}
        observedAt={observedAt}
        sourceLabel={`Source: ${formatActionSourceLabel(
          contract?.source ?? item.source ?? "n/a",
          "fr",
        )}`}
        updateHref={updateHref}
        joinHref={joinHref}
        joinStatusLabel={joinStatusLabel}
        hasPollution={hasPollution}
        isAction={isAction}
        onViewGeometry={onViewGeometry}
      />
    </>
  );

  if (!wrap) {
    return content;
  }

  return (
    <div className="min-w-[300px] max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95">
      {content}
    </div>
  );
}
