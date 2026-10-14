import type { User } from "@clerk/nextjs/server";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
  type DisplayNameMode,
} from "./profiles";
import { buildFallbackHandle } from "./auth/identity-handle";

type StoredProfileNameRow = {
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
};

function resolveIdentityFirstName(user: User): string {
  return user.firstName?.trim() || "";
}

function resolveIdentityLastName(user: User): string {
  return user.lastName?.trim() || "";
}

function resolveIdentityUsername(user: User): string | null {
  return user.username?.trim() || null;
}

function resolveIdentityEmail(user: User): string | null {
  return user.primaryEmailAddress?.emailAddress?.trim() || null;
}

function buildActorNameOptions(
  firstName: string | null,
  username: string | null,
  handle: string,
): string[] {
  const candidates = [firstName ?? "", username ?? "", handle]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(candidates));
}

export function resolveIdentityNameParts(
  user: User,
): {
  firstName: string;
  lastName: string;
  username: string | null;
  email: string | null;
} {
  return {
    firstName: resolveIdentityFirstName(user),
    lastName: resolveIdentityLastName(user),
    username: resolveIdentityUsername(user),
    email: resolveIdentityEmail(user),
  };
}

export function resolveIdentityDisplayNameMode(
  userId: string,
  storedProfile: StoredProfileNameRow | null,
  user?: User,
): DisplayNameMode {
  void userId;
  const metadataSources = [
    user?.unsafeMetadata,
    user?.publicMetadata,
    user?.privateMetadata,
  ] as Array<Record<string, unknown> | null | undefined>;
  for (const metadata of metadataSources) {
    const value = metadata?.display_name_mode ?? metadata?.displayNameMode;
    if (typeof value === "string") return normalizeDisplayNameMode(value);
  }
  return normalizeDisplayNameMode(storedProfile?.display_name_mode);
}

export function resolveIdentityDisplayName(
  firstName: string,
  lastName: string,
  _username: string | null,
  handle: string,
  userId: string,
  displayNameMode: DisplayNameMode,
  storedProfile: StoredProfileNameRow | null,
): string {
  return (
    resolveAccountDisplayName({
      firstName,
      lastName,
      username: handle,
      userId,
      mode: displayNameMode,
    }) || storedProfile?.display_name?.trim() || handle
  );
}

export function resolveIdentityHandle(
  username: string | null,
  userId: string,
  storedProfile: StoredProfileNameRow | null,
): string {
  return storedProfile?.handle?.trim() || username || buildFallbackHandle(userId);
}

export function resolveIdentityActorNameOptions(
  firstName: string,
  username: string | null,
  handle: string,
): string[] {
  return buildActorNameOptions(firstName || null, username, handle);
}
