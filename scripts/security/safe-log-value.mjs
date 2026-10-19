const DEFAULT_MAX_LOG_VALUE_LENGTH = 256;
const TRUNCATION_MARKER = "…[truncated]";

function escapedToken(character) {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)
    ? `\\u${codePoint.toString(16).padStart(4, "0")}`
    : character;
}

export function sanitizeLogValue(value, maxLength = DEFAULT_MAX_LOG_VALUE_LENGTH) {
  if (!Number.isSafeInteger(maxLength) || maxLength <= 0) {
    throw new RangeError("maxLength must be a positive safe integer");
  }

  const source = String(value);
  const truncationPrefixLength = Math.max(0, maxLength - TRUNCATION_MARKER.length);
  let escapedValue = "";
  let escapedLength = 0;
  let prefix = "";
  let prefixLength = 0;

  for (let index = 0; index < source.length;) {
    const codePoint = source.codePointAt(index) ?? 0;
    const character = String.fromCodePoint(codePoint);
    const token = escapedToken(character);

    if (escapedLength + token.length > maxLength) {
      if (maxLength <= TRUNCATION_MARKER.length) return TRUNCATION_MARKER.slice(0, maxLength);
      return `${prefix}${TRUNCATION_MARKER}`;
    }

    escapedValue += token;
    escapedLength += token.length;
    if (prefixLength + token.length <= truncationPrefixLength) {
      prefix += token;
      prefixLength += token.length;
    }
    index += character.length;
  }

  return escapedValue;
}
