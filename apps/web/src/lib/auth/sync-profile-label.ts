import type { User } from "@clerk/nextjs/server";
import { getDisplayNameModeOverride } from "@/lib/account/display-name-mode-store";
import {
  normalizeDisplayNameMode,
  resolveAccountDisplayName,
  type DisplayNameMode,
} from "@/lib/profiles";
import type { ProfileRow } from "./sync-profile-metadata";

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function extractDisplayNameModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): DisplayNameMode | null {
  const rawValue =
    readMetadataString(metadata, "display_name_mode") ??
    readMetadataString(metadata, "displayNameMode");
  return rawValue ? normalizeDisplayNameMode(rawValue) : null;
}

export function resolveDisplayNameModeForUser(
  user: User,
  existingProfile: ProfileRow | null,
): DisplayNameMode {
  return (
    getDisplayNameModeOverride(user.id) ??
    extractDisplayNameModeFromMetadata(user.unsafeMetadata as Record<string, unknown>) ??
    extractDisplayNameModeFromMetadata(user.publicMetadata as Record<string, unknown>) ??
    extractDisplayNameModeFromMetadata(user.privateMetadata as Record<string, unknown>) ??
    normalizeDisplayNameMode(existingProfile?.display_name_mode)
  );
}

export function resolveDisplayNameForUser(
  user: User,
  displayNameMode: DisplayNameMode,
  handle: string,
): string {
  return resolveAccountDisplayName({
    firstName: user.firstName?.trim() ?? "",
    lastName: user.lastName?.trim() ?? "",
    username: handle,
    userId: user.id,
    mode: displayNameMode,
  });
}
