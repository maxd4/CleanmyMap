import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeButtsFromMegotsKg,
  createGeocodeResolver,
  findColumnIndex,
  fixMojibake,
  parseBooleanDropdown,
  parseCoordinates,
  parseCoordsFromText,
  parseCsv,
  parseIsoDateFlexible,
  toCsv,
  toInteger,
  toNumber,
} from "./lib/sheet-ingestion-core.mjs";

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1kKkhylwqo10OA-p6CDuNwYihzW0ElwTeFwCwZ6O-rJw/export?format=csv&gid=0";
const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const RAW_PATH = join(APP_DIR, "data", "raw", "google-sheet-admin-actions.csv");
const OUT_PATH = join(APP_DIR, "data", "raw", "google-sheet-admin-import.json");
const OUT_FORM_CSV_PATH = join(APP_DIR, "data", "raw", "google-sheet-form-like.csv");
const OUT_CLEAN_PLACES_PATH = join(APP_DIR, "data", "raw", "google-sheet-clean-places-import.json");
const OUT_CLEAN_PLACES_FORM_CSV_PATH = join(APP_DIR, "data", "raw", "google-sheet-clean-places-form-like.csv");
const ASSOCIATION_OPTIONS_PATH = join(APP_DIR, "src", "lib", "actions", "association-options.ts");
const USER_AGENT = "cleanmymap-web-admin-import/1.0 (contact: admin@cleanmymap.local)";

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

function buildEntrepriseAssociationName(enterpriseName) {
  const trimmed = fixMojibake(String(enterpriseName || ""));
  if (!trimmed) {
    return null;
  }
  return `Entreprise - ${trimmed.slice(0, 100)}`;
}

async function readAssociationOptions() {
  const source = await readFile(ASSOCIATION_OPTIONS_PATH, "utf8");
  const block = source.match(
    /export const ASSOCIATION_SELECTION_OPTIONS = \[([\s\S]*?)\] as const;/,
  );
  if (!block) {
    return new Set(["Action spontanee", "Entreprise"]);
  }
  const names = new Set();
  const literalRegex = /"([^"]+)"/g;
  let match = literalRegex.exec(block[1]);
  while (match) {
    names.add(match[1]);
    match = literalRegex.exec(block[1]);
  }
  return names;
}

function normalizeAssociation(associationName, enterpriseName, knownAssociations) {
  const enterpriseAssociation = buildEntrepriseAssociationName(enterpriseName);
  if (enterpriseAssociation) {
    return { associationName: enterpriseAssociation, originalAssociationName: null };
  }
  const association = fixMojibake(String(associationName || ""));
  if (!association) {
    return { associationName: null, originalAssociationName: null };
  }
  if (association.toLowerCase() === "entreprise") {
    return {
      associationName: "Entreprise - Non precise",
      originalAssociationName: null,
    };
  }
  if (knownAssociations.has(association)) {
    return {
      associationName: association.slice(0, 120),
      originalAssociationName: null,
    };
  }
  return {
    associationName: "Action spontanee",
    originalAssociationName: association.slice(0, 120),
  };
}

function splitEnterpriseAssociation(associationName) {
  if (typeof associationName !== "string") {
    return { associationName: "", enterpriseName: "" };
  }
  const normalized = associationName.trim();
  if (!normalized.startsWith("Entreprise - ")) {
    return { associationName: normalized, enterpriseName: "" };
  }
  return {
    associationName: "Entreprise",
    enterpriseName: normalized.slice("Entreprise - ".length).trim(),
  };
}

function normalizeStatus(raw) {
  const value = fixMojibake(String(raw || "")).toLowerCase();
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  if (value === "valide" || value === "validated") return "approved";
  if (value === "refuse" || value === "rejected") return "rejected";
  return "approved";
}

