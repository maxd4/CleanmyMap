import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeButtsFromMegotsKg,
  createGeocodeResolver,
  findColumnIndex,
  fixMojibake,
  parseBooleanDropdown,
  parseCoordsFromText,
  parseCsv,
  parseIsoDateFlexible,
  toNumber,
} from "./lib/sheet-ingestion-core.mjs";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/export?format=csv&gid=0";
const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = join(APP_DIR, "data", "local-db", "real_records.json");
const RAW_PATH = join(APP_DIR, "data", "raw", "google-sheet-map-clean-up.csv");
const USER_AGENT = "cleanmymap-web-data-sync/1.0 (contact: admin@cleanmymap.local)";

function buildSheetUrlCandidates(sheetUrl) {
  const candidates = [];
  const pushUnique = (value) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value);
    }
  };

  pushUnique(sheetUrl);

  try {
    const parsed = new URL(sheetUrl);
    const gid = parsed.searchParams.get("gid") ?? "0";
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    const sheetId = match?.[1];
    if (sheetId) {
      pushUnique(
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
      );
      pushUnique(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
      );
    }
  } catch {
    // Ignore invalid URL parsing here; fetch errors will be surfaced later.
  }

  return candidates;
}

function isLikelyHtmlPayload(contentType, bodyText) {
  const type = String(contentType || "").toLowerCase();
  const sample = bodyText.trimStart().slice(0, 200).toLowerCase();
  return (
    type.includes("text/html") ||
    sample.startsWith("<!doctype html") ||
    sample.startsWith("<html")
  );
}

