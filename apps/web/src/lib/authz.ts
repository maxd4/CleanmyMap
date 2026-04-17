import { auth, clerkClient } from "@clerk/nextjs/server";
import { env } from "./env";
import { resolveProfile, type AppProfile, type AppRoleLabel } from "./profiles";
import {
  getEffectiveAccessForSessionRole,
  type EffectiveAccess,
} from "./domain-language";

type ClerkMetadata = Record<string, unknown> | null | undefined;

export type AdminAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export type AuthenticatedAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

export type AccountBadge = {
  id: string;
  label: string;
  icon: string;
};

export type UserIdentity = {
  userId: string;
  displayName: string;
  firstName: string | null;
  username: string;
  actorNameOptions: string[];
  role: AppProfile;
  badges: AccountBadge[];
};

const BADGE_CATALOG: Record<string, AccountBadge> = {
  admin: { id: "admin", label: "Administrateur", icon: "ADM" },
  pioneer: { id: "pioneer", label: "Pionnier", icon: "PIO" },
  mentor: { id: "mentor", label: "Mentor", icon: "MEN" },
  cleanwalk_10: { id: "cleanwalk_10", label: "10 cleanwalks", icon: "10x" },
  cleanwalk_50: { id: "cleanwalk_50", label: "50 cleanwalks", icon: "50x" },
  impact_100kg: { id: "impact_100kg", label: "100 kg collectes", icon: "100K" },
};

function parseAdminUserIds(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }
  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return new Set(ids);
}

function extractRole(metadata: ClerkMetadata): string | null {
  if (!metadata) {
    return null;
  }
  const role = metadata["role"];
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

function extractBadgeIds(metadata: ClerkMetadata): string[] {
  if (!metadata) {
    return [];
  }
  const badges = metadata["badges"];
  if (!Array.isArray(badges)) {
    return [];
  }
  return badges
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
}

function mapBadgeIdsToBadges(ids: string[]): AccountBadge[] {
  const deduped = Array.from(new Set(ids));
  return deduped
    .map(
      (id) =>
        BADGE_CATALOG[id] ?? { id, label: id.replace(/_/g, " "), icon: "BAD" },
    )
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

function buildActorNameOptions(
  firstName: string | null,
  username: string,
  userId: string,
): string[] {
  const candidates = [firstName ?? "", username, userId]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(candidates));
}

function resolveActorNameFromClerk(
  actorNameOptions: string[],
  preferred: string | null | undefined,
): string {
  const normalizedOptions = actorNameOptions
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (normalizedOptions.length === 0) {
    return "unknown-user";
  }

  const preferredCandidate = (preferred ?? "").trim();
  if (
    preferredCandidate.length > 0 &&
    normalizedOptions.includes(preferredCandidate)
  ) {
    return preferredCandidate;
  }

  return normalizedOptions[0];
}

export function isAdminRole(metadata: {
  publicMetadata?: ClerkMetadata;
  privateMetadata?: ClerkMetadata;
}): boolean {
  const publicRole = extractRole(metadata.publicMetadata);
  if (publicRole === "admin") {
    return true;
  }
  const privateRole = extractRole(metadata.privateMetadata);
  return privateRole === "admin";
}

export async function requireAdminAccess(): Promise<AdminAccessResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);
  if (adminUserIds.has(userId)) {
    return { ok: true, userId };
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if (
      isAdminRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      })
    ) {
      return { ok: true, userId };
    }
  } catch (error) {
    console.error("Admin role resolution failed", error);
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

export async function requireAuthenticatedAccess(): Promise<AuthenticatedAccessResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, userId };
}

export async function getCurrentUserRoleLabel(): Promise<AppRoleLabel> {
  const access = await requireAdminAccess();
  if (access.ok) {
    return "admin" as const;
  }
  if (access.status === 401) {
    return "anonymous" as const;
  }
  const { userId } = await auth();
  if (!userId) {
    return "anonymous" as const;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadataRole =
      extractRole(user.publicMetadata) ?? extractRole(user.privateMetadata);
    return resolveProfile({ metadataRole, isAdmin: false });
  } catch (error) {
    console.error("Current user role resolution failed", error);
    return "benevole";
  }
}

export async function getCurrentUserEffectiveAccess(): Promise<EffectiveAccess> {
  const role = await getCurrentUserRoleLabel();
  return getEffectiveAccessForSessionRole(role);
}

export async function getCurrentUserIdentity(): Promise<UserIdentity | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const adminUserIds = parseAdminUserIds(env.CLERK_ADMIN_USER_IDS);

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const isAdmin =
      adminUserIds.has(userId) ||
      isAdminRole({
        publicMetadata: user.publicMetadata,
        privateMetadata: user.privateMetadata,
      });

    const badgeIds = [
      ...extractBadgeIds(user.publicMetadata),
      ...extractBadgeIds(user.privateMetadata),
      ...(isAdmin ? ["admin"] : []),
    ];

    const firstName = user.firstName?.trim() || "";
    const lastName = user.lastName?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const username =
      user.username?.trim() ||
      user.primaryEmailAddress?.emailAddress?.trim() ||
      user.primaryPhoneNumber?.phoneNumber?.trim() ||
      userId;

    const actorNameOptions = buildActorNameOptions(
      firstName || null,
      username,
      userId,
    );

    const metadataRole =
      extractRole(user.publicMetadata) ?? extractRole(user.privateMetadata);

    return {
      userId,
      displayName: fullName || username,
      firstName: firstName || null,
      username,
      actorNameOptions,
      role: resolveProfile({ metadataRole, isAdmin }),
      badges: mapBadgeIdsToBadges(badgeIds),
    };
  } catch (error) {
    console.error("Current user identity resolution failed", error);
    return {
      userId,
      displayName: userId,
      firstName: null,
      username: userId,
      actorNameOptions: [userId],
      role: resolveProfile({
        metadataRole: null,
        isAdmin: adminUserIds.has(userId),
      }),
      badges: mapBadgeIdsToBadges(adminUserIds.has(userId) ? ["admin"] : []),
    };
  }
}

export const __authz_testables = {
  parseAdminUserIds,
  extractRole,
  extractBadgeIds,
  mapBadgeIdsToBadges,
  buildActorNameOptions,
  resolveActorNameFromClerk,
};

export function pickTraceableActorName(
  identity: UserIdentity | null,
  preferred: string | null | undefined,
): string | undefined {
  if (!identity) {
    return undefined;
  }
  return resolveActorNameFromClerk(identity.actorNameOptions, preferred);
}
