import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = join(APP_DIR, "data", "local-db", "validated_records.json");
const PAGE_SIZE = 1000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fetchPaged(table, selectClause, statusColumn, statusValue) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const query = supabase.from(table).select(selectClause).order("created_at", { ascending: false }).range(from, to);
    const { data, error } = await query.eq(statusColumn, statusValue);
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

function actionToRecord(row) {
  const latitude = row.latitude === null ? null : Number(row.latitude);
  const longitude = row.longitude === null ? null : Number(row.longitude);
  return {
    id: `validated_action_${row.id}`,
    recordType: "action",
    status: "validated",
    source: "system_sync",
    title: row.location_label,
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
      importedAt: new Date().toISOString(),
      notes: row.actor_name ? `Declared by ${row.actor_name}` : null,
    },
  };
}

function spotToRecord(row) {
  const latitude = row.latitude === null ? null : Number(row.latitude);
  const longitude = row.longitude === null ? null : Number(row.longitude);
  return {
    id: `validated_spot_${row.id}`,
    recordType: "clean_place",
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
      originTable: "spots",
      importedAt: new Date().toISOString(),
      notes: null,
    },
  };
}

async function main() {
  const [actions, spots] = await Promise.all([
    fetchPaged(
      "actions",
      "id, created_at, action_date, actor_name, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, status",
      "status",
      "approved",
    ),
    fetchPaged("spots", "id, created_at, label, latitude, longitude, notes, status", "status", "validated"),
  ]);

  const output = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: [...actions.map(actionToRecord), ...spots.map(spotToRecord)],
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Validated local store updated: ${OUT_PATH}`);
  console.log(`Approved actions: ${actions.length}`);
  console.log(`Validated clean places: ${spots.length}`);
}

main().catch((error) => {
  console.error("sync-validated-local-store failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
