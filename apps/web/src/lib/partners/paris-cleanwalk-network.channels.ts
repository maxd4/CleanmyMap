import type {
  ParisActorPublicChannel,
  PublicChannelType,
  VerificationCertainty,
} from "./paris-cleanwalk-network";

const PRIVATE_INVITE_URL_PATTERNS = [
  /chat\.whatsapp\.com\//i,
  /wa\.me\//i,
  /discord\.gg\//i,
  /discord(?:app)?\.com\/invite\//i,
  /t\.me\/\+/i,
] as const;

export function isSafeHttpUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isPrivateOrUnauthorizedInviteUrl(url: string): boolean {
  return PRIVATE_INVITE_URL_PATTERNS.some((pattern) => pattern.test(url));
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
