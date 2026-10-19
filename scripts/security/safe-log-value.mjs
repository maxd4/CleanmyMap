const DEFAULT_MAX_LOG_VALUE_LENGTH = 256;

function escapeControlCharacters(value) {
  return Array.from(String(value), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)
      ? `\\u${codePoint.toString(16).padStart(4, "0")}`
      : character;
  }).join("");
}

export function sanitizeLogValue(value, maxLength = DEFAULT_MAX_LOG_VALUE_LENGTH) {
  if (!Number.isSafeInteger(maxLength) || maxLength <= 0) {
    throw new RangeError("maxLength must be a positive safe integer");
  }

  const escaped = escapeControlCharacters(value);
  if (escaped.length <= maxLength) return escaped;
  return `${escaped.slice(0, maxLength)}…[truncated]`;
}
