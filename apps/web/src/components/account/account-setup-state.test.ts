import { describe, expect, it } from "vitest";
import {
  getAccountSetupProfileOptions,
  getAccountSetupDeferralLabel,
  resolveAccountSetupDisplayMode,
  resolveAccountSetupDisplayNameMode,
  resolveAccountSetupProfileSelection,
  shouldHydrateAccountSetupDisplayNameMode,
  shouldHydrateAccountSetupLocations,
  shouldConfirmAccountSetupDeferral,
} from "./account-setup-state";

describe("account setup initial state", () => {
  it("keeps the selected profile visible and bounded by switchable profiles", () => {
    const maxOptions = getAccountSetupProfileOptions("max");
    const volunteerOptions = getAccountSetupProfileOptions("benevole");

    expect(maxOptions).toContain("max");
    expect(resolveAccountSetupProfileSelection("max", maxOptions)).toBe("max");
    expect(resolveAccountSetupProfileSelection("max", volunteerOptions)).toBe("benevole");
    expect(volunteerOptions).not.toContain("max");
  });

  it("hydrates the display name independently from existing locations", () => {
    expect(shouldHydrateAccountSetupLocations(true, true, false)).toBe(false);
    expect(shouldHydrateAccountSetupDisplayNameMode(undefined, false)).toBe(true);
    expect(resolveAccountSetupDisplayNameMode("pseudo")).toBe("pseudo");
  });

  it("follows the provider until the user explicitly chooses a display mode", () => {
    expect(resolveAccountSetupDisplayMode("sobre", null)).toBe("sobre");
    expect(resolveAccountSetupDisplayMode("sobre", "minimaliste")).toBe("minimaliste");
  });

  it("makes an unsaved deferral explicit and confirmable", () => {
    expect(getAccountSetupDeferralLabel(false)).toBe("Configurer plus tard");
    expect(getAccountSetupDeferralLabel(true)).toBe("Plus tard, sans enregistrer");
    expect(shouldConfirmAccountSetupDeferral(false)).toBe(false);
    expect(shouldConfirmAccountSetupDeferral(true)).toBe(true);
  });
});