async function fetchUsableSheetCsv(sheetUrl) {
  const attempts = [];

  for (const candidateUrl of buildSheetUrlCandidates(sheetUrl)) {
    try {
      const response = await fetch(candidateUrl, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        attempts.push(`${candidateUrl} -> HTTP ${response.status}`);
        continue;
      }

      const bodyText = await response.text();
      const rows = parseCsv(bodyText);
      const looksHtml = isLikelyHtmlPayload(response.headers.get("content-type"), bodyText);
      const hasData = rows.length >= 2;

      if (!looksHtml && hasData) {
        return { csvText: bodyText, sourceUrl: candidateUrl };
      }

      attempts.push(
        `${candidateUrl} -> non exploitable (html=${looksHtml}, rows=${rows.length})`,
      );
    } catch (error) {
      attempts.push(
        `${candidateUrl} -> ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { csvText: null, sourceUrl: null, attempts };
}

function stableId(prefix, seed) {
  const digest = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `${prefix}_${digest}`;
}

function toRecordStatus() {
  return "validated";
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const geocodeEnabled = cliArgs.includes("--geocode");
  const sheetUrlArg = cliArgs.find((arg) => arg.startsWith("http"));
  const sheetUrl =
    sheetUrlArg || process.env.CLEANMYMAP_SHEET_URL || DEFAULT_SHEET_URL;

  const fetched = await fetchUsableSheetCsv(sheetUrl);
  let csvText = fetched.csvText;
  let rows = csvText ? parseCsv(csvText) : [];

  if (csvText) {
    await mkdir(dirname(RAW_PATH), { recursive: true });
    await writeFile(RAW_PATH, csvText, "utf8");
    if (fetched.sourceUrl && fetched.sourceUrl !== sheetUrl) {
      console.warn(`Google Sheet import used fallback URL: ${fetched.sourceUrl}`);
    }
  }

  if (rows.length < 2) {
    try {
      const localRaw = await readFile(RAW_PATH, "utf8");
      const localRows = parseCsv(localRaw);
      if (localRows.length >= 2) {
        csvText = localRaw;
        rows = localRows;
        console.warn(
          "Google Sheet unreachable/empty in this environment. Using local snapshot:",
          RAW_PATH,
        );
      }
    } catch {
      // No usable local snapshot.
    }
  }

  if (rows.length < 2) {
    const attemptDetails =
      fetched.attempts && fetched.attempts.length > 0
        ? ` Attempts: ${fetched.attempts.join(" | ")}`
        : "";
    throw new Error(
      `Google Sheet appears empty or inaccessible in this environment.${attemptDetails} ` +
        "Tip: ensure sheet sharing/public CSV export, or provide CLEANMYMAP_SHEET_URL.",
    );
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const addressIndex = findColumnIndex(headers, ["adresse", "coordo", "gps", "lieu"]);
  const cityIndex = findColumnIndex(headers, ["ville"]);
  const typeIndex = findColumnIndex(headers, ["type"]);
  const dateIndex = findColumnIndex(headers, ["date"]);
  const buttsCountIndex = findColumnIndex(headers, [
    "cigarette_butts",
    "nombre megots",
    "nbr megots",
  ]);
  const megotsKgIndex = findColumnIndex(headers, [
    "megots(kg)",
    "megots kg",
    "mégots(kg)",
    "megot(kg)",
  ]);
  const megotsQualityIndex = findColumnIndex(headers, [
    "qualite megots",
    "qualité mégots",
    "qualite mego",
    "qualité mego",
  ]);
  const wasteIndex = findColumnIndex(headers, [
    "dechets(kg)",
    "dechets kg",
    "déchets(kg)",
    "waste_kg",
    "kg dechets",
  ]);
  const assocIndex = findColumnIndex(headers, ["association", "asso"]);
  const durationIndex = findColumnIndex(headers, ["temps", "duree", "minute"]);
  const volunteersIndex = findColumnIndex(headers, ["benevole", "participant"]);
  const cleanPlacesIndex = findColumnIndex(headers, [
    "liste lieux propres",
    "lieux propres",
  ]);
  const cleanPlaceFlagIndex = findColumnIndex(headers, [
    "lieu propre ?",
    "lieu propre",
    "clean place",
    "clean_place",
  ]);

  if (addressIndex < 0) {
    throw new Error("No address/location column detected in sheet");
  }

  const resolveGeocode = createGeocodeResolver({
    userAgent: USER_AGENT,
    delayMs: 1100,
    acceptLanguage: "fr",
  });

  const actionRecords = [];
  const cleanPlaceSet = new Set();

  for (const row of dataRows) {
    const rawAddress = fixMojibake(row[addressIndex] || "");
    if (!rawAddress) {
      continue;
    }

    const city = cityIndex >= 0 ? fixMojibake(row[cityIndex] || "") : "Paris";
    const typeLabel =
      typeIndex >= 0 ? fixMojibake(row[typeIndex] || "") : "Non specifie";
    const eventDate =
      dateIndex >= 0 ? parseIsoDateFlexible(row[dateIndex]) : null;
    const association = assocIndex >= 0 ? fixMojibake(row[assocIndex] || "") : "";
    const wasteKg = wasteIndex >= 0 ? toNumber(row[wasteIndex], 0) : 0;
    const cigaretteButts =
      buttsCountIndex >= 0
        ? Math.max(0, Math.trunc(toNumber(row[buttsCountIndex], 0)))
        : megotsKgIndex >= 0
          ? computeButtsFromMegotsKg(
              row[megotsKgIndex],
              megotsQualityIndex >= 0 ? row[megotsQualityIndex] : "",
            )
          : 0;
    const volunteersCount =
      volunteersIndex >= 0
        ? Math.max(1, Math.trunc(toNumber(row[volunteersIndex], 1)))
        : 1;
    const durationMinutes =
      durationIndex >= 0
        ? Math.max(0, Math.trunc(toNumber(row[durationIndex], 0)))
        : 0;

    let { latitude, longitude } = parseCoordsFromText(rawAddress);
    if ((latitude === null || longitude === null) && geocodeEnabled) {
      const resolved = await resolveGeocode(rawAddress);
      latitude = resolved.latitude;
      longitude = resolved.longitude;
    }

    actionRecords.push({
      id: stableId("real_action", `${rawAddress}|${eventDate || ""}|${association}`),
      recordType: "action",
      status: toRecordStatus(),
      source: "google_sheet",
      title: rawAddress,
      description: `Import Google Sheet (${typeLabel})`,
      location: {
        label: rawAddress,
        city: city || "Paris",
        latitude,
        longitude,
      },
      eventDate,
      metrics: {
        wasteKg,
        cigaretteButts,
        volunteersCount,
        durationMinutes,
      },
      map: {
        displayable: latitude !== null && longitude !== null,
        lat: latitude,
        lon: longitude,
      },
      trace: {
        externalId: null,
        originTable: "google_sheet",
        importedAt: new Date().toISOString(),
        notes: association ? `Association: ${association}` : null,
      },
    });

    if (cleanPlacesIndex >= 0) {
      const cleanPlace = fixMojibake(row[cleanPlacesIndex] || "");
      if (cleanPlace) {
        cleanPlaceSet.add(cleanPlace);
      }
    }
    if (
      cleanPlaceFlagIndex >= 0 &&
      parseBooleanDropdown(row[cleanPlaceFlagIndex])
    ) {
      cleanPlaceSet.add(rawAddress);
    }
  }

  const cleanPlaceRecords = [];
  for (const place of Array.from(cleanPlaceSet)) {
    let { latitude, longitude } = parseCoordsFromText(place);
    if ((latitude === null || longitude === null) && geocodeEnabled) {
      const resolved = await resolveGeocode(place);
      latitude = resolved.latitude;
      longitude = resolved.longitude;
    }

    cleanPlaceRecords.push({
      id: stableId("real_clean_place", place),
      recordType: "clean_place",
      status: toRecordStatus(),
      source: "google_sheet",
      title: place,
      description: "Lieu propre (Google Sheet)",
      location: {
        label: place,
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
        externalId: null,
        originTable: "google_sheet",
        importedAt: new Date().toISOString(),
        notes: null,
      },
    });
  }

  const output = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: [...actionRecords, ...cleanPlaceRecords],
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Real dataset updated: ${OUT_PATH}`);
  console.log(`Actions: ${actionRecords.length}`);
  console.log(`Clean places: ${cleanPlaceRecords.length}`);
  console.log(
    `Displayable map points: ${
      output.records.filter((item) => item.map && item.map.displayable).length
    }/${output.records.length}`,
  );

  if (!geocodeEnabled) {
    console.log("Tip: run with --geocode to enrich coordinates for map display.");
  }
}

main().catch((error) => {
  console.error(
    "sync-real-data-from-sheet failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
