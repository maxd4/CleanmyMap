import { describe, expect, it } from "vitest";
import {
  resolveAccountSetupIdentityNames,
  resolveAccountSetupNameField,
} from "./account-setup-identity";

describe("account setup identity source", () => {
  it("prefers Clerk first and last names", () => {
    expect(resolveAccountSetupIdentityNames({
      firstName: "Clerk",
      lastName: "User",
      externalAccounts: [{ provider: "google", firstName: "Google", lastName: "Person" }],
    })).toEqual({ firstName: "Clerk", lastName: "User" });
  });

  it("falls back to Google ExternalAccount names without using email", () => {
    expect(resolveAccountSetupIdentityNames({
      firstName: null,
      lastName: null,
      externalAccounts: [
        { provider: "github", firstName: "Ignored", lastName: "Provider" },
        { provider: "google", firstName: "Ada", lastName: "Lovelace" },
      ],
    })).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(resolveAccountSetupIdentityNames({
      externalAccounts: [{ provider: "google", firstName: "", lastName: "" }],
    })).toEqual({ firstName: "", lastName: "" });
  });

  it("supports LinkedIn OpenID Connect ExternalAccount names without assuming all fields exist", () => {
    expect(resolveAccountSetupIdentityNames({
      firstName: null,
      lastName: null,
      externalAccounts: [
        { provider: "linkedin_oidc", firstName: "Linus", lastName: "Torvalds" },
      ],
    })).toEqual({ firstName: "Linus", lastName: "Torvalds" });

    expect(resolveAccountSetupIdentityNames({
      firstName: null,
      lastName: null,
      externalAccounts: [
        { provider: "oauth_linkedin_oidc", firstName: "Camille", lastName: null },
      ],
    })).toEqual({ firstName: "Camille", lastName: "" });

    expect(resolveAccountSetupIdentityNames({
      firstName: "",
      lastName: "",
      externalAccounts: [{ provider: "oauth_linkedin_oidc" }],
    })).toEqual({ firstName: "", lastName: "" });
  });

  it("does not overwrite a manual field during rehydration", () => {
    expect(resolveAccountSetupNameField("Manual", "Provider")).toBe("Manual");
    expect(resolveAccountSetupNameField("", "Provider")).toBe("");
    expect(resolveAccountSetupNameField(null, "Provider")).toBe("Provider");
  });
});
