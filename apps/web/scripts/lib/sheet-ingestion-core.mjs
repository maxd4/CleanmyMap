export function fixMojibake(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .replaceAll("Ãƒâ€š", "")
    .replaceAll("Ã‚°", "°")
    .replaceAll("Ã‚", "")

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

function normalizeHeaderCell(value) {
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

function toNumber(raw, fallback = 0) {
  const normalized = String(raw ?? "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!normalized) {
    return fallback;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

export function toNullableNumber(raw, fieldLabel = "Valeur numérique") {
  if (raw === null || raw === undefined) {
    return null;
  }
  const text = String(raw).trim();
  if (!text) {
    return null;
  }
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) {
    throw new Error(`${fieldLabel} invalide: ${String(raw)}`);
  }
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldLabel} invalide: ${String(raw)}`);
  }
  return value;
}

export function toInteger(raw, fallback = 0) {
  return Math.trunc(toNumber(raw, fallback));
}

function normalizeMegotsCondition(raw) {
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

  const decimal = findDecimalCoordinatePair(value);
  if (decimal) {
    const latitude = decimal[0];
    const longitude = decimal[1];
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

  const dms = findDmsCoordinateParts(value);
  if (!dms) {
    return { latitude: null, longitude: null };
  }

  let latitude = dms.latitudeDegrees + dms.latitudeMinutes / 60 + dms.latitudeSeconds / 3600;
  if (dms.latitudeDirection === "S") {
    latitude *= -1;
  }
  let longitude =
    dms.longitudeDegrees + dms.longitudeMinutes / 60 + dms.longitudeSeconds / 3600;
  if (dms.longitudeDirection === "W") {
    longitude *= -1;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null };
  }
  return { latitude, longitude };
}

function readCoordinateNumber(value, start) {
  let cursor = start;
  const numberStart = cursor;
  if (value[cursor] === "-" && isAsciiDigit(value[cursor + 1])) cursor += 1;
  const integerStart = cursor;
  while (cursor < value.length && isAsciiDigit(value[cursor])) cursor += 1;
  if (cursor === integerStart) return null;
  if (value[cursor] === ".") {
    cursor += 1;
    const fractionStart = cursor;
    while (cursor < value.length && isAsciiDigit(value[cursor])) cursor += 1;
    if (cursor === fractionStart) return null;
  }
  return { value: Number(value.slice(numberStart, cursor)), end: cursor };
}

function findDecimalCoordinatePair(value) {
  let index = 0;
  while (index < value.length) {
    const startsNumber =
      (isAsciiDigit(value[index]) && !isAsciiDigit(value[index - 1])) ||
      (value[index] === "-" && isAsciiDigit(value[index + 1]));
    if (!startsNumber) {
      index += 1;
      continue;
    }
    const first = readCoordinateNumber(value, index);
    if (!first) {
      index += 1;
      continue;
    }
    let separator = first.end;
    const hadWhitespace = isWhitespace(value[separator]);
    while (isWhitespace(value[separator])) separator += 1;
    if (!hadWhitespace && ![",", ";"].includes(value[separator] ?? "")) {
      index = first.end;
      continue;
    }
    if (value[separator] === "," || value[separator] === ";") separator += 1;
    while (isWhitespace(value[separator])) separator += 1;
    const second = readCoordinateNumber(value, separator);
    if (second) return [first.value, second.value];
    index = Math.max(first.end, separator);
  }
  return null;
}

function findDmsCoordinateParts(value) {
  const digitRuns = [];
  let scan = 0;
  while (scan < value.length) {
    if (!isAsciiDigit(value[scan])) {
      scan += 1;
      continue;
    }
    const start = scan;
    while (scan < value.length && isAsciiDigit(value[scan])) scan += 1;
    digitRuns.push({ start, end: scan, value: Number(value.slice(start, scan)) });
  }

  const readUnsigned = (tokenIndex, decimal = false) => {
    const token = digitRuns[tokenIndex];
    if (!token) return null;
    const fraction = digitRuns[tokenIndex + 1];
    if (decimal && value[token.end] === "." && fraction?.start === token.end + 1) {
      return {
        value: Number(value.slice(token.start, fraction.end)),
        end: fraction.end,
        tokenIndex: tokenIndex + 1,
      };
    }
    return { value: token.value, end: token.end, tokenIndex };
  };

  const consumeSeparator = (number, predicate) => {
    const nextToken = digitRuns[number.tokenIndex + 1];
    if (!nextToken) return null;
    let cursor = number.end;
    while (cursor < nextToken.start && predicate(value[cursor])) cursor += 1;
    return cursor === nextToken.start ? number.tokenIndex + 1 : null;
  };

  const consumeDirection = (number, directionSet, requiresNextToken = true) => {
    let cursor = number.end;
    while (value[cursor] === '"' || isWhitespace(value[cursor])) cursor += 1;
    const direction = value[cursor]?.toUpperCase();
    if (!directionSet.includes(direction)) return null;
    cursor += 1;
    while (isWhitespace(value[cursor])) cursor += 1;
    const nextToken = digitRuns[number.tokenIndex + 1];
    if (!requiresNextToken) return { direction, tokenIndex: number.tokenIndex };
    if (!nextToken || nextToken.start !== cursor) return null;
    return { direction, tokenIndex: number.tokenIndex + 1 };
  };

  for (let tokenIndex = 0; tokenIndex < digitRuns.length; tokenIndex += 1) {
    const latitudeDegrees = readUnsigned(tokenIndex);
    const latitudeMinutesIndex = consumeSeparator(
      latitudeDegrees,
      (character) => character === "°" || isWhitespace(character),
    );
    if (latitudeMinutesIndex === null) continue;
    const latitudeMinutes = readUnsigned(latitudeMinutesIndex);
    const latitudeSecondsIndex = consumeSeparator(
      latitudeMinutes,
      (character) => character === "'" || isWhitespace(character),
    );
    if (latitudeSecondsIndex === null) continue;
    const latitudeSeconds = readUnsigned(latitudeSecondsIndex, true);
    const latitudeDirection = consumeDirection(latitudeSeconds, ["N", "S"]);
    if (!latitudeDirection) continue;
    const longitudeDegrees = readUnsigned(latitudeDirection.tokenIndex);
    const longitudeMinutesIndex = consumeSeparator(
      longitudeDegrees,
      (character) => character === "°" || isWhitespace(character),
    );
    if (longitudeMinutesIndex === null) continue;
    const longitudeMinutes = readUnsigned(longitudeMinutesIndex);
    const longitudeSecondsIndex = consumeSeparator(
      longitudeMinutes,
      (character) => character === "'" || isWhitespace(character),
    );
    if (longitudeSecondsIndex === null) continue;
    const longitudeSeconds = readUnsigned(longitudeSecondsIndex, true);
    const longitudeDirection = consumeDirection(longitudeSeconds, ["E", "W"], false);
    if (!longitudeDirection) continue;
    return {
      latitudeDegrees: latitudeDegrees.value,
      latitudeMinutes: latitudeMinutes.value,
      latitudeSeconds: latitudeSeconds.value,
      latitudeDirection: latitudeDirection.direction,
      longitudeDegrees: longitudeDegrees.value,
      longitudeMinutes: longitudeMinutes.value,
      longitudeSeconds: longitudeSeconds.value,
      longitudeDirection: longitudeDirection.direction,
    };
  }
  return null;
}

function isAsciiDigit(value) {
  if (typeof value !== "string") return false;
  const code = value.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function isWhitespace(value) {
  return typeof value === "string" && /\s/.test(value);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeGeocodeLabel(rawAddress) {
  if (typeof rawAddress !== "string") {
    return null;
  }

  const normalized = fixMojibake(rawAddress)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized.length > 120) {
    return null;
  }

  if (
    /(?:https?:\/\/|www\.)/i.test(normalized) ||
    containsEmailLikePattern(normalized) ||
    /[<>`{}[\]\\]/.test(normalized)
  ) {
    return null;
  }

  if (!/^[\p{L}\p{N}\s'.,;:()/-]+$/u.test(normalized)) {
    return null;
  }

  return normalized;
}

function containsEmailLikePattern(value) {
  let segmentStart = 0;
  for (let index = 0; index <= value.length; index += 1) {
    if (index < value.length && !isWhitespace(value[index])) continue;
    let hasDotAfter = false;
    for (let cursor = index - 1; cursor >= segmentStart; cursor -= 1) {
      if (value[cursor] === ".") hasDotAfter = true;
      if (value[cursor] === "@" && cursor > segmentStart && cursor < index - 1 && hasDotAfter) {
        return true;
      }
    }
    segmentStart = index + 1;
  }
  return false;
}

export async function geocodeAddress(address, params) {
  const normalizedAddress = normalizeGeocodeLabel(address);
  if (!normalizedAddress) {
    return { latitude: null, longitude: null };
  }

  const query = encodeURIComponent(`${normalizedAddress}, Paris, France`);
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
    const normalizedAddress = normalizeGeocodeLabel(address);
    if (!normalizedAddress) {
      return { latitude: null, longitude: null };
    }

    if (!cache.has(normalizedAddress)) {
      const resolved = await geocodeAddress(address, {
        userAgent: params.userAgent,
        acceptLanguage: params.acceptLanguage ?? "fr",
      });
      cache.set(normalizedAddress, resolved);
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
    return cache.get(normalizedAddress) ?? { latitude: null, longitude: null };
  };
}

export function buildRouteLocationLabel(
  departureLabel,
  arrivalLabel,
  fallbackLabel = "",
) {
  const departure = fixMojibake(String(departureLabel || "")).trim();
  const arrival = fixMojibake(String(arrivalLabel || "")).trim();
  const fallback = fixMojibake(String(fallbackLabel || "")).trim();

  if (departure && arrival) {
    return `${departure} → ${arrival}`;
  }
  if (departure) {
    return departure;
  }
  if (arrival) {
    return arrival;
  }
  return fallback;
}

function buildFlexibleRoutePoints(start, end) {
  const midLatitude = (start.latitude + end.latitude) / 2;
  const midLongitude = (start.longitude + end.longitude) / 2;
  const deltaLat = end.latitude - start.latitude;
  const deltaLng = end.longitude - start.longitude;
  const distance = Math.max(Math.abs(deltaLat), Math.abs(deltaLng));
  const offset = Math.min(0.0012, Math.max(0.0002, distance * 0.18));
  const perpendicularLat = -deltaLng * offset;
  const perpendicularLng = deltaLat * offset;
  const detourPoint = [
    Number((midLatitude + perpendicularLat).toFixed(6)),
    Number((midLongitude + perpendicularLng).toFixed(6)),
  ];
  return [
    [start.latitude, start.longitude],
    detourPoint,
    [end.latitude, end.longitude],
  ];
}

export function buildRouteDrawingFromCoordinates(
  start,
  end,
  routeStyle = "souple",
) {
  if (
    !start ||
    !end ||
    !Number.isFinite(start.latitude) ||
    !Number.isFinite(start.longitude) ||
    !Number.isFinite(end.latitude) ||
    !Number.isFinite(end.longitude)
  ) {
    return null;
  }

  const coordinates =
    routeStyle === "direct"
      ? [
          [start.latitude, start.longitude],
          [end.latitude, end.longitude],
        ]
      : buildFlexibleRoutePoints(start, end);

  return {
    kind: "polyline",
    coordinates,
  };
}

export function buildMidpointFromCoordinates(start, end) {
  if (
    !start ||
    !end ||
    !Number.isFinite(start.latitude) ||
    !Number.isFinite(start.longitude) ||
    !Number.isFinite(end.latitude) ||
    !Number.isFinite(end.longitude)
  ) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: Number(((start.latitude + end.latitude) / 2).toFixed(6)),
    longitude: Number(((start.longitude + end.longitude) / 2).toFixed(6)),
  };
}
