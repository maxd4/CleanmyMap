type CspEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_DOMAIN?: string;
  NEXT_PUBLIC_CLERK_PROXY_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  NEXT_PUBLIC_POSTHOG_REGION?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
};

const POSTHOG_EU_HOST = "https://eu.i.posthog.com";
const POSTHOG_US_HOST = "https://us.i.posthog.com";
const VERCEL_SCRIPT_ORIGIN = "https://va.vercel-scripts.com";

const CLERK_TENANT_SOURCES = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
];

const CLERK_SCRIPT_SOURCES = [
  ...CLERK_TENANT_SOURCES,
  "https://*.js.stripe.com",
  "https://js.stripe.com",
  "https://maps.googleapis.com",
  "https://*.protect.clerk.com",
];

const CLERK_CONNECT_SOURCES = [
  ...CLERK_TENANT_SOURCES,
  "https://clerk-telemetry.com",
  "https://*.clerk-telemetry.com",
  "https://api.stripe.com",
  "https://img.clerk.com",
  "https://images.clerkstage.dev",
  "https://*.protect.clerk.com:*",
];

const CLERK_FRAME_SOURCES = [
  ...CLERK_TENANT_SOURCES,
  "https://challenges.cloudflare.com",
  "https://*.js.stripe.com",
  "https://js.stripe.com",
  "https://hooks.stripe.com",
  "https://*.protect.clerk.com",
];

const STATIC_CONNECT_SOURCES = [
  "https://api.github.com",
  "https://api.open-meteo.com",
  "https://geo.api.gouv.fr",
  "https://nominatim.openstreetmap.org",
  "https://routing.openstreetmap.de",
  ...CLERK_CONNECT_SOURCES,
];

const STATIC_IMAGE_SOURCES = [
  "https://images.unsplash.com",
  "https://www.artchive.com",
  "https://images.squarespace-cdn.com",
  "https://commons.wikimedia.org",
  "https://upload.wikimedia.org",
  "https://media.wired.com",
  "https://www.veronikarichterova.com",
  "https://ocean.si.edu",
  "https://i0.wp.com",
  "https://*.tile.openstreetmap.fr",
  "https://*.basemaps.cartocdn.com",
  "https://img.clerk.com",
  "https://images.clerkstage.dev",
];

function unique(values: Iterable<string>): string[] {
  return Array.from(new Set(values));
}

function parseHttpOrigin(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function parseHostOrigin(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  return parseHttpOrigin(
    /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`,
  );
}

function decodeClerkPublishableKeyHost(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  const payload = raw.trim().replace(/^pk_(?:test|live)_/, "").replace(/\$$/, "");
  if (!payload) {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded).trim().replace(/\$$/, "");
    return parseHostOrigin(decoded.includes("://") ? decoded : `https://${decoded}`);
  } catch {
    return undefined;
  }
}

function websocketOrigin(origin: string): string | undefined {
  try {
    const parsed = new URL(origin);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function postHogOrigins(environment: CspEnvironment): string[] {
  const apiOrigin =
    parseHttpOrigin(environment.NEXT_PUBLIC_POSTHOG_HOST) ??
    (environment.NEXT_PUBLIC_POSTHOG_REGION === "us"
      ? POSTHOG_US_HOST
      : POSTHOG_EU_HOST);

  const origins = [apiOrigin];
  if (apiOrigin === POSTHOG_EU_HOST) {
    origins.push("https://eu-assets.i.posthog.com");
  }
  if (apiOrigin === POSTHOG_US_HOST) {
    origins.push("https://us-assets.i.posthog.com");
  }
  return origins;
}

function configuredClerkOrigins(environment: CspEnvironment): string[] {
  const proxyOrigin = parseHttpOrigin(environment.NEXT_PUBLIC_CLERK_PROXY_URL);
  const domainOrigin = parseHostOrigin(environment.CLERK_DOMAIN);
  const publishableKeyOrigin = decodeClerkPublishableKeyHost(
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return unique(
    [proxyOrigin, domainOrigin, publishableKeyOrigin].filter(
      (origin): origin is string => Boolean(origin),
    ),
  );
}

function buildSources(environment: CspEnvironment): Record<string, string[]> {
  const configuredClerk = configuredClerkOrigins(environment);
  const supabaseOrigin = parseHttpOrigin(environment.NEXT_PUBLIC_SUPABASE_URL);
  const sentryOrigin = parseHttpOrigin(environment.NEXT_PUBLIC_SENTRY_DSN);
  const postHog = postHogOrigins(environment);
  const connectSources = [...STATIC_CONNECT_SOURCES, ...postHog];
  const imageSources = [...STATIC_IMAGE_SOURCES];
  const scriptSources = ["'self'", "'unsafe-inline'", VERCEL_SCRIPT_ORIGIN, ...CLERK_SCRIPT_SOURCES];
  const frameSources = ["'self'", ...CLERK_FRAME_SOURCES];

  for (const origin of configuredClerk) {
    scriptSources.push(origin);
    connectSources.push(origin);
    frameSources.push(origin);
  }

  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin);
    imageSources.push(supabaseOrigin);
    const realtimeOrigin = websocketOrigin(supabaseOrigin);
    if (realtimeOrigin) {
      connectSources.push(realtimeOrigin);
    }
  }

  if (sentryOrigin) {
    connectSources.push(sentryOrigin);
  }

  return {
    "default-src": ["'self'"],
    "script-src": unique(scriptSources),
    "style-src": ["'self'", "'unsafe-inline'"],
    "connect-src": unique(["'self'", ...connectSources]),
    "img-src": unique(["'self'", "data:", "blob:", ...imageSources]),
    "font-src": ["'self'", "data:"],
    "frame-src": unique(frameSources),
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
}

/**
 * Build-time, report-only policy. It is intentionally not request-dependent:
 * no nonce, force-dynamic route, or cache-affecting request read is involved.
 */
export function buildContentSecurityPolicyReportOnly(
  environment: CspEnvironment = process.env,
): string {
  return Object.entries(buildSources(environment))
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}
