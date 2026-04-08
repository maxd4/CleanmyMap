import type { ActionMapItem, ActionStatus } from "@/lib/actions/types";
import { readAllLocalStores } from "@/lib/data/local-store";
import { mapLocalStatusToActionStatus } from "@/lib/data/local-records";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";

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

function toLocalMapItem(record: {
  id: string;
  eventDate?: string | null;
  location: { label: string; latitude?: number | null; longitude?: number | null };
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
  trace?: { importedAt?: string | null; validatedAt?: string | null; notes?: string | null };
}): ActionMapItem | null {
  const latitude = record.location.latitude ?? null;
  const longitude = record.location.longitude ?? null;
  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    ...toActionMapItem(
      buildActionDataContract({
        id: record.id,
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
        notes: record.description ?? record.trace?.notes ?? null,
      }),
    ),
    record_type: record.recordType,
  };
}

function dedupeByKey(items: ActionMapItem[]): ActionMapItem[] {
  const seen = new Set<string>();
  const output: ActionMapItem[] = [];
  for (const item of items) {
    const key = `${item.id}::${item.action_date}::${item.location_label}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function filterByStatus(items: ActionMapItem[], status: ActionStatus | null): ActionMapItem[] {
  if (!status) {
    return items;
  }
  return items.filter((item) => item.status === status);
}

function filterByFloorDate(items: ActionMapItem[], floorDate: string): ActionMapItem[] {
  return items.filter((item) => item.action_date >= floorDate);
}

export async function loadLocalMapItems(params: {
  status: ActionStatus | null;
  floorDate: string;
  limit: number;
}): Promise<ActionMapItem[]> {
  const stores = await readAllLocalStores();
  const fromStores = [...stores.real.records, ...stores.validated.records]
    .map((record) => toLocalMapItem(record))
    .filter((item): item is ActionMapItem => Boolean(item));

  const filtered = filterByFloorDate(filterByStatus(dedupeByKey(fromStores), params.status), params.floorDate)
    .sort((a, b) => b.action_date.localeCompare(a.action_date))
    .slice(0, params.limit);

  return filtered;
}
