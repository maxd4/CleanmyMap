import {
  ActionMapItem,
  ActionListItem,
  ActionRecordType,
  LegacyActionRecordType,
  ActionQualityGrade,
  ActionQualityBreakdown,
  ActionImpactLevel,
  ActionDrawing,
} from "./types";
import { ActionDataContract, ActionEntityType } from "./contract-model";
import { toGeoJsonString, isRenderableDrawing } from "./derived-geometry";

type ActionInsightsLike = {
  qualityScore: number;
  qualityGrade: ActionQualityGrade;
  qualityFlags: string[];
  qualityBreakdown: ActionQualityBreakdown;
  toFixPriority: boolean;
  impactLevel: ActionImpactLevel;
};

function toLegacyRecordType(type: ActionEntityType): LegacyActionRecordType {
  if (type === "spot") {
    return "other";
  }
  return type;
}

/**
 * Transforme un contrat en ActionMapItem (format pour la carte).
 */
export function toActionMapItem(
  contract: ActionDataContract,
  insights?: ActionInsightsLike,
): ActionMapItem {
  return {
    id: contract.id,
    action_date: contract.dates.observedAt,
    location_label: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    waste_kg: contract.metadata.wasteKg,
    cigarette_butts: contract.metadata.cigaretteButts,
    status: contract.status,
    record_type: toLegacyRecordType(contract.type),
    source: contract.source,
    created_by_clerk_id: contract.createdByClerkId ?? null,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.metadata.manualDrawing
      ? toGeoJsonString(contract.metadata.manualDrawing)
      : null,
    geometry_confidence: contract.geometry.confidence,
    geometry_source: contract.geometry.geometrySource,
    submission_mode: contract.metadata.submissionMode,
    waste_breakdown: contract.metadata.wasteBreakdown,
    quality_score: insights?.qualityScore,
    quality_grade: insights?.qualityGrade,
    quality_flags: insights?.qualityFlags,
    quality_breakdown: insights?.qualityBreakdown,
    to_fix_priority: insights?.toFixPriority,
    impact_level: insights?.impactLevel,
    contract,
  };
}

/**
 * Transforme un contrat en ActionListItem (format pour les listes/tableaux).
 */
export function toActionListItem(
  contract: ActionDataContract,
  insights?: ActionInsightsLike,
): ActionListItem {
  return {
    id: contract.id,
    created_at:
      contract.dates.createdAt ??
      contract.dates.importedAt ??
      contract.dates.observedAt,
    actor_name: contract.metadata.actorName,
    association_name: contract.metadata.associationName,
    action_date: contract.dates.observedAt,
    location_label: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    waste_kg: contract.metadata.wasteKg,
    cigarette_butts: contract.metadata.cigaretteButts,
    volunteers_count: contract.metadata.volunteersCount,
    duration_minutes: contract.metadata.durationMinutes,
    notes: contract.metadata.notes,
    status: contract.status,
    record_type: toLegacyRecordType(contract.type),
    source: contract.source,
    created_by_clerk_id: contract.createdByClerkId ?? null,
    notes_plain: contract.metadata.notesPlain,
    observed_at: contract.dates.observedAt,
    geometry_kind: contract.geometry.kind,
    geometry_geojson: contract.geometry.geojson,
    geometry_confidence: contract.geometry.confidence,
    geometry_source: contract.geometry.geometrySource,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.metadata.manualDrawing
      ? toGeoJsonString(contract.metadata.manualDrawing)
      : null,
    submission_mode: contract.metadata.submissionMode,
    waste_breakdown: contract.metadata.wasteBreakdown,
    quality_score: insights?.qualityScore,
    quality_grade: insights?.qualityGrade,
    quality_flags: insights?.qualityFlags,
    quality_breakdown: insights?.qualityBreakdown,
    to_fix_priority: insights?.toFixPriority,
    impact_level: insights?.impactLevel,
    contract,
  };
}

export function mapItemType(item: ActionMapItem): ActionEntityType {
  if (item.contract) {
    return item.contract.type;
  }
  if (item.record_type === "clean_place") {
    return "clean_place";
  }
  if (item.record_type === "other") {
    return "spot";
  }
  return "action";
}

export function mapItemWasteKg(item: ActionMapItem): number | null {
  const contract = item.contract;
  const rawValue = item.waste_kg ?? null;

  if (contract) {
    const provided = (contract.metadata as any).provided as string[] | undefined;
    if (provided && !provided.includes("waste_kg")) {
      return null;
    }
    return contract.metadata.wasteKg;
  }

  return rawValue;
}

export function mapItemCigaretteButts(item: ActionMapItem): number | null {
  const contract = item.contract;
  const rawValue = item.cigarette_butts ?? null;

  if (contract) {
    const provided = (contract.metadata as any).provided as string[] | undefined;
    if (provided && !provided.includes("cigarette_butts")) {
      return null;
    }
    return contract.metadata.cigaretteButts;
  }

  return rawValue;
}

export function mapItemLocationLabel(item: ActionMapItem): string {
  return item.contract?.location.label ?? item.location_label;
}

export function mapItemCoordinates(item: ActionMapItem): {
  latitude: number | null;
  longitude: number | null;
} {
  return {
    latitude: item.contract?.location.latitude ?? item.latitude,
    longitude: item.contract?.location.longitude ?? item.longitude,
  };
}

export function mapItemObservedAt(item: ActionMapItem): string {
  return item.contract?.dates.observedAt ?? item.action_date;
}

export function mapItemDrawing(item: ActionMapItem): ActionDrawing | null {
  const contractGeometry = item.contract?.geometry;
  if (
    contractGeometry &&
    contractGeometry.kind !== "point" &&
    isRenderableDrawing({
      kind: contractGeometry.kind,
      coordinates: contractGeometry.coordinates,
    })
  ) {
    return {
      kind: contractGeometry.kind,
      coordinates: contractGeometry.coordinates,
    };
  }

  if (isRenderableDrawing(item.manual_drawing)) {
    return item.manual_drawing;
  }

  return null;
}

export function mapItemShouldRenderPoint(item: ActionMapItem): boolean {
  const { latitude, longitude } = mapItemCoordinates(item);
  if (latitude === null || longitude === null) {
    return false;
  }

  return mapItemDrawing(item) === null;
}
