import type { AppProfile } from"../../lib/profiles";
import {
 cycleSelfServiceProfile,
 getSwitchableProfiles,
 OPEN_PROFILE_ORDER,
 type AppGrantedRole,
} from"../../lib/profiles";
import { DISPLAY_MODES, type DisplayMode } from"../../lib/ui/preferences";
import type { Locale } from"../../lib/ui/preferences";

export type RoleMenuGroups = {
 openProfiles: AppProfile[];
 obtainedProfiles: AppProfile[];
};

export function cycleDisplayMode(current: DisplayMode): DisplayMode {
  void current;
  return DISPLAY_MODES[0];
}

export function cycleRoleForSelfService(current: AppProfile) {
 return cycleSelfServiceProfile(current);
}

export function getRoleMenuGroups(grantedRole: AppGrantedRole): RoleMenuGroups {
 const switchableProfiles = getSwitchableProfiles(grantedRole);
 const openProfiles = switchableProfiles.filter((profile) =>
  (OPEN_PROFILE_ORDER as readonly AppProfile[]).includes(profile),
 );

 return {
  openProfiles,
  obtainedProfiles: switchableProfiles.filter((profile) => !openProfiles.includes(profile)),
 };
}

export function getAccountEvolutionLabel(
 locale: Locale,
 pending: boolean,
): string {
 if (locale === "fr") {
  return pending ? "Évolution du compte · En attente" : "Évolution du compte";
 }
 return pending ? "Account evolution · Pending" : "Account evolution";
}
