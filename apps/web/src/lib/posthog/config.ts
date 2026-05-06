import { env } from "@/lib/env";

const POSTHOG_EU_HOST = "https://eu.i.posthog.com";
const POSTHOG_US_HOST = "https://us.i.posthog.com";

function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function normalizeHost(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getPostHogKey(): string | null {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY ?? env.NEXT_PUBLIC_POSTHOG_TOKEN;
  if (!isConfigured(key)) {
    return null;
  }
  return key!.trim();
}

export function getPostHogHost(): string {
  const host = env.NEXT_PUBLIC_POSTHOG_HOST;
  if (isConfigured(host)) {
    return normalizeHost(host!);
  }
  return env.NEXT_PUBLIC_POSTHOG_REGION === "us" ? POSTHOG_US_HOST : POSTHOG_EU_HOST;
}

export function isPostHogConfigured(): boolean {
  return getPostHogKey() !== null;
}

export function getPostHogDeprecatedEnvWarnings(): string[] {
  const warnings: string[] = [];
  if (
    !isConfigured(env.NEXT_PUBLIC_POSTHOG_KEY) &&
    isConfigured(env.NEXT_PUBLIC_POSTHOG_TOKEN)
  ) {
    warnings.push(
      "NEXT_PUBLIC_POSTHOG_TOKEN est dépréciée. Utiliser NEXT_PUBLIC_POSTHOG_KEY à la place.",
    );
  }
  return warnings;
}
