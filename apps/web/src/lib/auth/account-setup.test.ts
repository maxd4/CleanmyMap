import { describe, expect, it } from "vitest";
import {
  hasRequiredAccountIdentity,
  hasRequiredAccountPseudo,
  shouldRequireAccountSetup,
  shouldRequireAccountSetupRefresh,
} from "@/lib/auth/account-setup";
import { ACCOUNT_SETUP_SCHEMA_VERSION } from "@/lib/auth/account-setup-config";

describe("shouldRequireAccountSetup", () => {
  it("requires setup for a recent account without completion flag", () => {
    const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, false)).toBe(true);
  });

  it("does not require setup once completion is flagged", () => {
    const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, true)).toBe(false);
  });

  it("does not require setup for an older account without completion flag", () => {
    const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(shouldRequireAccountSetup(createdAt, false)).toBe(false);
  });
});

describe("shouldRequireAccountSetupRefresh", () => {
  it("requires refresh when the version is missing", () => {
    expect(shouldRequireAccountSetupRefresh(null)).toBe(true);
  });

  it("requires refresh when the version is older than the schema", () => {
    expect(shouldRequireAccountSetupRefresh(ACCOUNT_SETUP_SCHEMA_VERSION - 1)).toBe(true);
  });

  it("does not require refresh when the version is current", () => {
    expect(shouldRequireAccountSetupRefresh(ACCOUNT_SETUP_SCHEMA_VERSION)).toBe(false);
  });
});

describe("hasRequiredAccountIdentity", () => {
  it("requires non-empty trimmed first and last names", () => {
    expect(hasRequiredAccountIdentity(" Sophie ", " Martin ")).toBe(true);
    expect(hasRequiredAccountIdentity("  ", "Martin")).toBe(false);
    expect(hasRequiredAccountIdentity("Sophie", " ")).toBe(false);
    expect(hasRequiredAccountIdentity(null, "Martin")).toBe(false);
  });

  it("does not require names when the pseudonym display mode is selected", () => {
    expect(hasRequiredAccountIdentity(null, null, "pseudo")).toBe(true);
    expect(hasRequiredAccountIdentity("  ", "  ", "pseudo")).toBe(true);
  });
});

describe("hasRequiredAccountPseudo", () => {
  it("requires a non-empty Clerk username", () => {
    expect(hasRequiredAccountPseudo(" Vert_Tige ")).toBe(true);
    expect(hasRequiredAccountPseudo("  ")).toBe(false);
    expect(hasRequiredAccountPseudo(null)).toBe(false);
  });
});
