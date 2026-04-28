import type { ActionMapItem } from "@/lib/actions/types";
import {
  getActionOperationalContext,
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import {
  formatGeometryConfidenceLabel,
  formatGeometryModeLabel,
  formatGeometryPointCount,
  resolveActionMapGeometryViewModel,
} from "./actions-map-geometry.utils";

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

function formatStatusLabel(status: string | undefined): string {
  switch (status) {
    case "approved":
      return "Validée";
    case "pending":
      return "En attente";
    case "rejected":
      return "Rejetée";
    default:
      return "Statut inconnu";
  }
}

function formatRecordType(item: ActionMapItem): string {
  switch (item.contract?.type ?? item.record_type ?? "action") {
    case "clean_place":
      return "Lieu propre";
    case "spot":
      return "Signalement";
    default:
      return "Action terrain";
  }
}

function formatObservedDate(value: string | null | undefined): string {
  if (!value) {
    return "Date non renseignée";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

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
    statusLabel: formatStatusLabel(contract?.status ?? item.status),
    geometryLabel: geometry.label,
    geometryModeLabel: formatGeometryModeLabel(geometry.presentation),
    geometryPointLabel: formatGeometryPointCount(geometry.pointCount),
    geometryConfidenceLabel: formatGeometryConfidenceLabel(geometry.confidence),
    wasteLabel: `${mapItemWasteKg(item) ?? 0} kg`,
    buttsLabel: `${mapItemCigaretteButts(item) ?? 0}`,
    volunteersLabel: `${operational.volunteersCount}`,
    durationLabel: `${operational.durationMinutes} min`,
    impactLabel: item.impact_level ?? "faible",
    qualityLabel: item.quality_grade ?? "C",
    dateLabel: formatObservedDate(contract?.dates.observedAt ?? mapItemObservedAt(item)),
    sourceLabel: contract?.source ?? item.source ?? "n/a",
    coordinatesLabel: formatCoordinatesLabel(coords.latitude, coords.longitude),
    routeLabel: operational.routeStyleLabel,
    placeTypeLabel: operational.placeTypeLabel,
    notes,
  };
}
