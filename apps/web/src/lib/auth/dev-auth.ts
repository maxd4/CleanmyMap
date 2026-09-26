import type { GrantedRole } from "../domain-language";

const LOCALHOST_HOSTNAME_RE =
  /^(localhost|127\.0\.0\.1|\[::1\]|::1)(?::\d+)?$/i;

const DEV_AUTH_BYPASS_ROLES = [
  "benevole",
  "coordinateur",
  "scientifique",
  "entreprise",
  "elu",
  "admin",
  "max",
] as const satisfies readonly GrantedRole[];

function readEnvFlag(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function isDevAuthBypassForced(): boolean {
  return readEnvFlag("CMM_DEV_AUTH_BYPASS");
}

export function isGitHubCodespaces(): boolean {
  return readEnvFlag("CODESPACES");
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
  const vercelEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (process.env.NODE_ENV !== "development" || vercelEnvironment === "production") {
    return false;
  }

  // Codespaces is an interactive Clerk Development environment, never a
  // synthetic identity surface, even when a launcher leaks the local flag.
  if (isGitHubCodespaces()) {
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

export function getDevAuthBypassRole(): GrantedRole {
  const role = readEnvValue("CMM_DEV_AUTH_BYPASS_ROLE", "benevole");
  return DEV_AUTH_BYPASS_ROLES.includes(role as GrantedRole) ? (role as GrantedRole) : "benevole";
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
