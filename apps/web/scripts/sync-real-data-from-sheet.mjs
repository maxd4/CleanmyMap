import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeButtsFromMegotsKg,
  createGeocodeResolver,
  buildMidpointFromCoordinates,
  buildRouteDrawingFromCoordinates,
  buildRouteLocationLabel,
  findColumnIndex,
  fixMojibake,
  parseBooleanDropdown,
  parseCoordinates,
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

function normalizeLocalStatus(raw) {
  const value = fixMojibake(String(raw || "")).trim().toLowerCase();
  if (value === "pending" || value === "new") {
    return "pending";
  }
  if (value === "rejected" || value === "refuse") {
    return "rejected";
  }
  if (value === "test") {
    return "test";
  }
  return "validated";
}

function serializeTechnicalMeta(item) {
  const payload = {};
  if (item.associationName) {
    payload.associationName = item.associationName;
  }
  if (item.placeType) {
    payload.placeType = item.placeType;
  }
  if (item.departureLocationLabel) {
    payload.departureLocationLabel = item.departureLocationLabel;
  }
  if (item.arrivalLocationLabel) {
    payload.arrivalLocationLabel = item.arrivalLocationLabel;
  }
  if (item.routeStyle) {
    payload.routeStyle = item.routeStyle;
  }
  if (item.routeAdjustmentMessage) {
    payload.routeAdjustmentMessage = item.routeAdjustmentMessage;
  }
  return Object.keys(payload).length > 0
    ? `[cmm-meta]${JSON.stringify(payload)}`
    : null;
}

function serializeDrawing(item) {
  const drawing = item.manualDrawing;
  if (
    !drawing ||
    !Array.isArray(drawing.coordinates) ||
    (drawing.kind !== "polyline" && drawing.kind !== "polygon")
  ) {
    return null;
  }
  return `[DRAWING_GEOJSON]${JSON.stringify({
    kind: drawing.kind,
    coordinates: drawing.coordinates,
  })}`;
}

