import {
  env,
  LOCAL_DEV_CLERK_PUBLISHABLE_KEY,
} from "@/lib/env";

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
  const resolvedPublishableKey =
    publishableKey &&
    isLocalDevOrigin &&
    publishableKey.startsWith("pk_live_")
      ? LOCAL_DEV_CLERK_PUBLISHABLE_KEY
      : publishableKey ??
        (process.env.NODE_ENV !== "production"
          ? LOCAL_DEV_CLERK_PUBLISHABLE_KEY
          : undefined);
  // Do not leak the production Clerk domain into localhost unless an explicit proxy is configured.
  const resolvedDomain =
    isLocalDevOrigin && !proxyUrl ? undefined : domain;
  const resolvedIsSatellite =
    isLocalDevOrigin && !proxyUrl
      ? undefined
      : isSatellite
        ? true
        : undefined;

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
