import type { AppProfile } from"../../lib/profiles";
import { cycleSelfServiceProfile } from"../../lib/profiles";
import { DISPLAY_MODES, type DisplayMode } from"../../lib/ui/preferences";

export function cycleDisplayMode(current: DisplayMode): DisplayMode {
  void current;
  return DISPLAY_MODES[0];
}

export function cycleRoleForSelfService(current: AppProfile) {
 return cycleSelfServiceProfile(current);
}
