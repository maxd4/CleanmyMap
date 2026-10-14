import type { DisplayNameMode } from "@/lib/profiles";
import { normalizeDisplayNameMode } from "@/lib/profiles";
import { cookies } from "next/headers";

export const DISPLAY_NAME_MODE_COOKIE = "cmm_display_name_mode";

export async function getDisplayNameModeCookieOverride(): Promise<DisplayNameMode | null> {
  try {
    const cookieStore = await cookies();
    const rawValue = cookieStore.get(DISPLAY_NAME_MODE_COOKIE)?.value;
    return typeof rawValue === "string" ? normalizeDisplayNameMode(rawValue) : null;
  } catch {
    return null;
  }
}
