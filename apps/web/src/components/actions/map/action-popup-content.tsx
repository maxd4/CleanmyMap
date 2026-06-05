"use client";

import {
  getActionOperationalContext,
  getGeometryPresentation,
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { ActionMapItem } from "@/lib/actions/types";
import { buildActionUpdateHref } from "./action-popup-content.utils";
import {
  formatObservedDate,
  formatRecordType,
  formatStatusLabel,
} from "./action-popup-content.helpers";
import { ActionPopupContentBody } from "./action-popup-content-body";
import { ActionPopupContentHeader } from "./action-popup-content-header";
import { useActionPopupScores } from "./use-action-popup-scores";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveActionMapGeometryViewModel,
} from "./actions-map-geometry.utils";

export function ActionPopupContent({
  item,
  color,
  coords,
}: {
  item: ActionMapItem;
  color: string;
  coords: { latitude: number | null; longitude: number | null };
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
  const observedAt = formatObservedDate(
    contract?.dates.observedAt ?? mapItemObservedAt(item),
  );
  const statusLabel = formatStatusLabel(contract?.status ?? item.status);
  const recordTypeLabel = formatRecordType(item);
  const hasPollution = wasteKg > 0 || butts > 0;
  const updateHref = buildActionUpdateHref(hasPollution, coords);
  const geometryView = resolveActionMapGeometryViewModel(item);
  const geometryConfidenceLabel = formatGeometryConfidenceLabel(
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
  const isJoinableAction =
    item.status === "approved" &&
    (item.record_type === "action" || contract?.type === "action");
  const joinHref =
    isJoinableAction
      ? `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(item.id)}`
      : null;

  return (
    <div className="min-w-[300px] max-w-[340px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95">
      <ActionPopupContentHeader
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
        placeType={placeType ?? null}
        quality={quality}
        geometryLabel={geometry.label}
        geometryModeLabel={geometryModeLabel}
        geometryPointLabel={geometryPointLabel}
        geometryConfidenceLabel={geometryConfidenceLabel}
        geometryMetricLabel={geometryMetricLabel}
        geometryReality={geometry.reality}
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
        sourceLabel={`Source: ${contract?.source ?? item.source ?? "n/a"}`}
        updateHref={updateHref}
        joinHref={joinHref}
        hasPollution={hasPollution}
      />
    </div>
  );
}
