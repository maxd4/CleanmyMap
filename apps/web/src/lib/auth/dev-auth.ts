const LOCALHOST_HOSTNAME_RE =
  /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|::1)(?::\d+)?$/i;

function readEnvFlag(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function readEnvValue(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function isLocalhostHost(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }

  return LOCALHOST_HOSTNAME_RE.test(hostname.trim());
}

export function isDevAuthBypassEnabled(hostname: string | null | undefined): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (readEnvFlag("CMM_DISABLE_DEV_AUTH_BYPASS")) {
    return false;
  }

  if (readEnvFlag("CMM_DEV_AUTH_BYPASS")) {
    return true;
  }

  return isLocalhostHost(hostname);
}

export function getDevAuthBypassRole(): string {
  return readEnvValue("CMM_DEV_AUTH_BYPASS_ROLE", "imu");
}

export function getDevAuthBypassUserId(): string {
  return readEnvValue("CMM_DEV_AUTH_BYPASS_USER_ID", "dev-localhost");
}

export function getDevAuthBypassDisplayName(): string {
  return readEnvValue("CMM_DEV_AUTH_BYPASS_DISPLAY_NAME", "Local preview");
}

export function getDevAuthBypassUsername(): string {
  return readEnvValue("CMM_DEV_AUTH_BYPASS_USERNAME", "local-preview");
}
