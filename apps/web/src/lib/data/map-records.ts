import type { ActionMapItem, ActionStatus } from "@/lib/actions/types";
import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
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

function toLocalContract(
  record: {
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
  },
  requireCoordinates: boolean,
): ActionDataContract | null {
  const canonicalId =
    record.trace?.externalId && record.trace.externalId.trim().length > 0
      ? record.trace.externalId.trim()
      : record.id;
  const latitude = record.location.latitude ?? null;
  const longitude = record.location.longitude ?? null;
  if (requireCoordinates && (latitude === null || longitude === null)) {
    return null;
  }
  const persistedNotes = record.description ?? record.trace?.notes ?? null;
  const parsedNotes = parseDrawingFromNotes(persistedNotes);

  return buildActionDataContract({
    id: canonicalId,
    type: record.recordType === "other" ? "spot" : record.recordType,
    status: mapLocalStatusToActionStatus(record.status),
    source: record.source,
    observedAt: parseIsoDateOrToday(record.eventDate),
    importedAt: record.trace?.importedAt ?? null,
    validatedAt: record.trace?.validatedAt ?? null,
    locationLabel: record.location.label,
    latitude,
    longitude,
    wasteKg: Number(record.metrics?.wasteKg ?? 0),
    cigaretteButts: Number(record.metrics?.cigaretteButts ?? 0),
    volunteersCount: Number(record.metrics?.volunteersCount ?? 0),
    durationMinutes: Number(record.metrics?.durationMinutes ?? 0),
    notes: parsedNotes.cleanNotes,
    notesPlain: parsedNotes.cleanNotes,
    manualDrawing: parsedNotes.manualDrawing,
    manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
  });
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
