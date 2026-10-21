const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/iu;
const COORDINATE_PATTERN = /-?\d{1,3}(?:\.\d+)?\s*[,;]\s*-?\d{1,3}(?:\.\d+)?/u;
const OPAQUE_PATH_SEGMENT_PATTERN = [
  /^[0-9a-f]{8,}$/iu,
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/iu,
  /^\d{6,}$/u,
];

const SENSITIVE_KEY_PATTERN =
  /(?:email|phone|telephone|password|secret|token|address|location|coordinate|latitude|longitude|keystroke|form.?value|input.?value|message|description|notes?|content|user.?name|display.?name|first.?name|last.?name)/iu;

const URL_KEY_PATTERN = /(?:^|_)(?:url|href|referrer)$/iu;

const FUNNEL_META_KEYS = new Set([
  "source",
  "kind",
  "pagePath",
  "routeKind",
  "routeSection",
  "routeDepth",
  "routeSegmentCount",
  "queryParamCount",
  "hasQuery",
  "declarationMode",
  "recordType",
  "formVariant",
  "isAuthenticated",
]);

export const POSTHOG_PROPERTY_DENYLIST = [
  "email",
  "user_email",
  "phone",
  "telephone",
  "password",
  "secret",
  "token",
  "address",
  "location",
  "coordinates",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "keystrokes",
  "form_values",
  "input_value",
  "message",
  "description",
  "notes",
  "content",
  "first_name",
  "last_name",
  "display_name",
  "user_name",
  "user_id",
  "clerk_user_id",
] as const;

function isSensitiveKey(key: string): boolean {
  return (
    POSTHOG_PROPERTY_DENYLIST.includes(
      key.toLowerCase() as (typeof POSTHOG_PROPERTY_DENYLIST)[number],
    ) || SENSITIVE_KEY_PATTERN.test(key)
  );
}

function isOpaquePathSegment(segment: string): boolean {
  return OPAQUE_PATH_SEGMENT_PATTERN.some((pattern) => pattern.test(segment));
}

export function sanitizeAnalyticsPath(value: string): string {
  const rawPath = value.split(/[?#]/u, 1)[0] ?? "/";
  const segments = rawPath
    .split("/")
    .filter(Boolean)
    .filter((segment) => {
      return (
        !EMAIL_PATTERN.test(segment) &&
        !COORDINATE_PATTERN.test(segment) &&
        !isOpaquePathSegment(segment)
      );
    });

  return `/${segments.slice(0, 4).join("/")}` || "/";
}

export function sanitizeAnalyticsUrl(value: string): string {
  try {
    const url = new URL(value, "https://cleanmymap.invalid");
    const path = sanitizeAnalyticsPath(url.pathname);
    return url.origin === "https://cleanmymap.invalid"
      ? path
      : `${url.origin}${path}`;
  } catch {
    return "/";
  }
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (URL_KEY_PATTERN.test(key) || key === "pagePath") {
      return sanitizeAnalyticsUrl(value);
    }
    if (EMAIL_PATTERN.test(value) || COORDINATE_PATTERN.test(value)) {
      return undefined;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValue(key, entry))
      .filter((entry) => entry !== undefined);
  }

  if (value && typeof value === "object") {
    return sanitizeAnalyticsProperties(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (isSensitiveKey(key)) {
      continue;
    }

    const sanitizedValue = sanitizeValue(key, value);
    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
}

export function sanitizeFunnelMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) {
    return undefined;
  }

  const allowed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!FUNNEL_META_KEYS.has(key)) {
      continue;
    }

    const sanitizedValue = sanitizeValue(key, value);
    if (sanitizedValue !== undefined && (typeof sanitizedValue !== "object" || sanitizedValue === null)) {
      allowed[key] = sanitizedValue;
    }
  }

  return Object.keys(allowed).length > 0 ? allowed : undefined;
}
