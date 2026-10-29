const COORDINATE_PATTERN = /-?\d{1,3}(?:\.\d+)?\s*[,;]\s*-?\d{1,3}(?:\.\d+)?/u;

const PRIVATE_IDENTIFIER_KEY_SEGMENT_PATTERN = /(?:^|[_-])(?:id|uuid|identifier|token)(?:$|[_-])/u;
const PRIVATE_IDENTIFIER_KEY_SUFFIX_PATTERN = /(?:Id|ID|Uuid|UUID|Identifier|Token)$/u;
const SENSITIVE_KEY_PATTERN =
  /(?:email|phone|telephone|password|secret|token|address|location|coordinate|latitude|longitude|keystroke|form.?value|input.?value|message|description|notes?|content|user.?name|display.?name|first.?name|last.?name)/iu;
const URL_KEY_PATTERN = /(?:^|[$_.-])(?:url|href|referrer|path|pathname)$/iu;
const CAMPAIGN_KEY_PATTERN = /^(?:\$)?utm_(?:source|medium|campaign|content|term)$/iu;
const SAFE_ANALYTICS_SESSION_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|session-[0-9]{10,}|server-session)$/iu;

const ANALYTICS_ROUTE_KINDS = new Set([
  "home",
  "admin",
  "community",
  "profile",
  "methodology",
  "explorer",
  "actions",
  "reports",
  "missions",
  "sections",
  "spogomi",
  "docs",
  "parcours",
  "sign-in",
  "sign-up",
  "signaler-contenu-illicite",
  "politique-cookies",
  "contact",
  "onboarding",
  "mentions-legales",
  "conditions-utilisation",
  "conditions-generales-utilisation",
  "learn",
  "en",
  "preview",
  "sponsor-portal",
  "messagerie",
  "dashboard",
  "gamification",
  "compte",
  "prints",
  "pilotage",
  "partners",
  "open-data",
  "signalement",
  "other",
]);

const ANALYTICS_ROUTE_CHILDREN = new Map<string, ReadonlySet<string>>([
  ["actions", new Set(["new", "map", "history", "invite"])],
  ["sections", new Set(["open-data", "rejoindre-une-action"])],
]);

const ROUTE_KIND_ALIASES: Record<string, string> = {
  profil: "profile",
  methodologie: "methodology",
};

