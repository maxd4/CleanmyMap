export function fixMojibake(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .replaceAll("Ãƒâ€š", "")
    .replaceAll("Ã‚°", "°")
    .replaceAll("Ã‚", "")
    .replaceAll("°", "°")
    .replaceAll("ÃƒÆ'Ã‚Â©", "é")
    .replaceAll("ÃƒÆ'Ã‚Â¨", "è")
    .replaceAll("ÃƒÆ'Ã‚Âª", "ê")
    .replaceAll("ÃƒÆ'Ã‚Â«", "ë")
    .replaceAll("ÃƒÆ' ", "à")
    .replaceAll("ÃƒÆ'Ã‚Â§", "ç")
    .replaceAll("ÃƒÆ'Ã‚Â®", "î")
    .replaceAll("ÃƒÆ'Ã‚Â´", "ô")
    .replaceAll("ÃƒÆ'Ã‚Â»", "û")
    .replaceAll("ÃƒÆ'Ã¢â‚¬°", "É")
    .replaceAll("ÃƒÂ©", "é")
    .replaceAll("ÃƒÂ¨", "è")
    .replaceAll("ÃƒÂª", "ê")
    .replaceAll("ÃƒÂ«", "ë")
    .replaceAll("Ãƒ ", "à")
    .replaceAll("ÃƒÂ§", "ç")
    .replaceAll("ÃƒÂ®", "î")
    .replaceAll("ÃƒÂ´", "ô")
    .replaceAll("ÃƒÂ»", "û")
    .replaceAll("Ãƒâ€°", "É")
    .replaceAll("Ãƒ", "à")
    .trim();
}

export function parseCsv(csvText) {
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

export function toCsv(rows) {
  function escapeCell(value) {
    const raw = String(value ?? "");
    if (
      raw.includes(",") ||
      raw.includes('"') ||
      raw.includes("\n") ||
      raw.includes("\r")
    ) {
      return `"${raw.replaceAll('"', '""')}"`;
    }
    return raw;
  }
  return `${rows.map((row) => row.map((cell) => escapeCell(cell)).join(",")).join("\n")}\n`;
}

export function normalizeHeaderCell(value) {
  return fixMojibake(String(value || ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function findColumnIndex(headers, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeHeaderCell(alias));
  for (let index = 0; index < headers.length; index += 1) {
    const cell = normalizeHeaderCell(headers[index]);
    if (
      normalizedAliases.some(
        (alias) => cell === alias || cell.includes(alias),
      )
    ) {
      return index;
    }
  }
  return -1;
}

export function parseIsoDateFlexible(raw) {
  const clean = fixMojibake(String(raw || ""));
  if (!clean) {
    return null;
  }
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return clean;
  }
  const fr = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) {
    return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }
  return null;
}

export function toNumber(raw, fallback = 0) {
  const value = Number(
    String(raw ?? "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
      .trim(),
  );
  return Number.isFinite(value) ? value : fallback;
}

export function toInteger(raw, fallback = 0) {
  return Math.trunc(toNumber(raw, fallback));
}

export function normalizeMegotsCondition(raw) {
  const value = normalizeHeaderCell(String(raw || ""));
  if (!value) {
    return "propre";
  }
  if (value.includes("mouille")) {
    return "mouille";
  }
  if (value.includes("humide")) {
    return "humide";
  }
  return "propre";
}

const BUTTS_PER_KG_REFERENCE = 2500;
const CONDITION_WEIGHT_FACTORS = {
  propre: 1.0,
  humide: 0.7,
  mouille: 0.4,
};

export function computeButtsFromMegotsKg(megotsKgRaw, qualityRaw) {
  const megotsKg = Math.max(0, toNumber(megotsKgRaw, 0));
  const condition = normalizeMegotsCondition(qualityRaw);
  return Math.round(
    megotsKg * BUTTS_PER_KG_REFERENCE * CONDITION_WEIGHT_FACTORS[condition],
  );
}

export function parseBooleanDropdown(raw) {
  const value = normalizeHeaderCell(String(raw || ""));
  if (!value) {
    return false;
  }
  return ["oui", "yes", "true", "1", "x", "clean", "propre"].includes(value);
}

export function parseCoordinates(rawLat, rawLon) {
  const latitude = toNumber(rawLat, Number.NaN);
  const longitude = toNumber(rawLon, Number.NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { latitude: null, longitude: null };
  }
  return { latitude, longitude };
}

export function parseCoordsFromText(raw) {
  const value = fixMojibake(String(raw || ""));
  if (!value) {
    return { latitude: null, longitude: null };
  }

  const decimal = value.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (decimal) {
    const latitude = Number(decimal[1]);
    const longitude = Number(decimal[2]);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
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
  let longitude =
    Number(dms[5]) + Number(dms[6]) / 60 + Number(dms[7]) / 3600;
  if (dms[8].toUpperCase() === "W") {
    longitude *= -1;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null };
  }
  return { latitude, longitude };
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeAddress(address, params) {
  const query = encodeURIComponent(`${address}, Paris, France`);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=fr&q=${query}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": params.userAgent,
      "Accept-Language": params.acceptLanguage ?? "fr",
    },
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

export function createGeocodeResolver(params) {
  const delayMs = params.delayMs ?? 1100;
  const cache = new Map();

  return async function resolve(address) {
    if (!cache.has(address)) {
      const resolved = await geocodeAddress(address, {
        userAgent: params.userAgent,
        acceptLanguage: params.acceptLanguage ?? "fr",
      });
      cache.set(address, resolved);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
    return cache.get(address) ?? { latitude: null, longitude: null };
  };
}
