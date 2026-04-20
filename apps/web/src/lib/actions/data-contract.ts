import type {
  ActionDrawing,
  ActionImpactLevel,
  ActionListItem,
  ActionMapItem,
  ActionQualityBreakdown,
  ActionQualityGrade,
  ActionRecordType,
  ActionSubmissionMode,
  ActionStatus,
  CreateActionPayload,
  LegacyActionRecordType,
  ActionWasteBreakdown,
  ActionMegotsCondition,
} from "@/lib/actions/types";

export const BUTTS_PER_KG_REFERENCE = 2500;
export const CONDITION_WEIGHT_FACTORS: Record<ActionMegotsCondition, number> = {
  propre: 1.0,
  humide: 0.7,
  mouille: 0.4,
};

export function computeButtsCount(weightKg: number, condition: ActionMegotsCondition): number {
  return Math.round(weightKg * BUTTS_PER_KG_REFERENCE * CONDITION_WEIGHT_FACTORS[condition]);
}

export const ACTION_ENTITY_TYPES = [
  "action",
  "clean_place",
  "spot",
] as const satisfies readonly ActionRecordType[];
export type ActionEntityType = ActionRecordType;

export type ActionDataLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type ActionDataGeometry = {
  kind: "point" | "polyline" | "polygon";
  coordinates: [number, number][];
  geojson: string | null;
};

export type ActionDataDates = {
  observedAt: string;
  createdAt: string | null;
  importedAt: string | null;
  validatedAt: string | null;
};

export type ActionDataMetadata = {
  actorName: string | null;
  associationName: string | null;
  notes: string | null;
  notesPlain: string | null;
  submissionMode: ActionSubmissionMode | null;
  wasteBreakdown: ActionWasteBreakdown | null;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  manualDrawing: ActionDrawing | null;
};

export type ActionDataContract = {
  id: string;
  type: ActionEntityType;
  status: ActionStatus;
  source: string;
  location: ActionDataLocation;
  geometry: ActionDataGeometry;
  dates: ActionDataDates;
  metadata: ActionDataMetadata;
};

function toLegacyRecordType(type: ActionEntityType): LegacyActionRecordType {
  if (type === "spot") {
    return "other";
  }
  return type;
}

export type ActionContractCreatePayload = {
  type: ActionRecordType;
  source: string;
  location: {
    label: string;
    latitude?: number;
    longitude?: number;
  };
  geometry?: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  };
  dates: {
    observedAt: string;
  };
  metadata: {
    actorName?: string;
    associationName?: string;
    placeType?: string;
    wasteKg: number;
    cigaretteButts?: number;
    volunteersCount?: number;
    durationMinutes?: number;
    notes?: string;
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
  };
};

type BuildActionContractParams = {
  id: string;
  type: ActionEntityType;
  status: ActionStatus;
  source: string;
  observedAt: string;
  createdAt?: string | null;
  importedAt?: string | null;
  validatedAt?: string | null;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
  durationMinutes?: number | null;
  actorName?: string | null;
  associationName?: string | null;
  notes?: string | null;
  notesPlain?: string | null;
  submissionMode?: ActionSubmissionMode | null;
  wasteBreakdown?: ActionWasteBreakdown | null;
  manualDrawing?: ActionDrawing | null;
  manualDrawingGeoJson?: string | null;
};

type ActionInsightsLike = {
  qualityScore: number;
  qualityGrade: ActionQualityGrade;
  qualityFlags: string[];
  qualityBreakdown: ActionQualityBreakdown;
  toFixPriority: boolean;
  impactLevel: ActionImpactLevel;
};

function toFiniteNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeObservedDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function toPointCoordinates(
  latitude: number | null,
  longitude: number | null,
): [number, number][] {
  if (latitude === null || longitude === null) {
    return [];
  }
  return [[latitude, longitude]];
}

