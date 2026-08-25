import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = join(APP_DIR, "data", "local-db", "validated_records.json");
const PAGE_SIZE = 1000;

export async function fetchPaged(table, selectClause, statusColumn, statusValues, supabase) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const query = supabase.from(table).select(selectClause).order("created_at", { ascending: false }).range(from, to);
    const { data, error } = Array.isArray(statusValues)
      ? await query.in(statusColumn, statusValues)
      : await query.eq(statusColumn, statusValues);
    if (error) {
      throw new Error(error.message);
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return rows;
}

function extractAssociationNameFromNotes(notes) {
  if (typeof notes !== "string" || notes.trim().length === 0) {
    return null;
  }

  for (const line of notes.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("[cmm-meta]")) {
      const legacyMatch = trimmed.match(/^association\s*:\s*(.+)$/i);
      if (legacyMatch) {
        const value = legacyMatch[1]?.trim();
        if (value) {
          return value;
        }
      }
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed.slice("[cmm-meta]".length));
      const value = typeof parsed.associationName === "string" ? parsed.associationName.trim() : "";
      if (value) {
        return value;
      }
    } catch {
      // Ignore malformed metadata blocks.
    }
  }

  return null;
}

function deriveActionTitle(row) {
  const associationName = extractAssociationNameFromNotes(row.notes);
  if (associationName) {
    return associationName;
  }
  const actorName = typeof row.actor_name === "string" ? row.actor_name.trim() : "";
  if (actorName) {
    return actorName;
  }
  const locationLabel = typeof row.location_label === "string" ? row.location_label.trim() : "";
  return locationLabel || "Action sans structure";
}

export function actionToRecord(row, importedAt = new Date().toISOString()) {
  const latitude = row.latitude === null ? null : Number(row.latitude);
  const longitude = row.longitude === null ? null : Number(row.longitude);
  return {
    id: `validated_action_${row.id}`,
    recordType: "action",
    status: "validated",
    source: "system_sync",
    title: deriveActionTitle(row),
    description: row.notes ?? null,
    location: {
      label: row.location_label,
      city: "Paris",
      latitude,
      longitude,
    },
    eventDate: row.action_date ?? null,
    metrics: {
      wasteKg: Number(row.waste_kg ?? 0),
      cigaretteButts: Number(row.cigarette_butts ?? 0),
      volunteersCount: Number(row.volunteers_count ?? 0),
      durationMinutes: Number(row.duration_minutes ?? 0),
    },
    map: {
      displayable: latitude !== null && longitude !== null,
      lat: latitude,
      lon: longitude,
    },
    trace: {
      externalId: String(row.id),
      originTable: "actions",
      importedAt,
      notes: row.actor_name ? `Declared by ${row.actor_name}` : null,
    },
  };
}

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function canonicalSpotRecordType(spotType) {
  return String(spotType ?? "").trim().toLowerCase() === "clean_place"
    ? "clean_place"
    : "other";
}

function baseSpotRecord(row, recordType, originTable, importedAt) {
  const latitude = toNumberOrNull(row.latitude);
  const longitude = toNumberOrNull(row.longitude);

  return {
    id: `validated_spot_${row.id}`,
    recordType,
    status: "validated",
    source: "system_sync",
    title: row.label,
    description: row.notes ?? null,
    location: {
      label: row.label,
      city: "Paris",
      latitude,
      longitude,
    },
    eventDate: null,
    map: {
      displayable: latitude !== null && longitude !== null,
      lat: latitude,
      lon: longitude,
    },
    trace: {
      externalId: String(row.id),
      originTable,
      importedAt,
      notes: null,
    },
  };
}

export function canonicalSpotToRecord(row, importedAt) {
  return baseSpotRecord(
    row,
    canonicalSpotRecordType(row.spot_type),
    "trash_spotter_spots",
    importedAt,
  );
}

export function legacySpotToRecord(row, importedAt) {
  // `waste_type` describes waste, not the entity kind. Legacy spots therefore
  // stay `other` so map-records normalizes them conservatively to `spot`.
  return baseSpotRecord(row, "other", "spots", importedAt);
}

export function normalizeValidatedRecords({
  actions,
  canonicalSpots,
  legacySpots,
  importedAt,
}) {
  const canonicalIds = new Set(canonicalSpots.map((row) => String(row.id)));
  const legacyFallback = legacySpots.filter(
    (row) => !canonicalIds.has(String(row.id)),
  );

  return [
    ...actions.map((row) => actionToRecord(row, importedAt)),
    ...canonicalSpots.map((row) => canonicalSpotToRecord(row, importedAt)),
    ...legacyFallback.map((row) => legacySpotToRecord(row, importedAt)),
  ];
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const importedAt = new Date().toISOString();
  const [actions, canonicalSpots, legacySpots] = await Promise.all([
    fetchPaged(
      "actions",
      "id, created_at, action_date, actor_name, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
      "status",
      "approved",
      supabase,
    ),
    fetchPaged(
      "trash_spotter_spots",
      "id, created_at, label, spot_type, latitude, longitude, notes, status",
      "status",
      ["validated", "cleaned"],
      supabase,
    ),
    fetchPaged(
      "spots",
      "id, created_at, label, waste_type, latitude, longitude, notes, status",
      "status",
      ["validated", "cleaned"],
      supabase,
    ),
  ]);

  const output = {
    version: 1,
    updatedAt: importedAt,
    records: normalizeValidatedRecords({
      actions,
      canonicalSpots,
      legacySpots,
      importedAt,
    }),
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const canonicalIds = new Set(canonicalSpots.map((row) => String(row.id)));
  const legacyFallbackCount = legacySpots.filter(
    (row) => !canonicalIds.has(String(row.id)),
  ).length;

  console.log(`Validated local store updated: ${OUT_PATH}`);
  console.log(`Approved actions: ${actions.length}`);
  console.log(`Canonical validated signals: ${canonicalSpots.length}`);
  console.log(`Legacy fallback signals: ${legacyFallbackCount}`);
}

const currentModuleUrl = pathToFileURL(process.argv[1] ?? "").href;
if (currentModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error("sync-validated-local-store failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
