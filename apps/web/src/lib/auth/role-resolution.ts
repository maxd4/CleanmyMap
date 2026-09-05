import { normalizeProfileRole } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";

export type ClerkMetadata = Record<string, unknown> | null | undefined;

export type ClerkRoleMetadata = {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
};

export type ClerkUserForRole = ClerkRoleMetadata & {
  id: string;
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

/** Parses the legacy operator list; it is never an AuthZ role grant. */
export function parseAdminUserIds(raw: string | undefined): Set<string> {
  return parseUserIds(raw);
}

export function parseMaxUserIds(raw: string | undefined): Set<string> {
  return parseUserIds(raw);
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
  if (publicRole === "admin") {
    return true;
  }

  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "admin";
}

export function isMaxRole(metadata: ClerkRoleMetadata): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "max") {
    return true;
  }

  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "max";
}

export function resolveClerkRole(params: {
  user: ClerkUserForRole;
  adminUserIds: ReadonlySet<string>;
  maxUserIds: ReadonlySet<string>;
}): Role {
  if (params.maxUserIds.has(params.user.id) || isMaxRole(params.user)) {
    return "max";
  }

  if (params.adminUserIds.has(params.user.id) || isAdminRole(params.user)) {
    return "admin";
  }

  const metadataRole =
    extractRole(params.user.publicMetadata) ?? extractRole(params.user.privateMetadata);
  return normalizeProfileRole(metadataRole) ?? "benevole";
}
