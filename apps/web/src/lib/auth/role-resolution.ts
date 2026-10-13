import type { Role } from "@/lib/domain-language";

export type ClerkMetadata = Record<string, unknown> | null | undefined;

export type ClerkRoleMetadata = {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
};

export type ClerkUserForRole = ClerkRoleMetadata & {
  id: string;
};

const CANONICAL_ROLES = new Set<Role>([
  "benevole",
  "coordinateur",
  "scientifique",
  "entreprise",
  "elu",
  "admin",
  "max",
]);

function normalizeCanonicalRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return CANONICAL_ROLES.has(normalized as Role) ? (normalized as Role) : null;
}

/** Reads only Clerk publicMetadata.role. Legacy fields are migration inputs, never authority. */
export function extractRole(metadata: ClerkMetadata): Role | null {
  if (!metadata) {
    return null;
  }

  return normalizeCanonicalRole(metadata["role"]);
}

export function isAdminRole(metadata: ClerkRoleMetadata): boolean {
  return extractRole(metadata.publicMetadata) === "admin";
}

export function isMaxRole(params: {
  user: ClerkUserForRole;
  imuOwnerUserId: string | undefined;
}): boolean {
  const ownerUserId = params.imuOwnerUserId?.trim();
  return Boolean(
    ownerUserId &&
      params.user.id === ownerUserId &&
      extractRole(params.user.publicMetadata) === "max",
  );
}

export function isConfiguredImuOwnerUserId(
  userId: string | null | undefined,
  imuOwnerUserId: string | undefined,
): boolean {
  const ownerUserId = imuOwnerUserId?.trim();
  return Boolean(ownerUserId && userId && userId === ownerUserId);
}

export function resolveClerkRole(params: {
  user: ClerkUserForRole;
  imuOwnerUserId: string | undefined;
}): Role {
  const canonicalRole = extractRole(params.user.publicMetadata);
  if (isMaxRole(params)) {
    return "max";
  }

  if (canonicalRole === "admin") {
    return "admin";
  }

  return canonicalRole === "max" ? "benevole" : canonicalRole ?? "benevole";
}
