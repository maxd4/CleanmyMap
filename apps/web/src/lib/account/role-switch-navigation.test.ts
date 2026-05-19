import { describe, expect, it } from "vitest";
import { getRoleSwitchTargetPath } from "./role-switch-navigation";

describe("getRoleSwitchTargetPath", () => {
  it("keeps the user on summary pages", () => {
    expect(getRoleSwitchTargetPath("/explorer", "/profil/benevole")).toBeNull();
    expect(getRoleSwitchTargetPath("/accueil", "/profil/benevole")).toBeNull();
  });

  it("redirects when the current page is already profile-related", () => {
    expect(getRoleSwitchTargetPath("/profil/max", "/profil/benevole")).toBe(
      "/profil/benevole",
    );
    expect(getRoleSwitchTargetPath("/parcours/max", "/profil/benevole")).toBe(
      "/profil/benevole",
    );
  });
});
