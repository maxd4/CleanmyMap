import type { ActionMapItem } from "@/lib/actions/types";
import { formatActionSourceLabel } from "@/lib/actions/source-presentation";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import { getActionOperationalContext } from "@/lib/actions/operational-context";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
} from "../layers/actions-map-geometry-render";
import { resolveActionMapGeometryViewModel } from "../layers/actions-map-geometry.utils";
import {
  formatObservedDate,
  formatRecordType,
  formatStatusLabel,
} from "../popup/action-popup-content.helpers";

export type SelectedActionCardModel = {
  id: string;
  title: string;
  subtitle: string;
  recordTypeLabel: string;
  statusLabel: string;
  geometryLabel: string;
  geometryModeLabel: string;
  geometryPointLabel: string;
  geometryConfidenceLabel: string | null;
  wasteLabel: string;
  buttsLabel: string;
  volunteersLabel: string;
  durationLabel: string;
  impactLabel: string;
  qualityLabel: string;
  dateLabel: string;
  sourceLabel: string;
  coordinatesLabel: string;
  routeLabel: string;
  placeTypeLabel: string;
  notes: string | null;
};

function formatCoordinatesLabel(
  latitude: number | null,
  longitude: number | null,
): string {
  if (latitude === null || longitude === null) {
    return "Coordonnées indisponibles";
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function buildSelectedActionCardModel(
  item: ActionMapItem,
): SelectedActionCardModel {
  const geometry = resolveActionMapGeometryViewModel(item);
  const operational = getActionOperationalContext(item.contract);
  const coords = mapItemCoordinates(item);
  const contract = item.contract;
  const notes =
    contract?.metadata.notesPlain?.trim() || contract?.metadata.notes?.trim() || null;

  return {
    id: item.id,
    title: mapItemLocationLabel(item),
    subtitle: formatRecordType(item),
    recordTypeLabel: formatRecordType(item),
    statusLabel: formatStatusLabel(contract?.status ?? item.status, { pendingLabel: "En attente" }),
    geometryLabel: geometry.label,
    geometryModeLabel: formatGeometryModeLabel(geometry.kind, geometry.presentation),
    geometryPointLabel: formatGeometryPointCount(geometry.pointCount),
    geometryConfidenceLabel: formatGeometryConfidenceLabel(geometry.confidence),
    wasteLabel: `${mapItemWasteKg(item) ?? 0} kg`,
    buttsLabel: `${mapItemCigaretteButts(item) ?? 0}`,
    volunteersLabel:
      operational.volunteersCount === null
        ? "Non renseigné"
        : `${operational.volunteersCount}`,
    durationLabel: `${operational.durationMinutes} min`,
    impactLabel: item.impact_level ?? "Indisponible",
    qualityLabel: item.quality_grade ?? "Non évalué",
    dateLabel: formatObservedDate(contract?.dates.observedAt ?? mapItemObservedAt(item), { month: "long" }),
    sourceLabel: formatActionSourceLabel(
      contract?.source ?? item.source ?? "n/a",
      "fr",
    ),
    coordinatesLabel: formatCoordinatesLabel(coords.latitude, coords.longitude),
    routeLabel: operational.routeStyleLabel,
    placeTypeLabel: operational.placeTypeLabel,
    notes,
  };
}
