const GOOGLE_SHEETS_HOSTNAME = "docs.google.com";
const SHEET_PATH_REGEX = /^\/spreadsheets\/d\/([^/]+)/;

function extractSheetReference(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== GOOGLE_SHEETS_HOSTNAME) {
      return null;
    }

    const match = parsed.pathname.match(SHEET_PATH_REGEX);
    if (!match) {
      return null;
    }

    return {
      sheetId: match[1],
      gid: parsed.searchParams.get("gid") ?? "0",
    };
  } catch {
    return null;
  }
}

export function assertGoogleSheetUrl(rawUrl) {
  const reference = extractSheetReference(rawUrl);
  if (!reference) {
    throw new Error(
      "Only https://docs.google.com/spreadsheets/d/<sheetId>/... URLs are allowed for Google Sheet imports.",
    );
  }

  return rawUrl;
}

export function buildGoogleSheetCsvCandidates(rawUrl) {
  const reference = extractSheetReference(rawUrl);
  if (!reference) {
    return [];
  }

  const candidates = [
    rawUrl,
    `https://docs.google.com/spreadsheets/d/${reference.sheetId}/export?format=csv&gid=${reference.gid}`,
    `https://docs.google.com/spreadsheets/d/${reference.sheetId}/gviz/tq?tqx=out:csv&gid=${reference.gid}`,
  ];

  return [...new Set(candidates)];
}
