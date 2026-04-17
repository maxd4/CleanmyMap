import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ACTIONS_CSV_PATH = join(APP_DIR, "data", "raw", "google-sheet-form-like.csv");
const CLEAN_PLACES_CSV_PATH = join(APP_DIR, "data", "raw", "google-sheet-clean-places-form-like.csv");

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name, fallback) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return fallback;
  }
  return value.trim();
}

function parseBool(raw, fallback = true) {
  if (!raw) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function toCsvRows(csvText) {
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
      if (char === "\r" && next === "\n") i += 1;
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
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

async function getGoogleAccessToken(params) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: params.clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(params.privateKey);
  const jwt = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Google token response missing access_token");
  }
  return data.access_token;
}

async function sheetsRequest({ method, spreadsheetId, path = "", token, body }) {
  const response = await fetch(`${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sheets API ${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function quoteSheetName(name) {
  return `'${name.replace(/'/g, "''")}'`;
}

async function ensureSheetExists({ spreadsheetId, token, sheetName }) {
  const meta = await sheetsRequest({
    method: "GET",
    spreadsheetId,
    token,
    path: "",
  });
  const exists = (meta.sheets ?? []).some((sheet) => sheet.properties?.title === sheetName);
  if (exists) return;

  await sheetsRequest({
    method: "POST",
    spreadsheetId,
    token,
    path: ":batchUpdate",
    body: {
      requests: [
        {
          addSheet: {
            properties: { title: sheetName },
          },
        },
      ],
    },
  });
}

async function pushRows({ spreadsheetId, token, sheetName, rows, clearBeforeWrite }) {
  const range = `${quoteSheetName(sheetName)}!A1:ZZ`;
  if (clearBeforeWrite) {
    await sheetsRequest({
      method: "POST",
      spreadsheetId,
      token,
      path: `/values/${encodeURIComponent(range)}:clear`,
      body: {},
    });
  }

  await sheetsRequest({
    method: "PUT",
    spreadsheetId,
    token,
    path: `/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    body: {
      range,
      majorDimension: "ROWS",
      values: rows,
    },
  });
}

async function main() {
  const spreadsheetId = requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  const clientEmail = requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const actionsSheet = optionalEnv("GOOGLE_SHEETS_TAB_ACTIONS", "actions_form_like");
  const cleanPlacesSheet = optionalEnv("GOOGLE_SHEETS_TAB_CLEAN_PLACES", "clean_places_form_like");
  const clearBeforeWrite = parseBool(optionalEnv("GOOGLE_SHEETS_CLEAR_BEFORE_WRITE", "true"), true);

  const [actionsCsv, cleanPlacesCsv] = await Promise.all([
    readFile(ACTIONS_CSV_PATH, "utf8"),
    readFile(CLEAN_PLACES_CSV_PATH, "utf8"),
  ]);
  const actionRows = toCsvRows(actionsCsv);
  const cleanPlaceRows = toCsvRows(cleanPlacesCsv);

  const token = await getGoogleAccessToken({ clientEmail, privateKey });

  await ensureSheetExists({ spreadsheetId, token, sheetName: actionsSheet });
  await ensureSheetExists({ spreadsheetId, token, sheetName: cleanPlacesSheet });

  await pushRows({
    spreadsheetId,
    token,
    sheetName: actionsSheet,
    rows: actionRows,
    clearBeforeWrite,
  });
  await pushRows({
    spreadsheetId,
    token,
    sheetName: cleanPlacesSheet,
    rows: cleanPlaceRows,
    clearBeforeWrite,
  });

  console.log(`Google Sheets push complete.`);
  console.log(`Spreadsheet: ${spreadsheetId}`);
  console.log(`Tab actions: ${actionsSheet} (${Math.max(0, actionRows.length - 1)} rows)`);
  console.log(`Tab clean places: ${cleanPlacesSheet} (${Math.max(0, cleanPlaceRows.length - 1)} rows)`);
}

main().catch((error) => {
  console.error("push-google-sheet-from-form-like failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