async function main() {
  const cliArgs = process.argv.slice(2);
  const geocodeEnabled = cliArgs.includes("--geocode");
  const sheetUrlArg = cliArgs.find((arg) => arg.startsWith("http"));
  const sheetUrl =
    sheetUrlArg || process.env.CLEANMYMAP_SHEET_URL || DEFAULT_SHEET_URL;
  const knownAssociations = await readAssociationOptions();

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
    try {
      const existingPayloadText = await readFile(OUT_PATH, "utf8");
      const existingPayload = JSON.parse(existingPayloadText);
      const existingItems = Array.isArray(existingPayload?.items)
        ? existingPayload.items
        : [];
      if (existingItems.length > 0) {
        console.warn(
          "Google Sheet unreachable/empty and no usable CSV snapshot. Reusing existing admin payload:",
          OUT_PATH,
        );
        console.warn(
          "Tip: rerun with a valid CLEANMYMAP_SHEET_URL once network/sharing is fixed.",
        );
        return;
      }
    } catch {
      // No usable existing payload.
    }

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
    type: findColumnIndex(headers, ["type"]),
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

  if (index.actionDate < 0 || index.locationLabel < 0) {
    throw new Error("Missing required columns: action_date and/or location_label");
  }

  const resolveGeocode = createGeocodeResolver({
    userAgent: USER_AGENT,
    delayMs: 1100,
    acceptLanguage: "fr",
  });

  const items = [];
  const cleanPlaceLabels = new Set();
  let skipped = 0;

  for (const row of dataRows) {
    const actionDate = parseIsoDateFlexible(row[index.actionDate]);
    const locationLabel = fixMojibake(String(row[index.locationLabel] || ""));
    if (!actionDate || !locationLabel) {
      skipped += 1;
      continue;
    }

    let coordinates = { latitude: null, longitude: null };
    if (index.latitude >= 0 && index.longitude >= 0) {
      coordinates = parseCoordinates(row[index.latitude], row[index.longitude]);
    }
    if (coordinates.latitude === null || coordinates.longitude === null) {
      coordinates = parseCoordsFromText(locationLabel);
    }
    if ((coordinates.latitude === null || coordinates.longitude === null) && geocodeEnabled) {
      coordinates = await resolveGeocode(locationLabel);
    }

    const associationNormalized = normalizeAssociation(
      index.associationName >= 0 ? row[index.associationName] : null,
      index.enterpriseName >= 0 ? row[index.enterpriseName] : null,
      knownAssociations,
    );
    const associationName = associationNormalized.associationName ?? undefined;

    const type = index.type >= 0 ? fixMojibake(String(row[index.type] || "")) : "";
    const city = index.city >= 0 ? fixMojibake(String(row[index.city] || "")) : "";
    const rawNotes = index.notes >= 0 ? fixMojibake(String(row[index.notes] || "")) : "";
    const systemNotes = [type ? `Type: ${type}` : "", city ? `City: ${city}` : ""]
      .filter(Boolean)
      .join(" | ");
    const associationFallbackNote = associationNormalized.originalAssociationName
      ? `Original association: ${associationNormalized.originalAssociationName}`
      : "";
    const notes =
      [rawNotes, systemNotes, associationFallbackNote].filter(Boolean).join(" || ") ||
      undefined;

    items.push({
      actorName:
        index.actorName >= 0
          ? fixMojibake(String(row[index.actorName] || "")) || undefined
          : undefined,
      associationName,
      actionDate,
      locationLabel,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      wasteKg: Math.max(0, toNumber(index.wasteKg >= 0 ? row[index.wasteKg] : 0, 0)),
      cigaretteButts: Math.max(
        0,
        index.cigaretteButts >= 0
          ? toInteger(row[index.cigaretteButts], 0)
          : index.megotsKg >= 0
            ? computeButtsFromMegotsKg(
                row[index.megotsKg],
                index.megotsQuality >= 0 ? row[index.megotsQuality] : "",
              )
            : 0,
      ),
      volunteersCount: Math.max(
        1,
        toInteger(index.volunteersCount >= 0 ? row[index.volunteersCount] : 1, 1),
      ),
      durationMinutes: Math.max(
        1,
        toInteger(index.durationMinutes >= 0 ? row[index.durationMinutes] : 60, 60),
      ),
      notes,
      status: normalizeStatus(index.status >= 0 ? row[index.status] : "approved"),
    });

    if (index.cleanPlaces >= 0) {
      const cleanPlacesRaw = fixMojibake(String(row[index.cleanPlaces] || ""));
      if (cleanPlacesRaw) {
        for (const place of cleanPlacesRaw
          .split(/[;|\n]/)
          .map((part) => fixMojibake(part))
          .filter(Boolean)) {
          cleanPlaceLabels.add(place);
        }
      }
    }
    if (
      index.cleanPlaceFlag >= 0 &&
      parseBooleanDropdown(row[index.cleanPlaceFlag])
    ) {
      cleanPlaceLabels.add(locationLabel);
    }
  }

  const payload = { items };
  await writeFile(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const formLikeRows = [
    [
      "actor_name",
      "association_name",
      "enterprise_name",
      "action_date",
      "location_label",
      "latitude",
      "longitude",
      "waste_kg",
      "cigarette_butts",
      "volunteers_count",
      "duration_minutes",
      "notes",
      "submission_mode",
      "status",
    ],
    ...items.map((item) => {
      const associationSplit = splitEnterpriseAssociation(item.associationName ?? "");
      return [
        item.actorName ?? "",
        associationSplit.associationName,
        associationSplit.enterpriseName,
        item.actionDate,
        item.locationLabel,
        item.latitude ?? "",
        item.longitude ?? "",
        item.wasteKg,
        item.cigaretteButts,
        item.volunteersCount,
        item.durationMinutes,
        item.notes ?? "",
        "complete",
        item.status ?? "approved",
      ];
    }),
  ];
  await writeFile(OUT_FORM_CSV_PATH, toCsv(formLikeRows), "utf8");

  const cleanPlaceItems = [];
  for (const label of Array.from(cleanPlaceLabels)) {
    let coordinates = parseCoordsFromText(label);
    if ((coordinates.latitude === null || coordinates.longitude === null) && geocodeEnabled) {
      coordinates = await resolveGeocode(label);
    }
    cleanPlaceItems.push({
      type: "clean_place",
      label,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      status: "validated",
      notes: "Imported from Google Sheet column: lieux propres",
    });
  }
  await writeFile(
    OUT_CLEAN_PLACES_PATH,
    `${JSON.stringify({ items: cleanPlaceItems }, null, 2)}\n`,
    "utf8",
  );

  const cleanPlaceFormRows = [
    ["type", "label", "latitude", "longitude", "status", "notes"],
    ...cleanPlaceItems.map((item) => [
      item.type,
      item.label,
      item.latitude ?? "",
      item.longitude ?? "",
      item.status,
      item.notes,
    ]),
  ];
  await writeFile(OUT_CLEAN_PLACES_FORM_CSV_PATH, toCsv(cleanPlaceFormRows), "utf8");

  const geocoded = items.filter(
    (item) => item.latitude !== null && item.longitude !== null,
  ).length;
  const cleanGeocoded = cleanPlaceItems.filter(
    (item) => item.latitude !== null && item.longitude !== null,
  ).length;
  console.log(`Admin import payload generated: ${OUT_PATH}`);
  console.log(`Form-like CSV generated: ${OUT_FORM_CSV_PATH}`);
  console.log(`Clean places payload generated: ${OUT_CLEAN_PLACES_PATH}`);
  console.log(`Clean places form-like CSV generated: ${OUT_CLEAN_PLACES_FORM_CSV_PATH}`);
  console.log(`Rows parsed: ${items.length}`);
  console.log(`Clean places parsed: ${cleanPlaceItems.length}`);
  console.log(`Rows skipped: ${skipped}`);
  console.log(`Map-displayable points: ${geocoded}/${items.length}`);
  console.log(`Map-displayable clean places: ${cleanGeocoded}/${cleanPlaceItems.length}`);
  if (!geocodeEnabled) {
    console.log("Tip: add --geocode to enrich missing coordinates.");
  }
}

main().catch((error) => {
  console.error(
    "build-admin-import-from-sheet failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
