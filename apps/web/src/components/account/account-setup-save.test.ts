import { describe, expect, it, vi } from "vitest";
import {
  buildAccountSetupIdentityUpdate,
  clearAccountSetupDeferralMetadata,
  createAccountSetupDeferralMetadata,
  persistAccountSetupChanges,
  type AccountSetupPersistenceStep,
  type AccountSetupUserUpdate,
} from "./account-setup-save";

function createPersistenceDependencies() {
  return {
    updateUser: vi.fn(async (update: AccountSetupUserUpdate) => {
      void update;
    }),
    updateActiveProfile: vi.fn(async () => undefined),
    saveDisplayMode: vi.fn(),
  };
}

describe("account setup persistence", () => {
  it("updates only first and last names, never the Clerk username", () => {
    const result = buildAccountSetupIdentityUpdate({ firstName: " Marie ", lastName: " Curie " });
    expect(result).toEqual({ firstName: "Marie", lastName: "Curie" });
    expect(result).not.toHaveProperty("username");
  });

  it("persists identity without requiring a username", async () => {
    const dependencies = createPersistenceDependencies();
    await persistAccountSetupChanges({
      firstName: "Marie",
      lastName: "Curie",
      metadata: { profileSetupCompleted: true },
      initialProfile: "benevole",
      selectedProfile: "scientifique",
      ...dependencies,
    });

    expect(dependencies.updateUser).toHaveBeenNthCalledWith(1, { firstName: "Marie", lastName: "Curie" });
    expect(dependencies.updateUser).toHaveBeenNthCalledWith(2, { unsafeMetadata: { profileSetupCompleted: true } });
    expect(dependencies.updateUser.mock.calls.flat()).not.toContainEqual(
      expect.objectContaining({ username: expect.anything() }),
    );
    expect(dependencies.updateActiveProfile).toHaveBeenCalledWith("scientifique");
  });

  it.each(["identity", "activeProfile", "metadata", "displayMode"] as const)(
    "resumes after a partial %s success without replaying completed steps",
    async (failedStep) => {
      const completedSteps = new Set<AccountSetupPersistenceStep>();
      let failureRaised = false;
      const failOnce = (step: AccountSetupPersistenceStep) => {
        if (failedStep === step && !failureRaised) {
          failureRaised = true;
          throw new Error(`${step} failed`);
        }
      };
      const updateUser = vi.fn(async (update: AccountSetupUserUpdate) => {
        failOnce("identity");
        if ("unsafeMetadata" in update) failOnce("metadata");
      });
      const updateActiveProfile = vi.fn(async () => failOnce("activeProfile"));
      const saveDisplayMode = vi.fn(() => failOnce("displayMode"));
      const runPersistence = () => persistAccountSetupChanges({
        firstName: "Marie",
        lastName: "Curie",
        metadata: { profileSetupCompleted: true },
        initialProfile: "benevole",
        selectedProfile: failedStep === "activeProfile" ? "scientifique" : "benevole",
        updateUser,
        updateActiveProfile,
        saveDisplayMode,
        completedSteps,
      });

      await expect(runPersistence()).rejects.toThrow(`${failedStep} failed`);
      await expect(runPersistence()).resolves.toBeUndefined();
      expect(completedSteps).toEqual(new Set(["identity", "activeProfile", "metadata", "displayMode"]));
      expect(updateActiveProfile).toHaveBeenCalledTimes(failedStep === "activeProfile" ? 2 : 0);
      expect(saveDisplayMode).toHaveBeenCalledTimes(failedStep === "displayMode" ? 2 : 1);
    },
  );

  it("writes completion metadata only after display mode succeeds", async () => {
    const dependencies = createPersistenceDependencies();
    let shouldFailDisplayMode = true;
    dependencies.saveDisplayMode.mockImplementation(() => {
      if (shouldFailDisplayMode) {
        shouldFailDisplayMode = false;
        throw new Error("displayMode failed");
      }
    });
    const completedSteps = new Set<AccountSetupPersistenceStep>();
    const runPersistence = () => persistAccountSetupChanges({
      firstName: "Marie",
      lastName: "Curie",
      metadata: { profileSetupCompleted: true },
      initialProfile: "benevole",
      selectedProfile: "scientifique",
      ...dependencies,
      completedSteps,
    });

    await expect(runPersistence()).rejects.toThrow("displayMode failed");
    expect(dependencies.updateUser).toHaveBeenCalledTimes(1);
    await expect(runPersistence()).resolves.toBeUndefined();
    expect(dependencies.updateUser).toHaveBeenCalledTimes(2);
    expect(completedSteps).toEqual(new Set(["identity", "activeProfile", "displayMode", "metadata"]));
  });

  it("keeps a historical username outside the identity update", () => {
    const result = buildAccountSetupIdentityUpdate({ firstName: "Marie", lastName: "Curie" });
    expect(result).toEqual({ firstName: "Marie", lastName: "Curie" });
    expect(result).not.toHaveProperty("username");
  });

  it("preserves unrelated metadata when deferring and clears it on completion", () => {
    const deferred = createAccountSetupDeferralMetadata(
      { activeProfile: "benevole", display_name_mode: "full_name" },
      3,
      "2026-09-05T12:00:00.000Z",
    );
    expect(deferred).toMatchObject({ activeProfile: "benevole", profileSetupDeferred: true, profileSetupDeferredVersion: 3, profileSetupDeferredAt: "2026-09-05T12:00:00.000Z" });
    expect(clearAccountSetupDeferralMetadata(deferred)).toEqual({ activeProfile: "benevole", display_name_mode: "full_name" });
  });
});
