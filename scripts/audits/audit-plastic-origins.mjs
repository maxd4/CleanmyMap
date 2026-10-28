import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const SOURCE_DATASET = Object.freeze({
  title: "Déchets en rivière en France",
  publisher: "Plastic Origins / Surfrider Foundation Europe",
  datasetUrl: "https://www.data.gouv.fr/datasets/dechets-en-riviere-en-france",
  documentationUrl: "https://static.data.gouv.fr/resources/dechets-en-riviere-en-france/20240604-131305/wiki-open-data-2.pdf",
  license: "ODbL-1.0",
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  documentationDeclaredLicense: "CC BY-NC 3.0 France",
  licenseNote:
    "La fiche data.gouv.fr actuelle déclare ODbL ; le PDF de documentation daté du 04/06/2024 affiche CC BY-NC 3.0 France. Cette divergence est conservée comme réserve de provenance.",
  coordinateOrder: "latitude, longitude",
  coordinateReferenceSystem: null,
  coordinateReferenceSystemNote:
    "Les CSV et la documentation indiquent des latitudes/longitudes relevées par le téléphone, mais ne déclarent pas de CRS. L'export conserve les décimales sources et n'effectue aucune reprojection.",
});

export const SOURCE_RESOURCES = Object.freeze([
  {
    year: 2022,
    filename: "2022.csv",
    resourceId: "51440a7a-2d67-428c-aebd-70089abbe1ca",
    title: "Jeu de données - Déchets en rivière en France (2022)",
    url: "https://static.data.gouv.fr/resources/dechets-en-riviere-en-france/20230912-151701/opendata-po-2022-fr.csv",
  },
  {
    year: 2023,
    filename: "2023.csv",
    resourceId: "4b56702a-5be8-45ef-b07f-5437a734a87b",
    title: "Jeu de données - Déchets en rivière en France (2023)",
    url: "https://static.data.gouv.fr/resources/dechets-en-riviere-en-france/20240604-130403/open-data-2023-fr.csv",
  },
  {
    year: 2024,
    filename: "2024.csv",
    resourceId: "747150e4-8c05-4e57-99a9-5d99598b29a0",
    title: "Jeu de données - Déchets en rivière en France (2024)",
    url: "https://static.data.gouv.fr/resources/dechets-en-riviere-en-france/20250207-095656/open-data-2024-fr.csv",
  },
  {
    year: 2025,
    filename: "2025.csv",
    resourceId: "9fdfcaa8-acdd-4d21-b018-797f602bd1cb",
    title: "Jeu de données - Déchets en rivière en France (2025)",
    url: "https://static.data.gouv.fr/resources/dechets-en-riviere-en-france/20251202-141251/trashes-2025-01-01-2025-12-31.csv",
  },
]);

export const SOURCE_COLUMNS = Object.freeze([
  "campaign_id",
  "move",
  "date",
  "bank",
  "tracking_mode",
  "trash_type",
  "lat",
  "lon",
  "municipality",
  "department",
  "state",
  "country",
  "river_name",
]);

const REQUIRED_COLUMNS = Object.freeze([
  "campaign_id",
  "date",
  "tracking_mode",
  "trash_type",
  "lat",
  "lon",
]);

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function detectDelimiter(header) {
  return (header.match(/;/g) ?? []).length > (header.match(/,/g) ?? []).length
    ? ";"
    : ",";
}

export function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalized.split(/\r?\n/, 1)[0] ?? "");
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const next = normalized[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === delimiter) {
      record.push(field);
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") index += 1;
      record.push(field);
      field = "";
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
    } else {
      field += character;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    if (record.some((value) => value !== "")) records.push(record);
  }

  const headers = records.shift() ?? [];
  return {
    delimiter,
    headers,
    rows: records.map((values) => Object.fromEntries(
      headers.map((header, column) => [header, values[column] ?? ""]),
    )),
  };
}

