import { describe, expect, it } from "vitest";
import { classifyE2EClerkAccount, isE2EClerkAccount } from "./e2e-account";

describe("E2E Clerk account marker", () => {
  it("recognizes server-marked temporary and persistent Development accounts", () => {
    expect(isE2EClerkAccount({ publicMetadata: { cleanmymapE2E: true } })).toBe(true);
    expect(isE2EClerkAccount({ publicMetadata: { cleanmymapE2E: false } })).toBe(false);
  });

  it("recognizes only the established cmm-e2e +clerk_test address pattern", () => {
    expect(isE2EClerkAccount({ emailAddresses: [{ emailAddress: "CMM-E2E-run-1+clerk_test@example.com" }] })).toBe(true);
    expect(isE2EClerkAccount({ emailAddresses: [{ emailAddress: "person+clerk_test@example.com" }] })).toBe(false);
    expect(isE2EClerkAccount({ emailAddresses: [{ emailAddress: "cmm-e2e-run-1@example.com" }] })).toBe(false);
  });

  it("does not treat unsafeMetadata or untrusted profile metadata as authority", () => {
    const userWithClientMetadata = {
      id: "user-human",
      publicMetadata: {},
      emailAddresses: [],
      unsafeMetadata: { cleanmymapE2E: true },
    };
    expect(isE2EClerkAccount(userWithClientMetadata)).toBe(false);
  });

  it("classifies legacy accounts without authorizing deletion", () => {
    expect(classifyE2EClerkAccount({
      id: "user-temp",
      publicMetadata: { cleanmymapE2E: true, cleanmymapOwner: "cleanmymap-playwright", cleanmymapLifecycle: "TEMPORARY" },
      emailAddresses: [{ emailAddress: "cmm-e2e-run+clerk_test@example.com" }],
    })).toBe("TEMPORARY_MARKED");
    expect(classifyE2EClerkAccount({
      id: "user-persistent",
      publicMetadata: { cleanmymapE2E: true, cleanmymapLifecycle: "PERSISTENT_DEVELOPMENT" },
    })).toBe("PERSISTENT_DEVELOPMENT_MARKED");
    expect(classifyE2EClerkAccount({ emailAddresses: [{ emailAddress: "cmm-e2e-old+clerk_test@example.com" }] })).toBe("LEGACY_TEST_ALIAS");
    expect(classifyE2EClerkAccount({ id: "human", publicMetadata: {}, emailAddresses: [{ emailAddress: "human@example.com" }] })).toBeNull();
  });
});
