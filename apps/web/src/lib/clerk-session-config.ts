import { env } from "@/lib/env";

function parseOrigin(raw: string | undefined): string | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

function parsePublishableKey(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const candidate = raw.trim();
  return candidate.length > 0 ? candidate : undefined;
}

type ClerkKeyMode = "test" | "live" | "invalid" | "missing";

function getClerkKeyMode(raw: string | undefined, prefix: "pk" | "sk"): ClerkKeyMode {
  if (!raw || raw.trim().length === 0) {
    return "missing";
  }

  return raw.trim().startsWith(`${prefix}_test_`)
    ? "test"
    : raw.trim().startsWith(`${prefix}_live_`)
      ? "live"
      : "invalid";
}

function decodePublishableKeyHost(raw: string): string | undefined {
  const payload = raw.trim().replace(/^pk_(?:test|live)_/, "").replace(/\$$/, "");
  if (!payload) {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded).trim().replace(/\$$/, "");
    const parsed = new URL(
      decoded.includes("://") ? decoded : `https://${decoded}`,
    );
    return parsed.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function parseDomain(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const candidate = raw.trim();
  return candidate.length > 0 ? candidate : undefined;
}

function resolveProxyUrl(raw: string | undefined, appOrigin: string | undefined): string | undefined {
  const candidate = parseDomain(raw);
  if (!candidate) {
    return undefined;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith("/")) {
    return candidate;
  }

  if (!appOrigin) {
    return candidate;
  }

  try {
    return new URL(candidate, appOrigin).toString().replace(/\/+$/, "");
  } catch {
    return candidate;
  }
}

function isLocalhostOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function parseOriginCsv(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const normalized = origins
    .map((value) => parseOrigin(value))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

function resolveClerkDomain(
  domain: string | undefined,
  isLocalDevOrigin: boolean,
  proxyUrl: string | undefined,
): string | undefined {
  return isLocalDevOrigin && !proxyUrl ? undefined : domain;
}

function normalizeClerkHost(raw: string): string | undefined {
  const candidate = raw.trim();
  if (!candidate) {
    return undefined;
  }

  try {
    return new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    ).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function assertLocalClerkConfiguration(
  publishableKey: string | undefined,
  secretKey: string | undefined,
  domain: string | undefined,
  proxyUrl: string | undefined,
): void {
  const publishableMode = getClerkKeyMode(publishableKey, "pk");
  const secretMode = getClerkKeyMode(secretKey, "sk");

  if (publishableMode !== "test" || secretMode !== "test") {
    throw new Error(
      "Invalid local Clerk configuration: localhost requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_* and CLERK_SECRET_KEY=sk_test_* from the same Development instance; production keys are not allowed.",
    );
  }

  const publishableHost = decodePublishableKeyHost(publishableKey ?? "");
  if (!publishableHost) {
    throw new Error(
      "Invalid local Clerk configuration: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key.",
    );
  }

  const configuredDomain = domain ? normalizeClerkHost(domain) : undefined;
  if (domain && !configuredDomain) {
    throw new Error(
      "Invalid local Clerk configuration: CLERK_DOMAIN is not a valid Clerk host.",
    );
  }

  if (!proxyUrl && configuredDomain && configuredDomain !== publishableHost) {
    throw new Error(
      "Invalid local Clerk configuration: CLERK_DOMAIN does not match the configured Clerk Development publishable key.",
    );
  }
}

function resolveClerkSatellite(
  isSatellite: boolean,
  isLocalDevOrigin: boolean,
  proxyUrl: string | undefined,
): boolean | undefined {
  if (isLocalDevOrigin && !proxyUrl) {
    return undefined;
  }

  return isSatellite ? true : undefined;
}

export type ClerkRuntimeConfig = {
  appOrigin?: string;
  publishableKey?: string;
  domain?: string;
  proxyUrl?: string;
  isSatellite?: boolean;
  satelliteAutoSync?: boolean;
  authorizedParties?: string[];
  allowedRedirectOrigins?: string[];
};

export function getClerkRuntimeConfig(): ClerkRuntimeConfig {
  const appOrigin = parseOrigin(env.NEXT_PUBLIC_APP_URL);
  const configuredOrigins = parseOriginCsv(env.CLERK_ALLOWED_PARTIES);
  const allowlistedOrigins = configuredOrigins;

  const publishableKey = parsePublishableKey(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const isSatellite = env.CLERK_IS_SATELLITE === true;
  const domain = parseDomain(env.CLERK_DOMAIN);
  const proxyUrl = resolveProxyUrl(env.NEXT_PUBLIC_CLERK_PROXY_URL, appOrigin);
  const isLocalDevOrigin = process.env.NODE_ENV !== "production" && isLocalhostOrigin(appOrigin);
  if (isLocalDevOrigin) {
    assertLocalClerkConfiguration(
      publishableKey,
      env.CLERK_SECRET_KEY,
      domain,
      proxyUrl,
    );
  }

  const resolvedPublishableKey = publishableKey;
  const resolvedDomain = resolveClerkDomain(domain, isLocalDevOrigin, proxyUrl);
  const resolvedIsSatellite = resolveClerkSatellite(isSatellite, isLocalDevOrigin, proxyUrl);

  return {
    appOrigin,
    publishableKey: resolvedPublishableKey,
    domain: resolvedDomain,
    proxyUrl,
    isSatellite: resolvedIsSatellite,
    satelliteAutoSync: resolvedIsSatellite
      ? (env.CLERK_SATELLITE_AUTO_SYNC ?? true)
      : undefined,
    authorizedParties:
      allowlistedOrigins.length > 0 ? allowlistedOrigins : undefined,
    allowedRedirectOrigins:
      allowlistedOrigins.length > 0 ? allowlistedOrigins : undefined,
  };
}
