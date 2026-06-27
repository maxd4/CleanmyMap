import type { ActionMapItem, ActionStatus } from "@/lib/actions/types";
import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { readAllLocalStores } from "@/lib/data/local-store";
import { mapLocalStatusToActionStatus } from "@/lib/data/local-records";
import { allowLocalActionStoreInCurrentRuntime } from "@/lib/persistence/runtime-store";
import {
  buildActionDataContract,
  toActionMapItem,
} from "@/lib/actions/data-contract";
import type { ActionDataContract } from "@/lib/actions/data-contract";

function parseIsoDateOrToday(raw: string | null | undefined): string {
  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function getRecordCanonicalId(record: {
  id: string;
  trace?: { externalId?: string | null } | undefined;
}): string {
  return record.trace?.externalId && record.trace.externalId.trim().length > 0
    ? record.trace.externalId.trim()
    : record.id;
}

function getRecordCoordinateValue(
  value: number | null | undefined,
): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeRecordType(
  recordType: "action" | "clean_place" | "other",
): "action" | "clean_place" | "spot" {
  return recordType === "other" ? "spot" : recordType;
}

function parseRecordMetric(value: number | null | undefined): number {
  return Number(value ?? 0);
}

type LocalStoreRecord = {
    id: string;
    eventDate?: string | null;
    location: {
      label: string;
      latitude?: number | null;
      longitude?: number | null;
    };
    metrics?: {
      wasteKg?: number | null;
      cigaretteButts?: number | null;
      volunteersCount?: number | null;
      durationMinutes?: number | null;
    };
    status: "test" | "pending" | "validated" | "rejected";
    recordType: "action" | "clean_place" | "other";
    source: string;
    description?: string | null;
    trace?: {
      externalId?: string | null;
      importedAt?: string | null;
      validatedAt?: string | null;
      notes?: string | null;
    };
};

function buildLocalContractInput(
  record: LocalStoreRecord,
): Parameters<typeof buildActionDataContract>[0] {
  const canonicalId = getRecordCanonicalId(record);
  const latitude = getRecordCoordinateValue(record.location.latitude);
  const longitude = getRecordCoordinateValue(record.location.longitude);
  const persistedNotes = record.description ?? record.trace?.notes ?? null;
  const parsedMetadata = extractActionMetadataFromNotes(persistedNotes);
  const parsedNotes = parseDrawingFromNotes(persistedNotes);

  return {
    id: canonicalId,
    type: normalizeRecordType(record.recordType),
    status: mapLocalStatusToActionStatus(record.status),
    source: record.source,
    observedAt: parseIsoDateOrToday(record.eventDate),
    importedAt: record.trace?.importedAt ?? null,
    validatedAt: record.trace?.validatedAt ?? null,
    locationLabel: record.location.label,
    latitude,
    longitude,
    wasteKg: parseRecordMetric(record.metrics?.wasteKg),
    cigaretteButts: parseRecordMetric(record.metrics?.cigaretteButts),
    volunteersCount: parseRecordMetric(record.metrics?.volunteersCount),
    durationMinutes: parseRecordMetric(record.metrics?.durationMinutes),
    associationName: parsedMetadata.associationName,
    groupJoinEnabled: parsedMetadata.groupJoinEnabled,
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedNotes.cleanNotes,
    notesPlain: parsedNotes.cleanNotes,
    manualDrawing: parsedNotes.manualDrawing,
    manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
  };
}

function toLocalContract(
  record: LocalStoreRecord,
  requireCoordinates: boolean,
): ActionDataContract | null {
  const input = buildLocalContractInput(record);
  if (requireCoordinates && (input.latitude === null || input.longitude === null)) {
    return null;
  }

  return buildActionDataContract(input);
}

function dedupeContractsByKey(
  items: ActionDataContract[],
): ActionDataContract[] {
  const seen = new Set<string>();
  const output: ActionDataContract[] = [];
  for (const item of items) {
    const key = `${item.id}::${item.type}::${item.dates.observedAt}::${item.location.label}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function filterByStatus(
  items: ActionDataContract[],
  status: ActionStatus | null,
): ActionDataContract[] {
  if (!status) {
    return items;
  }
  return items.filter((item) => item.status === status);
}

function filterByFloorDate(
  items: ActionDataContract[],
  floorDate: string | null,
): ActionDataContract[] {
  if (!floorDate) {
    return items;
  }
  return items.filter((item) => item.dates.observedAt >= floorDate);
}

export async function loadLocalActionContracts(params: {
  status: ActionStatus | null;
  floorDate: string | null;
  limit: number;
  requireCoordinates: boolean;
}): Promise<ActionDataContract[]> {
  if (!allowLocalActionStoreInCurrentRuntime()) {
    return [];
  }

  const stores = await readAllLocalStores();
  const fromStores = [...stores.real.records, ...stores.validated.records]
    .map((record) => toLocalContract(record, params.requireCoordinates))
    .filter((item): item is ActionDataContract => Boolean(item));

  return filterByFloorDate(
    filterByStatus(dedupeContractsByKey(fromStores), params.status),
    params.floorDate,
  )
    .sort((a, b) => b.dates.observedAt.localeCompare(a.dates.observedAt))
    .slice(0, params.limit);
}

export async function loadLocalMapItems(params: {
  status: ActionStatus | null;
  floorDate: string;
  limit: number;
}): Promise<ActionMapItem[]> {
  const contracts = await loadLocalActionContracts({
    status: params.status,
    floorDate: params.floorDate,
    limit: params.limit,
    requireCoordinates: true,
  });
  return contracts.map((contract) => toActionMapItem(contract));
}
