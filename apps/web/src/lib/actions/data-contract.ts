import type { ActionDrawing, ActionMapItem, ActionStatus, CreateActionPayload } from "@/lib/actions/types";

export const ACTION_ENTITY_TYPES = ["action", "clean_place", "spot"] as const;
export type ActionEntityType = (typeof ACTION_ENTITY_TYPES)[number];

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
  notes: string | null;
  notesPlain: string | null;
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

export type ActionContractCreatePayload = {
  type: "action";
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
    wasteKg: number;
    cigaretteButts?: number;
    volunteersCount?: number;
    durationMinutes?: number;
    notes?: string;
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
  notes?: string | null;
  notesPlain?: string | null;
  manualDrawing?: ActionDrawing | null;
  manualDrawingGeoJson?: string | null;
};

function toFiniteNumber(value: number | null | undefined, fallback: number): number {
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

function toPointCoordinates(latitude: number | null, longitude: number | null): [number, number][] {
  if (latitude === null || longitude === null) {
    return [];
  }
  return [[latitude, longitude]];
}

export function buildActionDataContract(params: BuildActionContractParams): ActionDataContract {
  const manualDrawing = params.manualDrawing ?? null;
  const latitude = params.latitude === null ? null : toFiniteNumber(params.latitude, 0);
  const longitude = params.longitude === null ? null : toFiniteNumber(params.longitude, 0);
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
      notes: params.notes ?? null,
      notesPlain: params.notesPlain ?? null,
      wasteKg: toFiniteNumber(params.wasteKg, 0),
      cigaretteButts: Math.max(0, Math.trunc(toFiniteNumber(params.cigaretteButts, 0))),
      volunteersCount: Math.max(0, Math.trunc(toFiniteNumber(params.volunteersCount, 0))),
      durationMinutes: Math.max(0, Math.trunc(toFiniteNumber(params.durationMinutes, 0))),
      manualDrawing,
    },
  };
}

export function toActionMapItem(contract: ActionDataContract): ActionMapItem {
  return {
    id: contract.id,
    action_date: contract.dates.observedAt,
    location_label: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    waste_kg: contract.metadata.wasteKg,
    cigarette_butts: contract.metadata.cigaretteButts,
    status: contract.status,
    record_type: contract.type === "spot" ? "other" : contract.type,
    source: contract.source,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.geometry.geojson,
    contract,
  };
}

export function toContractCreatePayload(payload: CreateActionPayload): ActionContractCreatePayload {
  return {
    type: "action",
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
      wasteKg: payload.wasteKg,
      cigaretteButts: payload.cigaretteButts,
      volunteersCount: payload.volunteersCount,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
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
    actionDate: payload.dates.observedAt,
    locationLabel: payload.location.label,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    wasteKg: payload.metadata.wasteKg,
    cigaretteButts: payload.metadata.cigaretteButts ?? 0,
    volunteersCount: payload.metadata.volunteersCount ?? 1,
    durationMinutes: payload.metadata.durationMinutes ?? 0,
    notes: payload.metadata.notes,
    manualDrawing: payload.geometry
      ? {
          kind: payload.geometry.kind,
          coordinates: payload.geometry.coordinates,
        }
      : undefined,
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

export function mapItemWasteKg(item: ActionMapItem): number {
  return item.contract?.metadata.wasteKg ?? Number(item.waste_kg ?? 0);
}

export function mapItemCigaretteButts(item: ActionMapItem): number {
  return item.contract?.metadata.cigaretteButts ?? Number(item.cigarette_butts ?? 0);
}

export function mapItemLocationLabel(item: ActionMapItem): string {
  return item.contract?.location.label ?? item.location_label;
}

export function mapItemCoordinates(item: ActionMapItem): { latitude: number | null; longitude: number | null } {
  return {
    latitude: item.contract?.location.latitude ?? item.latitude,
    longitude: item.contract?.location.longitude ?? item.longitude,
  };
}

export function mapItemObservedAt(item: ActionMapItem): string {
  return item.contract?.dates.observedAt ?? item.action_date;
}
