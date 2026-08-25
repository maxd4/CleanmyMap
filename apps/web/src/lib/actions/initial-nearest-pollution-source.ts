import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionMapItem, ActionMapViewportQuery } from "./types";

const INITIAL_POLLUTION_PAGE_SIZE = 500;
const CANONICAL_SPOT_SELECT =
  "id, created_at, label, spot_type, latitude, longitude, status, notes";
const LEGACY_SPOT_SELECT =
  "id, created_at, label, latitude, longitude, status, notes";

type CanonicalSpotRow = {
  id: string;
  created_at: string;
  label: string;
  spot_type: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

type LegacySpotRow = Omit<CanonicalSpotRow, "spot_type">;

export async function loadAllInitialPollutionPages<T>(
  fetchPage: (offset: number, pageSize: number) => Promise<T[]>,
  pageSize = INITIAL_POLLUTION_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(offset, pageSize);
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
    offset += pageSize;
  }
}

function buildMapItem(
  row: CanonicalSpotRow | LegacySpotRow,
  source: "trash_spotter_spots" | "spots_legacy",
  recordType: "other" | "clean_place",
): ActionMapItem {
  return {
    id: row.id,
    action_date: row.created_at.slice(0, 10),
    location_label: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    waste_kg: 0,
    cigarette_butts: 0,
    status: "approved",
    record_type: recordType,
    source,
    source_status: row.status,
    created_by_clerk_id: null,
    notes_plain: row.notes,
  };
}

async function loadCanonicalSpotRows(
  supabase: SupabaseClient,
  bounds: ActionMapViewportQuery,
): Promise<CanonicalSpotRow[]> {
  return loadAllInitialPollutionPages(async (offset, pageSize) => {
    const result = await supabase
      .from("trash_spotter_spots")
      .select(CANONICAL_SPOT_SELECT)
      .eq("status", "validated")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as CanonicalSpotRow[];
  });
}

async function loadLegacySpotRows(
  supabase: SupabaseClient,
  bounds: ActionMapViewportQuery,
): Promise<LegacySpotRow[]> {
  return loadAllInitialPollutionPages(async (offset, pageSize) => {
    const result = await supabase
      .from("spots")
      .select(LEGACY_SPOT_SELECT)
      .eq("status", "validated")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as LegacySpotRow[];
  });
}

export async function loadInitialPollutionItems(
  supabase: SupabaseClient,
  bounds: ActionMapViewportQuery,
): Promise<ActionMapItem[]> {
  const [canonicalResult, legacyResult] = await Promise.allSettled([
    loadCanonicalSpotRows(supabase, bounds),
    loadLegacySpotRows(supabase, bounds),
  ]);

  if (canonicalResult.status === "rejected") {
    throw canonicalResult.reason;
  }

  const legacyRows = legacyResult.status === "fulfilled" ? legacyResult.value : [];
  return [
    ...canonicalResult.value.map((row) =>
      buildMapItem(row, "trash_spotter_spots", row.spot_type === "spot" ? "other" : "clean_place"),
    ),
    ...legacyRows.map((row) => buildMapItem(row, "spots_legacy", "other")),
  ];
}
