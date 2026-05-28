import { describe, expect, it } from "vitest";
import { getRoleSwitchTargetPath } from "./role-switch-navigation";
import { HOME_ROUTE } from "@/lib/home-routes";
import {
  EXPLORER_ROUTE,
  PARCOURS_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

describe("getRoleSwitchTargetPath", () => {
  it("keeps the user on summary pages", () => {
    expect(getRoleSwitchTargetPath(EXPLORER_ROUTE, `${PROFIL_ROUTE}/benevole`)).toBeNull();
    expect(getRoleSwitchTargetPath(HOME_ROUTE, "/profil/benevole")).toBeNull();
  });

  it("redirects when the current page is already profile-related", () => {
    expect(getRoleSwitchTargetPath(`${PROFIL_ROUTE}/max`, `${PROFIL_ROUTE}/benevole`)).toBe(
      `${PROFIL_ROUTE}/benevole`,
    );
    expect(getRoleSwitchTargetPath(`${PARCOURS_ROUTE}/max`, `${PROFIL_ROUTE}/benevole`)).toBe(
      `${PROFIL_ROUTE}/benevole`,
    );
  });
});
