import type {
  ParisActorPublicChannel,
  PublicChannelType,
  VerificationCertainty,
} from "./paris-cleanwalk-network";

const UNCONDITIONAL_PRIVATE_INVITE_HOSTS = [
  "chat.whatsapp.com",
  "wa.me",
  "discord.gg",
  "discord.new",
] as const;

const DECEPTIVE_PLATFORM_HOST_PREFIXES = [
  "chat.whatsapp.com.",
  "wa.me.",
  "whatsapp.com.",
  "discord.gg.",
  "discord.com.",
  "discordapp.com.",
  "t.me.",
  "telegram.me.",
  "telegram.dog.",
] as const;

function normalizeHostname(rawHostname: string): string {
  return rawHostname.trim().toLowerCase().replace(/\.+$/, "");
}

function matchesDomainOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isDeceptivePlatformHost(hostname: string): boolean {
  return DECEPTIVE_PLATFORM_HOST_PREFIXES.some((prefix) =>
    hostname.startsWith(prefix),
  );
}

function decodeUrlComponentRecursively(
  value: string,
  maxPasses: number = 3,
): string | null {
  let current = value;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) {
        return decoded;
      }
      current = decoded;
    } catch {
      return null;
    }
  }
  return current;
}

function parseSafeHttpUrl(url: string | undefined): URL | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || /[\s\u0000-\u001F\u007F]/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    if (parsed.username !== "" || parsed.password !== "") {
      return null;
    }
    const hostname = normalizeHostname(parsed.hostname);
    if (!hostname || !hostname.includes(".") || isDeceptivePlatformHost(hostname)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isSafeHttpUrl(url: string | undefined): url is string {
  return parseSafeHttpUrl(url) !== null;
}

export function isPrivateOrUnauthorizedInviteUrl(url: string): boolean {
  const parsed = parseSafeHttpUrl(url);
  if (!parsed) {
    return true;
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (
    UNCONDITIONAL_PRIVATE_INVITE_HOSTS.some((domain) =>
      matchesDomainOrSubdomain(hostname, domain),
    )
  ) {
    return true;
  }

  const decodedPath = decodeUrlComponentRecursively(parsed.pathname);
  const decodedSearch = decodeUrlComponentRecursively(parsed.search);
  if (decodedPath === null || decodedSearch === null) {
    return true;
  }

  const collapsedPath = decodedPath.replace(/\/+/g, "/");
  const normalizedPath = collapsedPath.toLowerCase();
  const normalizedSearch = decodedSearch.toLowerCase();

  if (matchesDomainOrSubdomain(hostname, "whatsapp.com")) {
    if (
      normalizedPath === "/accept" ||
      normalizedPath.startsWith("/accept/") ||
      normalizedPath === "/send" ||
      normalizedPath.startsWith("/send/") ||
      normalizedPath === "/invite" ||
      normalizedPath.startsWith("/invite/") ||
      normalizedSearch.includes("code=")
    ) {
      return true;
    }
  }

  if (
    matchesDomainOrSubdomain(hostname, "discord.com") ||
    matchesDomainOrSubdomain(hostname, "discordapp.com")
  ) {
    if (
      normalizedPath === "/invite" ||
      normalizedPath.startsWith("/invite/")
    ) {
      return true;
    }
  }

  if (
    matchesDomainOrSubdomain(hostname, "t.me") ||
    matchesDomainOrSubdomain(hostname, "telegram.me") ||
    matchesDomainOrSubdomain(hostname, "telegram.dog")
  ) {
    if (
      collapsedPath.startsWith("/+") ||
      normalizedPath === "/joinchat" ||
      normalizedPath.startsWith("/joinchat/") ||
      normalizedSearch.includes("invite=")
    ) {
      return true;
    }
  }

  return false;
}

function normalizeChannelUrlKey(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${parsed.hostname.toLowerCase()}${pathname}${parsed.search.toLowerCase()}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Filters out unsafe or private invite URLs and deduplicates public channels
 * by normalized URL so no duplicate or unauthorized group link is exposed.
 */
export function sanitizeAndDeduplicatePublicChannels(
  channels: readonly ParisActorPublicChannel[],
): ParisActorPublicChannel[] {
  const seen = new Set<string>();
  const result: ParisActorPublicChannel[] = [];

  for (const channel of channels) {
    if (
      !isSafeHttpUrl(channel.url) ||
      isPrivateOrUnauthorizedInviteUrl(channel.url) ||
      !isSafeHttpUrl(channel.provenance.sourceUrl)
    ) {
      continue;
    }
    const key = normalizeChannelUrlKey(channel.url);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(channel);
  }

  return result;
}

export function createVerifiedChannel(
  type: PublicChannelType,
  label: string,
  url: string,
  sourceLabel: string,
  sourceUrl: string = url,
  certainty: VerificationCertainty = "verifie",
): ParisActorPublicChannel {
  return {
    type,
    label,
    url,
    provenance: {
      sourceLabel,
      sourceUrl,
      verifiedAt: "2026-11-19",
      certainty,
    },
  };
}
