import type { AppProfile } from"../../lib/profiles";
import { cycleSelfServiceProfile } from"../../lib/profiles";
import { DISPLAY_MODES, type DisplayMode } from"../../lib/ui/preferences";

export function cycleDisplayMode(current: DisplayMode): DisplayMode {
 const index = DISPLAY_MODES.indexOf(current);
 return DISPLAY_MODES[(index + 1) % DISPLAY_MODES.length] ?? DISPLAY_MODES[0];
}

export function cycleRoleForSelfService(current: AppProfile) {
 return cycleSelfServiceProfile(current);
}
