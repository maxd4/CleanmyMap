import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-actions-backup.mjs <path-to-json>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function normalizePayload(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.items)) {
    return parsed.items;
  }
  throw new Error("Invalid backup format: expected array or object with items[]");
}

async function main() {
  const fullPath = resolve(process.cwd(), inputPath);
  const content = await readFile(fullPath, "utf8");
  const parsed = JSON.parse(content);
  const items = normalizePayload(parsed);

  const toInsert = items.map((item) => ({
    created_by_clerk_id: item.created_by_clerk_id ?? null,
    actor_name: item.actor_name ?? null,
    action_date: item.action_date,
    location_label: item.location_label,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    waste_kg: Number(item.waste_kg ?? 0),
    cigarette_butts: Number(item.cigarette_butts ?? 0),
    volunteers_count: Number(item.volunteers_count ?? 1),
    duration_minutes: Number(item.duration_minutes ?? 1),
    notes: item.notes ?? null,
    status: item.status ?? "approved",
  }));

  const { data, error } = await supabase.from("actions").insert(toInsert).select("id");
  if (error) {
    throw new Error(error.message);
  }

  console.log(`Imported actions: ${data?.length ?? 0}`);
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
