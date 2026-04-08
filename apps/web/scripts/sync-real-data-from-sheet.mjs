import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/export?format=csv&gid=0";
const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = join(APP_DIR, "data", "local-db", "real_records.json");
const RAW_PATH = join(APP_DIR, "data", "raw", "google-sheet-map-clean-up.csv");
const USER_AGENT = "cleanmymap-web-data-sync/1.0 (contact: admin@cleanmymap.local)";

function fixMojibake(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .replaceAll("Â", "")
    .replaceAll("Â°", "°")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¨", "è")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã«", "ë")
    .replaceAll("Ã ", "à")
    .replaceAll("Ã§", "ç")
    .replaceAll("Ã®", "î")
    .replaceAll("Ã´", "ô")
    .replaceAll("Ã»", "û")
    .replaceAll("Ã‰", "É")
    .replaceAll("Ã", "à")
    .trim();
}

function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function toIsoDate(raw) {
  const clean = fixMojibake(String(raw || ""));
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function toNumber(raw, fallback = 0) {
  const normalized = String(raw ?? "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

function parseCoords(raw) {
  const value = fixMojibake(String(raw || ""));
  if (!value) {
    return { latitude: null, longitude: null };
  }

  const decimal = value.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (decimal) {
    const latitude = Number(decimal[1]);
    const longitude = Number(decimal[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }

  const dms = value.match(
    /(\d+)[°\s]+(\d+)[\s']+(\d+(?:\.\d+)?)[\s"]*([NS])\s*(\d+)[°\s]+(\d+)[\s']+(\d+(?:\.\d+)?)[\s"]*([EW])/i,
  );
  if (!dms) {
    return { latitude: null, longitude: null };
  }
  let latitude = Number(dms[1]) + Number(dms[2]) / 60 + Number(dms[3]) / 3600;
  if (dms[4].toUpperCase() === "S") {
    latitude *= -1;
  }
  let longitude = Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7]) / 3600;
  if (dms[8].toUpperCase() === "W") {
    longitude *= -1;
  }
  return { latitude, longitude };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(address) {
  const query = encodeURIComponent(`${address}, Paris, France`);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&q=${query}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr" },
  });
  if (!response.ok) {
    return { latitude: null, longitude: null };
  }
  const body = await response.json();
  const first = Array.isArray(body) ? body[0] : null;
  if (!first) {
    return { latitude: null, longitude: null };
  }
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null };
  }
  return { latitude, longitude };
}

function stableId(prefix, seed) {
  const digest = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `${prefix}_${digest}`;
}

function normalizeHeaderCell(value) {
  return fixMojibake(String(value || ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function findColumnIndex(headers, keywords) {
  for (let index = 0; index < headers.length; index += 1) {
    const cell = normalizeHeaderCell(headers[index]);
    if (keywords.some((keyword) => cell.includes(keyword))) {
      return index;
    }
  }
  return -1;
}

function toRecordStatus() {
  return "validated";
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const geocodeEnabled = cliArgs.includes("--geocode");
  const sheetUrlArg = cliArgs.find((arg) => arg.startsWith("http"));
  const sheetUrl = sheetUrlArg || process.env.CLEANMYMAP_SHEET_URL || DEFAULT_SHEET_URL;

  const response = await fetch(sheetUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Unable to fetch Google Sheet (${response.status})`);
  }
  const csvText = await response.text();

  await mkdir(dirname(RAW_PATH), { recursive: true });
  await writeFile(RAW_PATH, csvText, "utf8");

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error("Google Sheet appears empty");
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const addressIndex = findColumnIndex(headers, ["adresse", "coordo", "gps", "lieu"]);
  const cityIndex = findColumnIndex(headers, ["ville"]);
  const typeIndex = findColumnIndex(headers, ["type"]);
  const dateIndex = findColumnIndex(headers, ["date"]);
  const buttsIndex = findColumnIndex(headers, ["megot", "cigarette"]);
  const wasteIndex = findColumnIndex(headers, ["kg", "dechet"]);
  const assocIndex = findColumnIndex(headers, ["association", "asso"]);
  const durationIndex = findColumnIndex(headers, ["temps", "duree", "minute"]);
  const volunteersIndex = findColumnIndex(headers, ["benevole", "participant"]);
  const cleanPlacesIndex = findColumnIndex(headers, ["liste lieux propres", "lieux propres", "propre"]);

  if (addressIndex < 0) {
    throw new Error("No address/location column detected in sheet");
  }

  const geocodeCache = new Map();
  const actionRecords = [];
  const cleanPlaceSet = new Set();

  for (const row of dataRows) {
    const rawAddress = fixMojibake(row[addressIndex] || "");
    if (!rawAddress) {
      continue;
    }

    const city = cityIndex >= 0 ? fixMojibake(row[cityIndex] || "") : "Paris";
    const typeLabel = typeIndex >= 0 ? fixMojibake(row[typeIndex] || "") : "Non specifie";
    const eventDate = dateIndex >= 0 ? toIsoDate(row[dateIndex]) : null;
    const association = assocIndex >= 0 ? fixMojibake(row[assocIndex] || "") : "";
    const wasteKg = wasteIndex >= 0 ? toNumber(row[wasteIndex], 0) : 0;
    const cigaretteButts = buttsIndex >= 0 ? Math.max(0, Math.trunc(toNumber(row[buttsIndex], 0))) : 0;
    const volunteersCount = volunteersIndex >= 0 ? Math.max(1, Math.trunc(toNumber(row[volunteersIndex], 1))) : 1;
    const durationMinutes = durationIndex >= 0 ? Math.max(0, Math.trunc(toNumber(row[durationIndex], 0))) : 0;

    let { latitude, longitude } = parseCoords(rawAddress);
    if ((latitude === null || longitude === null) && geocodeEnabled) {
      if (!geocodeCache.has(rawAddress)) {
        geocodeCache.set(rawAddress, await geocodeAddress(rawAddress));
        await sleep(1100);
      }
      const resolved = geocodeCache.get(rawAddress);
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
  }

  const cleanPlaceRecords = [];
  for (const place of Array.from(cleanPlaceSet)) {
    let { latitude, longitude } = parseCoords(place);
    if ((latitude === null || longitude === null) && geocodeEnabled) {
      if (!geocodeCache.has(place)) {
        geocodeCache.set(place, await geocodeAddress(place));
        await sleep(1100);
      }
      const resolved = geocodeCache.get(place);
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
  console.error("sync-real-data-from-sheet failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
