import { NextResponse } from "next/server";

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "localhost",
  "127.0.0.1",
  "::1",
]);

export const PUBLIC_FORM_ANTISPAM_DELAY_MS = 1500;
export const PUBLIC_RATE_LIMIT_STATUS = "rate_limited" as const;
export const PUBLIC_RATE_LIMIT_KIND = "validation" as const;

export type PublicRateLimitPayload = {
  error: string;
  kind: typeof PUBLIC_RATE_LIMIT_KIND;
  status: typeof PUBLIC_RATE_LIMIT_STATUS;
  code?: string;
  retryAfterSeconds?: number;
};

export function isPlaceholderHost(hostname: string): boolean {
  const normalizedHost = hostname.trim().toLowerCase();
  return (
    PLACEHOLDER_HOSTS.has(normalizedHost) ||
    Array.from(PLACEHOLDER_HOSTS).some((placeholder) =>
      normalizedHost.endsWith(`.${placeholder}`),
    )
  );
}

export function isPlaceholderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isPlaceholderHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizePublicChannelUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") {
      return trimmed;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (isPlaceholderHost(parsed.hostname)) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

export function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 10) {
    return false;
  }

  if (value[4] !== "-" || value[7] !== "-") {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const normalized = new Date(Date.UTC(year, month - 1, day));
  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
}

export function is24HourTimeString(value: unknown): value is string {
  if (typeof value !== "string" || value.length !== 5) {
    return false;
  }

  if (value[2] !== ":") {
    return false;
  }

  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));

  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

export function hasRecentSubmission(
  submittedAt: unknown,
  minimumDelayMs = PUBLIC_FORM_ANTISPAM_DELAY_MS,
): boolean {
  return (
    typeof submittedAt === "number" &&
    Number.isFinite(submittedAt) &&
    Date.now() - submittedAt < minimumDelayMs
  );
}

export function hasHoneypotSignal(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildPublicRateLimitPayload(
  message: string,
  options: {
    code?: string;
    retryAfterSeconds?: number;
  } = {},
): PublicRateLimitPayload {
  const payload: PublicRateLimitPayload = {
    error: message,
    kind: PUBLIC_RATE_LIMIT_KIND,
    status: PUBLIC_RATE_LIMIT_STATUS,
  };

  if (options.code) {
    payload.code = options.code;
  }

  if (typeof options.retryAfterSeconds === "number") {
    payload.retryAfterSeconds = options.retryAfterSeconds;
  }

  return payload;
}

export function createPublicRateLimitResponse(
  message: string,
  options: {
    code?: string;
    retryAfterSeconds?: number;
  } = {},
) {
  return NextResponse.json(buildPublicRateLimitPayload(message, options), {
    status: 429,
  });
}
