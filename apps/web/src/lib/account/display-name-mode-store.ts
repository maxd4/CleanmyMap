import type { DisplayNameMode } from "@/lib/profiles";
import { normalizeDisplayNameMode } from "@/lib/profiles";
import { cookies } from "next/headers";

const displayNameModeByUserId = new Map<string, DisplayNameMode>();
export const DISPLAY_NAME_MODE_COOKIE = "cmm_display_name_mode";

export function getDisplayNameModeOverride(
  userId: string,
): DisplayNameMode | null {
  return displayNameModeByUserId.get(userId) ?? null;
}

export function setDisplayNameModeOverride(
  userId: string,
  mode: string,
): DisplayNameMode {
  const normalized = normalizeDisplayNameMode(mode);
  displayNameModeByUserId.set(userId, normalized);
  return normalized;
}

export function clearDisplayNameModeOverridesForTests(): void {
  displayNameModeByUserId.clear();
}

export async function getDisplayNameModeCookieOverride(): Promise<DisplayNameMode | null> {
  try {
    const cookieStore = await cookies();
    const rawValue = cookieStore.get(DISPLAY_NAME_MODE_COOKIE)?.value;
    return typeof rawValue === "string" ? normalizeDisplayNameMode(rawValue) : null;
  } catch {
    return null;
  }
}
