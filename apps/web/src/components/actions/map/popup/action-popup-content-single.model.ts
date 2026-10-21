import {
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
  mapItemVolunteersCount,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { getActionOperationalContext } from "@/lib/actions/operational-context";
import { getGeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { presentActionPollutionProjection } from "@/lib/actions/pollution/revisit-priority";
import type {
  CurrentPlaceState,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionUpdateHref } from "./action-popup-content.utils";
import {
  formatObservedDate,
  formatRecordType,
  formatStatusLabel,
  isActionMapItem,
  resolveActionTitle,
} from "./action-popup-content.helpers";
import {
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveGeometryConfidenceLabel,
} from "../layers/actions-map-geometry-render";
import { resolveActionMapGeometryViewModel } from "../layers/actions-map-geometry.utils";

type GeometryConfidence = ReturnType<typeof resolveActionMapGeometryViewModel>["confidence"];

export function buildSingleActionPopupMetrics(item: ActionMapItem) {
  const wasteKg = mapItemWasteKg(item) ?? 0;
  const butts = mapItemCigaretteButts(item) ?? 0;

  return {
    wasteKg,
    butts,
    volunteers: mapItemVolunteersCount(item),
    durationMinutes: Number(item.contract?.metadata.durationMinutes ?? 0),
    hasPollution: wasteKg > 0 || butts > 0,
  };
}
export function buildSingleActionPopupContext(item: ActionMapItem) {
  const metadata = item.contract?.metadata;

  return {
    associationName: metadata?.associationName?.trim() ?? null,
    notes: metadata?.notesPlain?.trim() || metadata?.notes?.trim() || null,
    departure: metadata?.departureLocationLabel?.trim() ?? null,
    arrival: metadata?.arrivalLocationLabel?.trim() ?? null,
    operationalEngagementHours: getActionOperationalContext(item.contract).engagementHours,
  };
}

export function buildSingleActionPopupIdentity(item: ActionMapItem) {
  const contract = item.contract;
  const isAction = isActionMapItem(item);

  return {
    isAction,
    actionTitle: isAction ? resolveActionTitle(item) : mapItemLocationLabel(item),
    locationLabel: mapItemLocationLabel(item),
    observedAt: formatObservedDate(contract?.dates.observedAt ?? mapItemObservedAt(item)),
    statusLabel: formatStatusLabel(contract?.status ?? item.status),
    recordTypeLabel: formatRecordType(item),
    quality: item.quality_grade ? `Qualité ${item.quality_grade}` : null,
  };
}

export function buildSingleActionPopupGeometry(item: ActionMapItem) {
  const geometry = getGeometryPresentation(item);
  const geometryView = resolveActionMapGeometryViewModel(item);

  return {
    geometry,
    geometryView,
    geometryConfidenceLabel: resolveGeometryConfidenceLabel(
      geometryView.presentation,
      geometryView.confidence,
    ),
    geometryModeLabel: formatGeometryModeLabel(
      geometryView.kind,
      geometryView.presentation,
    ),
    geometryPointLabel: formatGeometryPointCount(geometryView.pointCount),
    geometryMetricLabel: geometryView.metrics.label,
  };
}

export function buildSingleActionPopupLinks(
  item: ActionMapItem,
  coords: { latitude: number | null; longitude: number | null },
  hasPollution: boolean,
  isAction: boolean,
) {
  const contract = item.contract;
  const isJoinableAction =
    item.status === "approved" &&
    (item.record_type === "action" || contract?.type === "action");
  const groupJoinEnabled = contract?.metadata.groupJoinEnabled === true;

  return {
    updateHref: buildActionUpdateHref(hasPollution, coords, isAction),
    joinHref:
      isJoinableAction && groupJoinEnabled
        ? `/sections/rejoindre-une-action?actionId=${encodeURIComponent(item.id)}`
        : null,
    joinStatusLabel:
      isJoinableAction && !groupJoinEnabled
        ? "Formulaire fermé par l'organisateur"
        : null,
  };
}

export function buildSingleActionPopupScoreContext(
  item: ActionMapItem,
  isAction: boolean,
  currentPlaceState: CurrentPlaceState | null,
) {
  const dataContract = item.contract as unknown as ActionDataContract | undefined;

  return {
    hasQuantifiedPollutionScore:
      isAction ||
      currentPlaceState?.scoreKind === "measured" ||
      typeof dataContract?.metadata.observedPollutionScore === "number",
  };
}

export function resolveSingleActionPopupScore(
  item: ActionMapItem,
  score: number,
  isAction: boolean,
) {
  const dataContract = item.contract as unknown as ActionDataContract | undefined;

  return !isAction && typeof dataContract?.metadata.observedPollutionScore === "number"
    ? dataContract.metadata.observedPollutionScore
    : score;
}

export function buildSingleActionPopupProjection({
  item,
  isAction,
  scoreScope,
  historicalScore,
  geometryConfidence,
}: {
  item: ActionMapItem;
  isAction: boolean;
  scoreScope: PollutionScoreScope;
  historicalScore: number | null;
  geometryConfidence: GeometryConfidence;
}) {
  if (!isAction || scoreScope !== "global") {
    return null;
  }

  return presentActionPollutionProjection(
    historicalScore ?? 0,
    mapItemObservedAt(item),
    new Date(),
    {
      postActionScore: mapItemPostActionPollutionScore(item),
      geometryConfidence,
      sourceCompleteness: "partial",
    },
  );
}

export function buildSingleActionPopupDetails(
  item: ActionMapItem,
  coords: { latitude: number | null; longitude: number | null },
) {
  const metrics = buildSingleActionPopupMetrics(item);
  const identity = buildSingleActionPopupIdentity(item);

  return {
    itemId: item.id,
    contract: item.contract,
    metrics,
    context: buildSingleActionPopupContext(item),
    identity,
    geometry: buildSingleActionPopupGeometry(item),
    links: buildSingleActionPopupLinks(
      item,
      coords,
      metrics.hasPollution,
      identity.isAction,
    ),
    source: item.contract?.source ?? item.source ?? "n/a",
  };
}