const FUNNEL_META_KEYS = new Set([
  "source",
  "kind",
  "pagePath",
  "routePath",
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

const FUNNEL_CATEGORY_VALUES: Record<string, ReadonlySet<string>> = {
  source: new Set([
    "route_tracker",
    "action_declaration_form",
    "action_before_declaration_form",
    "form",
  ]),
  kind: new Set(["pageview"]),
  routeKind: ANALYTICS_ROUTE_KINDS,
  routeSection: new Set([
    ...ANALYTICS_ROUTE_KINDS,
    "new",
    "map",
    "history",
    "invite",
    "open-data",
    "rejoindre-une-action",
  ]),
  declarationMode: new Set(["quick", "complete"]),
  recordType: new Set(["action", "clean_place", "spot", "other"]),
  formVariant: new Set(["legacy", "quick"]),
};

const FUNNEL_NUMERIC_KEYS = new Set([
  "routeDepth",
  "routeSegmentCount",
  "queryParamCount",
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
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isEmailWhitespace(character: string | undefined): boolean {
  return character === " " || character === "\t" || character === "\r" || character === "\n" || character === "\f" || character === "\v";
}

function containsEmail(value: string): boolean {
  let tokenStart = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "@") {
      const localPart = value.slice(tokenStart, index);
      let domainEnd = index + 1;
      while (domainEnd < value.length && !isEmailWhitespace(value[domainEnd]) && value[domainEnd] !== "@") domainEnd += 1;
      const domain = value.slice(index + 1, domainEnd);
      const dotIndex = domain.lastIndexOf(".");
      if (localPart.length > 0 && dotIndex > 0 && dotIndex < domain.length - 1) return true;
      tokenStart = index + 1;
    } else if (isEmailWhitespace(character)) {
      tokenStart = index + 1;
    }
  }
  return false;
}

function isPathLikeKey(key: string): boolean {
  return key === "pagePath" || key === "routePath" || URL_KEY_PATTERN.test(key);
}

function isSensitiveKey(key: string): boolean {
  if (isPathLikeKey(key)) {
    return false;
  }

  return (
    POSTHOG_PROPERTY_DENYLIST.includes(
      key.toLowerCase() as (typeof POSTHOG_PROPERTY_DENYLIST)[number],
    ) ||
    CAMPAIGN_KEY_PATTERN.test(key) ||
    PRIVATE_IDENTIFIER_KEY_SEGMENT_PATTERN.test(key) ||
    PRIVATE_IDENTIFIER_KEY_SUFFIX_PATTERN.test(key) ||
    SENSITIVE_KEY_PATTERN.test(key)
  );
}

function knownRouteChildren(root: string, segments: string[]): string[] {
  const children = ANALYTICS_ROUTE_CHILDREN.get(root);
  const child = segments[1]?.toLowerCase();
  return child && children?.has(child) ? [child] : [];
}

function normalizeKnownRouteSegments(root: string, segments: string[]): string[] {
  if (root === "profil" || root === "parcours" || root === "spogomi") {
    return [root];
  }
  if (root === "sections" || root === "docs" || root === "missions") {
    return [root, ...knownRouteChildren(root, segments)];
  }
  return [root, ...knownRouteChildren(root, segments)];
}

function normalizeRouteSegments(value: string): string[] {
  const rawPath = value.split(/[?#]/u, 1)[0] ?? "/";
  const segments = rawPath
    .split("/")
    .filter(Boolean)
    .map(decodePathSegment)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  const root = segments[0]?.toLowerCase() ?? "";
  if (
    !ANALYTICS_ROUTE_KINDS.has(root) &&
    !Object.hasOwn(ROUTE_KIND_ALIASES, root)
  ) {
    return ["other"];
  }
  return normalizeKnownRouteSegments(root, segments);
}

function routeKindForRoot(root: string): string {
  const alias = ROUTE_KIND_ALIASES[root];
  if (alias) {
    return alias;
  }
  return ANALYTICS_ROUTE_KINDS.has(root) ? root : "other";
}

export type NormalizedAnalyticsRoute = {
  path: string;
  routeKind: string;
  routeSection: string;
  routeDepth: number;
  routeSegmentCount: number;
};

export function normalizeAnalyticsRoute(value: string): NormalizedAnalyticsRoute {
  const segments = normalizeRouteSegments(value);
  const root = segments[0] ?? "";
  const routeKind = root ? routeKindForRoot(root) : "home";
  const routeSection = segments[1] ?? routeKind;

  return {
    path: segments.length > 0 ? `/${segments.join("/")}` : "/",
    routeKind,
    routeSection,
    routeDepth: segments.length,
    routeSegmentCount: segments.length,
  };
}

export function sanitizeAnalyticsPath(value: string): string {
  return normalizeAnalyticsRoute(value).path;
}

export function sanitizeAnalyticsUrl(value: string): string {
  try {
    const url = new URL(value, "https://cleanmymap.invalid");
    return sanitizeAnalyticsPath(url.pathname);
  } catch {
    return "/";
  }
}

export function isSafeAnalyticsSessionId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ANALYTICS_SESSION_ID_PATTERN.test(value);
}

function sanitizeCategory(key: string, value: string): string | undefined {
  const allowedValues = FUNNEL_CATEGORY_VALUES[key];
  if (!allowedValues) {
    return value;
  }
  return allowedValues.has(value) ? value : undefined;
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (isPathLikeKey(key)) {
      return sanitizeAnalyticsUrl(value);
    }
    if (FUNNEL_CATEGORY_VALUES[key]) {
      return sanitizeCategory(key, value);
    }
    if (containsEmail(value) || COORDINATE_PATTERN.test(value)) {
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

function sanitizeFunnelValue(key: string, value: unknown): unknown {
  if (FUNNEL_NUMERIC_KEYS.has(key)) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }
    return Math.max(0, Math.min(20, Math.trunc(value)));
  }

  if (key === "hasQuery" || key === "isAuthenticated") {
    return typeof value === "boolean" ? value : undefined;
  }

  return sanitizeValue(key, value);
}

export function sanitizeFunnelMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) {
    return undefined;
  }

  const allowed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!FUNNEL_META_KEYS.has(key) || isSensitiveKey(key)) {
      continue;
    }

    const sanitizedValue = sanitizeFunnelValue(key, value);
    if (
      sanitizedValue !== undefined &&
      (typeof sanitizedValue !== "object" || sanitizedValue === null)
    ) {
      allowed[key] = sanitizedValue;
    }
  }

  return Object.keys(allowed).length > 0 ? allowed : undefined;
}
