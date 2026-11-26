import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

/**
 * Validates external sync URLs against SSRF: HTTPS only, no credentials,
 * no loopback/link-local/private IP literals or internal hostnames.
 */
export function assertSafeExternalSyncUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("URL externe invalide.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Seules les URLs HTTPS sont autorisées pour la synchronisation externe.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Les informations d'identification dans l'URL sont interdites.");
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    throw new Error("Hôte externe non autorisé.");
  }
  const ipHost = host.replace(/^\[|\]$/g, "");
  const ipVersion = isIP(ipHost);
  if ((ipVersion === 4 && isPrivateIpv4(ipHost)) || (ipVersion === 6 && isPrivateIpv6(ipHost))) {
    throw new Error("Adresse réseau privée interdite.");
  }
  return parsed.toString();
}
