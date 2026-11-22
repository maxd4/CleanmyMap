function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, nested]) => [key, canonicalize(nested)]));
}

export async function hashPersonalAiImportValue(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonicalize(value))));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export function personalAiImportIdentityHash(
  provider: string, sourceVersion: string | null, periodStartUtc: string | null,
  periodEndUtc: string | null, model: string | null, sourceScope: Readonly<Record<string, string>>,
): Promise<string> {
  return hashPersonalAiImportValue([
    "personal-ai-import-v2", provider, sourceVersion, periodStartUtc, periodEndUtc, model,
    Object.entries(sourceScope).sort(([left], [right]) => left.localeCompare(right)),
  ]);
}