function nullIfBlank(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeSourceDate(value) {
  const source = nullIfBlank(value);
  if (!source) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(source);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}`;
  const french = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})$/.exec(source);
  if (french) return `${french[3]}-${french[2]}-${french[1]}T${french[4]}`;
  return null;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDateForAudit(value) {
  return normalizeSourceDate(value) ?? null;
}

function sourceSignature(row) {
  return JSON.stringify(SOURCE_COLUMNS.map((column) => row[column] ?? ""));
}

function availableFields(row) {
  return SOURCE_COLUMNS.filter((column) => nullIfBlank(row[column]) !== null);
}

function normalizeGroup(resource, content, group) {
  const first = group.rows[0];
  const latitude = finiteNumber(first.lat);
  const longitude = finiteNumber(first.lon);
  return {
    stableKey: `plastic-origins:${resource.year}:${group.sourceRows[0]}`,
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      sourceCampaignId: nullIfBlank(first.campaign_id),
      observedAt: formatDateForAudit(first.date),
      sourceDate: nullIfBlank(first.date),
      category: nullIfBlank(first.trash_type),
      method: nullIfBlank(first.tracking_mode),
      move: nullIfBlank(first.move),
      bank: nullIfBlank(first.bank),
      municipality: nullIfBlank(first.municipality),
      department: nullIfBlank(first.department),
      region: nullIfBlank(first.state),
      country: nullIfBlank(first.country),
      riverName: nullIfBlank(first.river_name),
      availableSourceFields: availableFields(first),
      source: {
        resourceId: resource.resourceId,
        sourceFile: resource.filename,
        sourceRows: group.sourceRows,
        sourceRecordCount: group.sourceRows.length,
        exactDuplicateGroup: group.sourceRows.length > 1,
      },
    },
  };
}

export function auditSources({ sourceDir }) {
  const files = [];
  const allRows = [];
  const sourceErrors = [];

  for (const resource of SOURCE_RESOURCES) {
    const filePath = path.join(sourceDir, resource.filename);
    if (!fs.existsSync(filePath)) {
      sourceErrors.push(`${resource.filename}: fichier absent`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseCsv(content);
    const rows = parsed.rows.map((row, index) => ({
      ...row,
      _sourceFile: resource.filename,
      _sourceRow: index + 2,
      _resource: resource,
    }));
    const groups = new Map();
    const missingByField = Object.fromEntries(SOURCE_COLUMNS.map((column) => [
      column,
      rows.filter((row) => nullIfBlank(row[column]) === null).length,
    ]));
    const dates = rows.map((row) => normalizeSourceDate(row.date));
    const invalidLat = rows.filter((row) => {
      const value = finiteNumber(row.lat);
      return value === null || value < -90 || value > 90;
    });
    const invalidLon = rows.filter((row) => {
      const value = finiteNumber(row.lon);
      return value === null || value < -180 || value > 180;
    });
    for (const row of rows) {
      const key = sourceSignature(row);
      const group = groups.get(key) ?? { sourceRows: [], rows: [] };
      group.sourceRows.push(row._sourceRow);
      group.rows.push(row);
      groups.set(key, group);
      allRows.push(row);
    }
    const categories = Object.fromEntries([...new Set(rows.map((row) => row.trash_type))].sort().map((value) => [
      value || "",
      rows.filter((row) => row.trash_type === value).length,
    ]));
    const methods = Object.fromEntries([...new Set(rows.map((row) => row.tracking_mode))].sort().map((value) => [
      value || "",
      rows.filter((row) => row.tracking_mode === value).length,
    ]));
    const validDates = dates.filter(Boolean).sort();
    const report = {
      year: resource.year,
      filename: resource.filename,
      resourceId: resource.resourceId,
      sourceUrl: resource.url,
      sourceSha256: sha256(content),
      delimiter: parsed.delimiter,
      headers: parsed.headers,
      rows: rows.length,
      normalizedObservations: groups.size,
      exactDuplicateRows: rows.length - groups.size,
      missingByField,
      invalidCoordinates: { latitude: invalidLat.length, longitude: invalidLon.length },
      unparsedDates: dates.filter((value) => value === null).length,
      dateMin: validDates[0] ?? null,
      dateMax: validDates.at(-1) ?? null,
      campaigns: new Set(rows.map((row) => row.campaign_id)).size,
      categories,
      methods,
      quality: {
        schemaMatchesExpected: parsed.headers.join("|") === SOURCE_COLUMNS.join("|"),
        requiredFieldsComplete: REQUIRED_COLUMNS.every((column) => missingByField[column] === 0),
        coordinatesInBounds: invalidLat.length === 0 && invalidLon.length === 0,
        datesParseable: dates.every(Boolean),
      },
    };
    files.push({ resource, content, parsed, rows, groups, report });
  }

  const allGroups = new Map();
  for (const file of files) {
    for (const group of file.groups.values()) {
      const observation = normalizeGroup(file.resource, file.content, group);
      allGroups.set(observation.stableKey, observation);
    }
  }
  const missingByField = Object.fromEntries(SOURCE_COLUMNS.map((column) => [
    column,
    allRows.filter((row) => nullIfBlank(row[column]) === null).length,
  ]));
  const allSignatures = new Map();
  for (const row of allRows) {
    const key = sourceSignature(row);
    const filesForSignature = allSignatures.get(key) ?? new Set();
    filesForSignature.add(row._sourceFile);
    allSignatures.set(key, filesForSignature);
  }
  const crossResourceExactDuplicateGroups = [...allSignatures.values()]
    .filter((sourceFiles) => sourceFiles.size > 1)
    .length;
  return {
    sourceErrors,
    files: files.map((file) => file.report),
    rows: allRows.length,
    normalizedObservations: allGroups.size,
    exactDuplicateRows: allRows.length - allGroups.size,
    crossResourceExactDuplicateGroups,
    missingByField,
    dateMin: files.flatMap((file) => file.report.dateMin ? [file.report.dateMin] : []).sort()[0] ?? null,
    dateMax: files.flatMap((file) => file.report.dateMax ? [file.report.dateMax] : []).sort().at(-1) ?? null,
    sourceCrsDeclared: SOURCE_DATASET.coordinateReferenceSystem !== null,
    allCoordinatesInBounds: files.every((file) => file.report.quality.coordinatesInBounds),
    allDatesParseable: files.every((file) => file.report.quality.datesParseable),
    allSchemasValid: files.every((file) => file.report.quality.schemaMatchesExpected),
    observations: [...allGroups.values()],
  };
}

export function buildExport(audit, generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    generatedAt,
    source: SOURCE_DATASET,
    sourceResources: audit.files,
    quality: {
      sourceRows: audit.rows,
      normalizedObservations: audit.normalizedObservations,
      exactDuplicateRowsGrouped: audit.exactDuplicateRows,
      crossResourceExactDuplicateGroups: audit.crossResourceExactDuplicateGroups,
      missingByField: audit.missingByField,
      dateMin: audit.dateMin,
      dateMax: audit.dateMax,
      sourceCrsDeclared: audit.sourceCrsDeclared,
      allCoordinatesInBounds: audit.allCoordinatesInBounds,
      allDatesParseable: audit.allDatesParseable,
      allSchemasValid: audit.allSchemasValid,
    },
    observations: audit.observations,
  };
}

function parseArguments(argv) {
  const args = { sourceDir: null, exportPath: null, reportPath: null, write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source-dir") args.sourceDir = argv[++index];
    else if (argument === "--export") args.exportPath = argv[++index];
    else if (argument === "--report") args.reportPath = argv[++index];
    else if (argument === "--write") args.write = true;
    else if (argument === "--help") {
      console.log("Usage: node scripts/audits/audit-plastic-origins.mjs --source-dir <dir> [--report <file>] [--export <file> --write]");
      process.exit(0);
    } else {
      throw new Error(`Argument inconnu: ${argument}`);
    }
  }
  if (!args.sourceDir) throw new Error("--source-dir est obligatoire");
  return args;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const audit = auditSources({ sourceDir: path.resolve(args.sourceDir) });
  const output = buildExport(audit);
  const report = {
    ...output,
    observations: undefined,
    sourceErrors: audit.sourceErrors,
  };
  if (args.write && args.exportPath) {
    fs.mkdirSync(path.dirname(path.resolve(args.exportPath)), { recursive: true });
    fs.writeFileSync(path.resolve(args.exportPath), `${JSON.stringify(output)}\n`, "utf8");
  }
  if (args.reportPath) {
    fs.mkdirSync(path.dirname(path.resolve(args.reportPath)), { recursive: true });
    fs.writeFileSync(path.resolve(args.reportPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({
    sourceErrors: audit.sourceErrors,
    sourceRows: audit.rows,
    normalizedObservations: audit.normalizedObservations,
    exactDuplicateRowsGrouped: audit.exactDuplicateRows,
    allCoordinatesInBounds: audit.allCoordinatesInBounds,
    allDatesParseable: audit.allDatesParseable,
    allSchemasValid: audit.allSchemasValid,
    crossResourceExactDuplicateGroups: audit.crossResourceExactDuplicateGroups,
    exportWritten: Boolean(args.write && args.exportPath),
  }, null, 2));
}
