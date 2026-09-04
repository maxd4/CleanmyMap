import { normalizeProfileRole } from "@/lib/profiles";
import type { Role } from "@/lib/domain-language";

export type ClerkMetadata = Record<string, unknown> | null | undefined;

export type ClerkRoleMetadata = {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
};

export type ClerkPrimaryEmail = {
  emailAddress?: string | null;
  verification?: { status?: string | null } | null;
} | null;

export type ClerkUserForRole = ClerkRoleMetadata & {
  id: string;
  primaryEmailAddress?: ClerkPrimaryEmail;
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

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function isCanonicalImuOwner(params: {
  userId: string | null | undefined;
  primaryEmailAddress?: ClerkPrimaryEmail;
  ownerUserId: string | null | undefined;
  ownerEmail: string | null | undefined;
}): boolean {
  const userId = params.userId?.trim() ?? "";
  const ownerUserId = params.ownerUserId?.trim() ?? "";
  const email = normalizeEmail(params.primaryEmailAddress?.emailAddress);
  const ownerEmail = normalizeEmail(params.ownerEmail);

  return Boolean(
    userId &&
      ownerUserId &&
      email &&
      ownerEmail &&
      userId === ownerUserId &&
      email === ownerEmail &&
      params.primaryEmailAddress?.verification?.status === "verified",
  );
}

export function resolveClerkRole(params: {
  user: ClerkUserForRole;
  adminUserIds: Set<string>;
  ownerUserId: string | null | undefined;
  ownerEmail: string | null | undefined;
}): Role {
  if (
    isCanonicalImuOwner({
      userId: params.user.id,
      primaryEmailAddress: params.user.primaryEmailAddress,
      ownerUserId: params.ownerUserId,
      ownerEmail: params.ownerEmail,
    })
  ) {
    return "max";
  }

  if (params.adminUserIds.has(params.user.id) || isAdminRole(params.user)) {
    return "admin";
  }

  const metadataRole =
    extractRole(params.user.publicMetadata) ?? extractRole(params.user.privateMetadata);
  const normalizedRole = normalizeProfileRole(metadataRole);

  // IMU is an identity assertion, not a metadata role. Unknown/non-owner max
  // aliases are deliberately reduced to the least-privileged real role.
  return normalizedRole === "max" ? "benevole" : normalizedRole ?? "benevole";
}