function composeActionNotes(item) {
  const parts = [];
  const baseNotes = typeof item.notes === "string" ? item.notes.trim() : "";
  if (baseNotes) {
    parts.push(baseNotes);
  }
  const meta = serializeTechnicalMeta(item);
  if (meta) {
    parts.push(meta);
  }
  const drawing = serializeDrawing(item);
  if (drawing) {
    parts.push(drawing);
  }
  parts.push("[google-sheet-sync]");
  return parts.join("\n");
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
  const index = {
    actionDate: findColumnIndex(headers, ["action_date", "date_action", "date"]),
    locationLabel: findColumnIndex(headers, [
      "location_label",
      "adresse",
      "lieu",
      "address",
      "coordo",
      "gps",
      "depart",
    ]),
    departureLocationLabel: findColumnIndex(headers, [
      "depart",
      "départ",
      "departure",
      "origine",
    ]),
    arrivalLocationLabel: findColumnIndex(headers, [
      "arrivee",
      "arrivée",
      "arrival",
      "destination",
    ]),
    placeType: findColumnIndex(headers, [
      "type de lieu",
      "type du lieu",
      "lieu type",
      "place type",
    ]),
    city: findColumnIndex(headers, ["city", "ville"]),
    latitude: findColumnIndex(headers, ["latitude", "lat"]),
    longitude: findColumnIndex(headers, ["longitude", "lng", "lon"]),
    wasteKg: findColumnIndex(headers, [
      "waste_kg",
      "kg dechets",
      "dechets(kg)",
      "dechets kg",
      "déchets(kg)",
    ]),
    cigaretteButts: findColumnIndex(headers, [
      "cigarette_butts",
      "nbr megots",
      "nombre megots",
    ]),
    megotsKg: findColumnIndex(headers, [
      "megots(kg)",
      "megots kg",
      "mégots(kg)",
      "megot(kg)",
    ]),
    megotsQuality: findColumnIndex(headers, [
      "qualite megots",
      "qualité mégots",
      "qualite mego",
      "qualité mego",
    ]),
    volunteersCount: findColumnIndex(headers, [
      "volunteers_count",
      "nombre benevoles",
      "benevoles",
      "participants",
    ]),
    durationMinutes: findColumnIndex(headers, [
      "duration_minutes",
      "temps en min",
      "duree",
      "minute",
    ]),
    associationName: findColumnIndex(headers, [
      "association_name",
      "nom d'association",
      "association",
      "asso",
    ]),
    enterpriseName: findColumnIndex(headers, [
      "enterprise_name",
      "nom_entreprise",
      "entreprise",
    ]),
    actorName: findColumnIndex(headers, ["actor_name", "nom benevole", "acteur", "actor"]),
    status: findColumnIndex(headers, ["status", "statut"]),
    notes: findColumnIndex(headers, ["notes", "commentaire", "description"]),
    cleanPlaces: findColumnIndex(headers, [
      "clean_place_label",
      "liste lieux propres",
      "lieux propres",
      "lieu propre",
    ]),
    cleanPlaceFlag: findColumnIndex(headers, [
      "lieu propre ?",
      "lieu propre",
      "clean place",
      "clean_place",
    ]),
  };

  if (
    index.actionDate < 0 &&
    index.locationLabel < 0 &&
    index.departureLocationLabel < 0 &&
    index.arrivalLocationLabel < 0
  ) {
    throw new Error("No usable route/location columns detected in sheet");
  }

  const resolveGeocode = createGeocodeResolver({
    userAgent: USER_AGENT,
    delayMs: 1100,
    acceptLanguage: "fr",
  });

  const records = [];
  const cleanPlaceSet = new Set();
  const importedAt = new Date().toISOString();

  for (const row of dataRows) {
    const rawFallbackLocationLabel =
      index.locationLabel >= 0 ? fixMojibake(row[index.locationLabel] || "") : "";
    const departureLocationLabel =
      index.departureLocationLabel >= 0
        ? fixMojibake(row[index.departureLocationLabel] || "")
        : "";
    const arrivalLocationLabel =
      index.arrivalLocationLabel >= 0
        ? fixMojibake(row[index.arrivalLocationLabel] || "")
        : "";
    const locationLabel = buildRouteLocationLabel(
      departureLocationLabel,
      arrivalLocationLabel,
      rawFallbackLocationLabel,
    );
    const actionDate = index.actionDate >= 0 ? parseIsoDateFlexible(row[index.actionDate]) : null;
    if (!locationLabel || !actionDate) {
      continue;
    }

    const city = index.city >= 0 ? fixMojibake(row[index.city] || "") : "Paris";
    const placeType =
      index.placeType >= 0 ? fixMojibake(row[index.placeType] || "") : "";
    const association = index.associationName >= 0 ? fixMojibake(row[index.associationName] || "") : "";
    const enterpriseName =
      index.enterpriseName >= 0 ? fixMojibake(row[index.enterpriseName] || "") : "";
    const actorName =
      index.actorName >= 0 ? fixMojibake(row[index.actorName] || "") : "";
    const rawNotes = index.notes >= 0 ? fixMojibake(row[index.notes] || "") : "";
    const cleanPlaceFlag =
      index.cleanPlaceFlag >= 0 ? parseBooleanDropdown(row[index.cleanPlaceFlag]) : false;
    const megotsQuality =
      index.megotsQuality >= 0 ? fixMojibake(row[index.megotsQuality] || "") : "";
    const associationName = enterpriseName
      ? `Entreprise - ${enterpriseName}`
      : association || null;
    const baseNotes = composeActionNotes({
      notes: rawNotes,
      associationName,
      placeType: placeType || null,
      departureLocationLabel: departureLocationLabel || null,
      arrivalLocationLabel: arrivalLocationLabel || null,
      routeStyle: departureLocationLabel && arrivalLocationLabel ? "souple" : null,
      routeAdjustmentMessage:
        departureLocationLabel && arrivalLocationLabel
          ? "Itinéraire reconstitué depuis les colonnes Départ / Arrivée"
          : null,
      manualDrawing: null,
    });

    let departureCoordinates = { latitude: null, longitude: null };
    let arrivalCoordinates = { latitude: null, longitude: null };
    if (index.latitude >= 0 && index.longitude >= 0) {
      departureCoordinates = parseCoordinates(row[index.latitude], row[index.longitude]);
    }
    if (
      departureCoordinates.latitude === null ||
      departureCoordinates.longitude === null
    ) {
      departureCoordinates = parseCoordsFromText(
        departureLocationLabel || rawFallbackLocationLabel || locationLabel,
      );
    }
    if (arrivalLocationLabel) {
      arrivalCoordinates = parseCoordsFromText(arrivalLocationLabel);
      if (
        (arrivalCoordinates.latitude === null ||
          arrivalCoordinates.longitude === null) &&
        geocodeEnabled
      ) {
        arrivalCoordinates = await resolveGeocode(arrivalLocationLabel);
      }
    }
    if (
      (departureCoordinates.latitude === null ||
        departureCoordinates.longitude === null) &&
      geocodeEnabled
    ) {
      departureCoordinates = await resolveGeocode(
        departureLocationLabel || rawFallbackLocationLabel || locationLabel,
      );
    }

    const hasRoute = Boolean(departureLocationLabel && arrivalLocationLabel);
    const routeDrawing =
      hasRoute &&
      departureCoordinates.latitude !== null &&
      departureCoordinates.longitude !== null &&
      arrivalCoordinates.latitude !== null &&
      arrivalCoordinates.longitude !== null
        ? buildRouteDrawingFromCoordinates(
            departureCoordinates,
            arrivalCoordinates,
            "souple",
          )
        : null;
    const representativeCoordinates =
      hasRoute &&
      departureCoordinates.latitude !== null &&
      departureCoordinates.longitude !== null &&
      arrivalCoordinates.latitude !== null &&
      arrivalCoordinates.longitude !== null
        ? buildMidpointFromCoordinates(
            departureCoordinates,
            arrivalCoordinates,
          )
        : departureCoordinates.latitude !== null &&
            departureCoordinates.longitude !== null
          ? departureCoordinates
          : arrivalCoordinates.latitude !== null &&
              arrivalCoordinates.longitude !== null
            ? arrivalCoordinates
            : { latitude: null, longitude: null };

    const wasteKg = index.wasteKg >= 0 ? toNumber(row[index.wasteKg], 0) : 0;
    const cigaretteButts =
      index.cigaretteButts >= 0
        ? Math.max(0, Math.trunc(toNumber(row[index.cigaretteButts], 0)))
        : index.megotsKg >= 0
          ? computeButtsFromMegotsKg(
              row[index.megotsKg],
              index.megotsQuality >= 0 ? row[index.megotsQuality] : "",
            )
          : 0;
    const volunteersCount =
      index.volunteersCount >= 0
        ? Math.max(1, Math.trunc(toNumber(row[index.volunteersCount], 1)))
        : 1;
    const durationMinutes =
      index.durationMinutes >= 0
        ? Math.max(1, Math.trunc(toNumber(row[index.durationMinutes], 60)))
        : 60;
    const status = normalizeLocalStatus(index.status >= 0 ? row[index.status] : "validated");
    const recordIdSeed = `${locationLabel}|${actionDate}|${associationName || actorName || ""}`;
    const recordId = stableId("real_action", recordIdSeed);
    const fullNotes = routeDrawing
      ? `${baseNotes}\n[DRAWING_GEOJSON]${JSON.stringify({
          kind: routeDrawing.kind,
          coordinates: routeDrawing.coordinates,
        })}`
      : baseNotes;

    records.push({
      id: recordId,
      recordType: "action",
      status,
      source: "google_sheet",
      title: locationLabel,
      description: fullNotes,
      location: {
        label: locationLabel,
        city: city || "Paris",
        latitude: representativeCoordinates.latitude,
        longitude: representativeCoordinates.longitude,
      },
      eventDate: actionDate,
      metrics: {
        wasteKg,
        cigaretteButts,
        volunteersCount,
        durationMinutes,
      },
      map: {
        displayable:
          representativeCoordinates.latitude !== null &&
          representativeCoordinates.longitude !== null,
        lat: representativeCoordinates.latitude,
        lon: representativeCoordinates.longitude,
      },
      trace: {
        externalId: recordId,
        originTable: "google_sheet",
        importedAt,
        notes: fullNotes,
      },
    });

    if (index.cleanPlaces >= 0) {
      const cleanPlacesRaw = fixMojibake(row[index.cleanPlaces] || "");
      if (cleanPlacesRaw) {
        for (const place of cleanPlacesRaw
          .split(/[;|\n]/)
          .map((part) => fixMojibake(part))
          .filter(Boolean)) {
          cleanPlaceSet.add(place);
        }
      }
    }
    if (index.cleanPlaceFlag >= 0 && cleanPlaceFlag) {
      cleanPlaceSet.add(locationLabel);
    }
  }

  const cleanPlaceRecords = [];
  for (const place of Array.from(cleanPlaceSet)) {
    let coordinates = parseCoordsFromText(place);
    if ((coordinates.latitude === null || coordinates.longitude === null) && geocodeEnabled) {
      coordinates = await resolveGeocode(place);
    }

    const recordId = stableId("real_clean_place", place);
    cleanPlaceRecords.push({
      id: recordId,
      recordType: "clean_place",
      status: "validated",
      source: "google_sheet",
      title: place,
      description: "Lieu propre (Google Sheet)",
      location: {
        label: place,
        city: "Paris",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      eventDate: null,
      map: {
        displayable:
          coordinates.latitude !== null && coordinates.longitude !== null,
        lat: coordinates.latitude,
        lon: coordinates.longitude,
      },
      trace: {
        externalId: recordId,
        originTable: "google_sheet",
        importedAt,
        notes: "Imported from Google Sheet column: lieux propres\n[google-sheet-sync]",
      },
    });
  }

  const output = {
    version: 1,
    updatedAt: importedAt,
    records: [...records, ...cleanPlaceRecords],
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Real dataset updated: ${OUT_PATH}`);
  console.log(`Actions: ${records.length}`);
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
