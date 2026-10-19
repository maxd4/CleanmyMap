type LogDetails = Record<string, unknown>;

const MAX_LOG_TEXT_LENGTH = 240;
const MAX_LOG_DEPTH = 5;
const MAX_LOG_KEYS = 40;
const MAX_LOG_ITEMS = 40;
const SENSITIVE_KEY_PATTERN = /(?:access.?token|api.?key|authorization|cookie|credential|email|full.?name|html|password|payload|phone|private.?key|reply.?to|secret|stack|user.?id|token|body|content)/iu;
const SENSITIVE_TEXT_PATTERN = /(?:bearer|basic)\s+[^\s,;]+|(?:api[_ -]?key|authorization|cookie|password|secret|token|access[_ -]?token|refresh[_ -]?token)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}]+)/giu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

function redactText(value: string): string {
  return value
    .replace(SENSITIVE_TEXT_PATTERN, "[redacted]")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .slice(0, MAX_LOG_TEXT_LENGTH);
}

function readProperty(value: object, key: string): unknown {
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return "[redacted]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "bigint") return String(value);
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function" || typeof value === "symbol") return "[omitted]";
  if (depth >= MAX_LOG_DEPTH) return "[truncated]";

  if (value instanceof Error) return describeError(value, seen, depth + 1);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "[invalid-date]" : value.toISOString();
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, MAX_LOG_ITEMS).map((item) => sanitizeValue(item, undefined, seen, depth + 1));
  }

  const result: LogDetails = {};
  for (const property of Object.keys(value).slice(0, MAX_LOG_KEYS)) {
    result[property] = sanitizeValue(readProperty(value, property), property, seen, depth + 1);
  }
  return result;
}

function describeError(error: unknown, seen = new WeakSet<object>(), depth = 0): LogDetails {
  if (error instanceof Error) {
    if (seen.has(error)) return { message: "[circular]" };
    seen.add(error);
    const details: LogDetails = {
      name: redactText(error.name),
      message: redactText(error.message),
    };
    for (const key of ["code", "status", "statusCode"]) {
      const value = readProperty(error, key);
      if (value !== undefined) details[key] = sanitizeValue(value, key, seen, depth + 1);
    }
    const cause = readProperty(error, "cause");
    if (cause !== undefined) details.cause = sanitizeValue(cause, "cause", seen, depth + 1);
    return details;
  }

  if (typeof error === "string") {
    return { message: redactText(error) };
  }

  return { message: redactText(String(error)) };
}

export function logFailure(
  scope: string,
  message: string,
  error?: unknown,
  details?: LogDetails,
): void {
  const payload: LogDetails = {
    ...(details === undefined
      ? {}
      : (sanitizeValue(details, undefined, new WeakSet<object>(), 0) as LogDetails)),
    ...(error === undefined ? {} : { error: describeError(error) }),
  };
  const prefix = `[${redactText(scope)}] ${redactText(message)}`;

  if (Object.keys(payload).length === 0) {
    console.error(prefix);
    return;
  }

  console.error(prefix, payload);
}

export function logWarning(
  scope: string,
  message: string,
  details?: LogDetails,
): void {
  if (!details || Object.keys(details).length === 0) {
    console.warn(`[${redactText(scope)}] ${redactText(message)}`);
    return;
  }

  console.warn(
    `[${redactText(scope)}] ${redactText(message)}`,
    sanitizeValue(details, undefined, new WeakSet<object>(), 0),
  );
}
