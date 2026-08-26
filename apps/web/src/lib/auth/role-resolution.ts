import { normalizeProfileRole } from "@/lib/profiles";

export type ClerkMetadata = Record<string, unknown> | null | undefined;

export type ClerkRoleMetadata = {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
};

export function parseUserIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

export function parseAdminUserIds(raw: string | undefined): Set<string> {
  return parseUserIds(raw);
}

export function parseMaxUserIds(
  raw: string | undefined,
  fallbackRaw?: string | undefined,
): Set<string> {
  const parsed = parseUserIds(raw);
  return parsed.size > 0 ? parsed : parseUserIds(fallbackRaw);
}

export function extractRole(metadata: ClerkMetadata): string | null {
  if (!metadata) {
    return null;
  }

  const roleValue = metadata["role"] ?? metadata["profile"];
  if (typeof roleValue !== "string") {
    return null;
  }

  const normalized = roleValue.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalizeProfileRole(normalized) ?? normalized;
}

export function isAdminRole(metadata: ClerkRoleMetadata): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "admin" || publicRole === "max") {
    return true;
  }

  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "admin" || privateRole === "max";
}

export function isMaxRole(metadata: ClerkRoleMetadata): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "max") {
    return true;
  }

  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "max";
}
