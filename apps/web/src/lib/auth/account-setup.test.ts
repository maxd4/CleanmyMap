import { describe, expect, it, vi } from "vitest";
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  hasRequiredAccountIdentity,
  hasCurrentAccountSetupDeferral,
  extractAccountSetupDeferredVersion,
  shouldRequireAccountSetup,
  shouldRequireAccountSetupRefresh,
} from "@/lib/auth/account-setup";
import { ACCOUNT_SETUP_SCHEMA_VERSION } from "@/lib/auth/account-setup-config";
import { getCurrentUserAccountSetupRequirement } from "@/lib/auth/account-setup";

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

  it("still requires names when legacy pseudonym mode is present", () => {
    expect(hasRequiredAccountIdentity(null, null)).toBe(false);
    expect(hasRequiredAccountIdentity("  ", "  ")).toBe(false);
  });
});

describe("account setup deferral", () => {
  it("accepts a current or newer deferral without marking setup complete", () => {
    expect(
      hasCurrentAccountSetupDeferral({
        profileSetupDeferred: true,
        profileSetupDeferredVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
      }),
    ).toBe(true);
    expect(
      extractAccountSetupDeferredVersion({
        profileSetupDeferred: true,
        profileSetupDeferredVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
      }),
    ).toBe(ACCOUNT_SETUP_SCHEMA_VERSION);
  });

  it("does not accept an older or malformed deferral", () => {
    expect(
      hasCurrentAccountSetupDeferral({
        profileSetupDeferred: true,
        profileSetupDeferredVersion: ACCOUNT_SETUP_SCHEMA_VERSION - 1,
      }),
    ).toBe(false);
    expect(
      hasCurrentAccountSetupDeferral({
        profileSetupDeferred: true,
        profileSetupDeferredVersion: "invalid",
      }),
    ).toBe(false);
  });
});

describe("current account setup requirement", () => {
  it("does not require setup solely because the username is null", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1" } as never);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          createdAt: new Date(),
          firstName: "Ada",
          lastName: "Lovelace",
          username: null,
          publicMetadata: {
            profileSetupCompleted: true,
            profileSetupVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
          },
          privateMetadata: {},
          unsafeMetadata: {},
        }),
      },
    } as never);

    await expect(getCurrentUserAccountSetupRequirement()).resolves.toMatchObject({
      requiresSetup: false,
      reason: null,
    });
  });
});
