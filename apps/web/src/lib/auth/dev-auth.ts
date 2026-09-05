const LOCALHOST_HOSTNAME_RE =
  /^(localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d+)?$/i;

function readEnvFlag(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function isDevAuthBypassForced(): boolean {
  return readEnvFlag("CMM_DEV_AUTH_BYPASS");
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

  if (!isLocalhostHost(hostname)) {
    return false;
  }

  if (readEnvFlag("CMM_DISABLE_DEV_AUTH_BYPASS")) {
    return false;
  }

  // Human localhost sessions use real Clerk. Codex launchers opt in explicitly.
  return isDevAuthBypassForced();
}

export function shouldUseDevAuthBypass(params: {
  hostname: string | null | undefined;
  clerkUserId: string | null | undefined;
}): boolean {
  if (!isDevAuthBypassEnabled(params.hostname)) {
    return false;
  }

  if (isDevAuthBypassForced()) {
    return true;
  }

  return !params.clerkUserId;
}

export function getDevAuthBypassRole(): string {
  const role = readEnvValue("CMM_DEV_AUTH_BYPASS_ROLE", "max");
  return role === "benevole" || role === "admin" || role === "max" ? role : "benevole";
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
