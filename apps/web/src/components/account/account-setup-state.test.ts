import { describe, expect, it } from "vitest";
import {
  getAccountSetupProfileOptions,
  getAccountSetupDeferralConfirmationMessage,
  getAccountSetupDeferralLabel,
  isAccountSetupStepValid,
  resolveAccountSetupValidation,
  resolveAccountSetupDisplayMode,
  resolveAccountSetupDisplayNameMode,
  resolveAccountSetupProfileSelection,
  shouldHydrateAccountSetupDisplayNameMode,
  shouldHydrateAccountSetupLocations,
  shouldConfirmAccountSetupDeferral,
  shouldShowAccountSetupFieldError,
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
    expect(getAccountSetupDeferralConfirmationMessage()).toBe(
      "Des modifications ne sont pas enregistrées. Continuer sans les enregistrer ?",
    );
  });

  it("makes a partial persistence deferral explicit", () => {
    expect(getAccountSetupDeferralLabel(false, 1)).toBe("Quitter, modifications conservées");
    expect(shouldConfirmAccountSetupDeferral(false, 1)).toBe(true);
    expect(getAccountSetupDeferralConfirmationMessage(1)).toBe(
      "Certaines modifications ont déjà été enregistrées. Quitter ne les annulera pas.",
    );
  });

  it("only exposes field errors after touch or submit attempt", () => {
    expect(shouldShowAccountSetupFieldError(false, false)).toBe(false);
    expect(shouldShowAccountSetupFieldError(false, true)).toBe(true);
    expect(shouldShowAccountSetupFieldError(true, false)).toBe(true);
  });

  it("validates only the fields owned by the current setup step", () => {
    const errors = { firstName: null, lastName: null, profile: "invalid", location: "invalid" };

    expect(isAccountSetupStepValid("identity", errors)).toBe(true);
    expect(isAccountSetupStepValid("usage", errors)).toBe(false);
    expect(isAccountSetupStepValid("location", errors)).toBe(false);
  });

  it("derives location and field validity without changing the selected values", () => {
    const result = resolveAccountSetupValidation({
      firstName: "Marie",
      lastName: "Curie",
      selectedProfile: "benevole",
      profileOptions: ["benevole"],
      noneSelected: false,
      residence: {
        country: "France",
        level: "commune",
        label: "Paris",
        subtitle: "Île-de-France",
        arrondissement: null,
        arrondissementCity: null,
      },
      work: null,
      residenceEnabled: true,
      workEnabled: false,
    });

    expect(result).toMatchObject({
      firstNameError: null,
      lastNameError: null,
      profileError: null,
      activeResidence: true,
      activeWork: false,
      locationError: null,
      formIsValid: true,
    });
  });
});
