import type { User } from "@clerk/nextjs/server";
import { getDisplayNameModeOverride } from "@/lib/account/display-name-mode-store";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
  type DisplayNameMode,
} from "./profiles";

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

function resolveIdentityUsername(user: User, userId: string): string {
  return (
    user.username?.trim() ||
    user.primaryEmailAddress?.emailAddress?.trim() ||
    user.primaryPhoneNumber?.phoneNumber?.trim() ||
    userId
  );
}

function resolveIdentityEmail(user: User): string | null {
  return user.primaryEmailAddress?.emailAddress?.trim() || null;
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

export function resolveIdentityNameParts(
  user: User,
  userId: string,
): {
  firstName: string;
  lastName: string;
  username: string;
  email: string | null;
} {
  return {
    firstName: resolveIdentityFirstName(user),
    lastName: resolveIdentityLastName(user),
    username: resolveIdentityUsername(user, userId),
    email: resolveIdentityEmail(user),
  };
}

export function resolveIdentityDisplayNameMode(
  userId: string,
  storedProfile: StoredProfileNameRow | null,
): DisplayNameMode {
  return getDisplayNameModeOverride(userId) ?? normalizeDisplayNameMode(storedProfile?.display_name_mode);
}

export function resolveIdentityDisplayName(
  firstName: string,
  lastName: string,
  username: string,
  userId: string,
  displayNameMode: DisplayNameMode,
  storedProfile: StoredProfileNameRow | null,
): string {
  return (
    resolveAccountDisplayName({
      firstName,
      lastName,
      username,
      userId,
      mode: displayNameMode,
    }) || storedProfile?.display_name?.trim() || username
  );
}

export function resolveIdentityHandle(username: string, storedProfile: StoredProfileNameRow | null): string {
  return storedProfile?.handle?.trim() || username;
}

export function resolveIdentityActorNameOptions(
  firstName: string,
  username: string,
  userId: string,
): string[] {
  return buildActorNameOptions(firstName || null, username, userId);
}
