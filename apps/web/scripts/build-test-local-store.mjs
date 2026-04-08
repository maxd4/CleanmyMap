import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT_INPUT_PATH = join(APP_DIR, "..", "..", "data", "seed", "runtime_seed_anonymized.json");
const WEB_INPUT_PATH = join(process.cwd(), "data", "seed", "runtime_seed_anonymized.json");
const OUTPUT_PATH = join(APP_DIR, "data", "local-db", "test_records.json");

function mapStatus(value) {
  if (value === "approved") {
    return "validated";
  }
  if (value === "rejected") {
    return "rejected";
  }
  return "test";
}

async function main() {
  let raw;
  try {
    raw = await readFile(ROOT_INPUT_PATH, "utf8");
  } catch {
    raw = await readFile(WEB_INPUT_PATH, "utf8");
  }
  const seed = JSON.parse(raw);
  const submissions = Array.isArray(seed.submissions) ? seed.submissions : [];

  const records = submissions.map((row) => {
    const latitude = typeof row.lat === "number" ? row.lat : null;
    const longitude = typeof row.lon === "number" ? row.lon : null;
    return {
      id: `test_${row.id}`,
      recordType: row.est_propre ? "clean_place" : "action",
      status: mapStatus(row.status),
      source: "test_seed",
      title: row.adresse || "Lieu test",
      description: row.commentaire || "Seed de test",
      location: {
        label: row.adresse || "Lieu test",
        city: "Paris",
        latitude,
        longitude,
      },
      eventDate: row.date || null,
      metrics: row.est_propre
        ? undefined
        : {
            wasteKg: Number(row.dechets_kg ?? 0),
            cigaretteButts: Number(row.megots ?? 0),
            volunteersCount: Number(row.benevoles ?? 0),
            durationMinutes: Number(row.temps_min ?? 0),
          },
      map: {
        displayable: latitude !== null && longitude !== null,
        lat: latitude,
        lon: longitude,
      },
      trace: {
        externalId: String(row.id),
        originTable: "runtime_seed",
        importedAt: new Date().toISOString(),
        notes: "Anonymized test seed",
      },
    };
  });

  const output = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Test dataset written: ${OUTPUT_PATH}`);
  console.log(`Records: ${records.length}`);
}

main().catch((error) => {
  console.error("build-test-local-store failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
