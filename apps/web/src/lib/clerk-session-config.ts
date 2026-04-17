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

function parseDomain(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const candidate = raw.trim();
  return candidate.length > 0 ? candidate : undefined;
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
  domain?: string;
  isSatellite?: boolean;
  satelliteAutoSync?: boolean;
  authorizedParties?: string[];
  allowedRedirectOrigins?: string[];
};

export function getClerkRuntimeConfig(): ClerkRuntimeConfig {
  const appOrigin = parseOrigin(env.NEXT_PUBLIC_APP_URL);
  const configuredOrigins = parseOriginCsv(env.CLERK_ALLOWED_PARTIES);
  const allowlistedOrigins = configuredOrigins;

  const isSatellite = env.CLERK_IS_SATELLITE === true;
  const domain = parseDomain(env.CLERK_DOMAIN);

  return {
    appOrigin,
    domain,
    isSatellite: isSatellite ? true : undefined,
    satelliteAutoSync: isSatellite
      ? (env.CLERK_SATELLITE_AUTO_SYNC ?? true)
      : undefined,
    authorizedParties:
      allowlistedOrigins.length > 0 ? allowlistedOrigins : undefined,
    allowedRedirectOrigins:
      allowlistedOrigins.length > 0 ? allowlistedOrigins : undefined,
  };
}