export function buildActionDataContract(
  params: BuildActionContractParams,
): ActionDataContract {
  const manualDrawing = params.manualDrawing ?? null;
  const latitude =
    params.latitude === null ? null : toFiniteNumber(params.latitude, 0);
  const longitude =
    params.longitude === null ? null : toFiniteNumber(params.longitude, 0);
  return {
    id: params.id,
    type: params.type,
    status: params.status,
    source: params.source,
    location: {
      label: params.locationLabel,
      latitude,
      longitude,
    },
    geometry: manualDrawing
      ? {
          kind: manualDrawing.kind,
          coordinates: manualDrawing.coordinates,
          geojson: params.manualDrawingGeoJson ?? null,
        }
      : {
          kind: "point",
          coordinates: toPointCoordinates(latitude, longitude),
          geojson: null,
        },
    dates: {
      observedAt: normalizeObservedDate(params.observedAt),
      createdAt: params.createdAt ?? null,
      importedAt: params.importedAt ?? null,
      validatedAt: params.validatedAt ?? null,
    },
    metadata: {
      actorName: params.actorName ?? null,
      associationName: params.associationName ?? null,
      notes: params.notes ?? null,
      notesPlain: params.notesPlain ?? null,
      submissionMode: params.submissionMode ?? null,
      wasteBreakdown: params.wasteBreakdown ?? null,
      wasteKg: params.wasteKg === undefined || params.wasteKg === null ? null : toFiniteNumber(params.wasteKg, 0),
      cigaretteButts: params.cigaretteButts === undefined || params.cigaretteButts === null 
        ? null 
        : Math.max(0, Math.trunc(toFiniteNumber(params.cigaretteButts, 0))),
      volunteersCount: Math.max(
        0,
        Math.trunc(toFiniteNumber(params.volunteersCount, 0)),
      ),
      durationMinutes: Math.max(
        0,
        Math.trunc(toFiniteNumber(params.durationMinutes, 0)),
      ),
      manualDrawing,
    },
  };
}

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
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.geometry.geojson,
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
    notes_plain: contract.metadata.notesPlain,
    observed_at: contract.dates.observedAt,
    geometry_kind: contract.geometry.kind,
    geometry_geojson: contract.geometry.geojson,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.geometry.geojson,
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

export function toContractCreatePayload(
  payload: CreateActionPayload,
): ActionContractCreatePayload {
  return {
    type: payload.recordType ?? "action",
    source: "web_form",
    location: {
      label: payload.locationLabel,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    geometry: payload.manualDrawing
      ? {
          kind: payload.manualDrawing.kind,
          coordinates: payload.manualDrawing.coordinates,
        }
      : undefined,
    dates: {
      observedAt: payload.actionDate,
    },
    metadata: {
      actorName: payload.actorName,
      associationName: payload.associationName,
      placeType: payload.placeType,
      wasteKg: payload.wasteKg,
      cigaretteButts: payload.cigaretteButts,
      volunteersCount: payload.volunteersCount,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
      submissionMode: payload.submissionMode,
      wasteBreakdown: payload.wasteBreakdown,
    },
  };
}

export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    return payload;
  }
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    actionDate: payload.dates.observedAt,
    locationLabel: payload.location.label,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    wasteKg: payload.metadata.wasteKg,
    cigaretteButts: payload.metadata.cigaretteButts ?? 0,
    volunteersCount: payload.metadata.volunteersCount ?? 1,
    durationMinutes: payload.metadata.durationMinutes ?? 0,
    notes: payload.metadata.notes,
    submissionMode: payload.metadata.submissionMode ?? "complete",
    wasteBreakdown: payload.metadata.wasteBreakdown,
    manualDrawing: payload.geometry
      ? {
          kind: payload.geometry.kind,
          coordinates: payload.geometry.coordinates,
        }
      : undefined,
    placeType: payload.metadata.placeType ?? undefined,
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
  const rawValue = item.waste_kg;

  if (contract) {
    const provided = (contract.metadata as any).provided as string[] | undefined;
    if (provided && !provided.includes("waste_kg")) {
      return null;
    }
    return contract.metadata.wasteKg;
  }

  // Fallback for non-contract items (legacy)
  if (rawValue === 0 || rawValue === null) {
      // If we don't have a contract, we assume 0 is a placeholder unless we can prove otherwise
      // But for regularity with the new system, we'll return 0 if not sure.
      return rawValue;
  }
  return rawValue;
}

export function mapItemCigaretteButts(item: ActionMapItem): number | null {
  const contract = item.contract;
  const rawValue = item.cigarette_butts;

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
