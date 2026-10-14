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
    updateMetadata: vi.fn(async (patch: Record<string, unknown>) => {
      void patch;
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
      selectedProfile: "scientifique",
      ...dependencies,
    });

    expect(dependencies.updateUser).toHaveBeenNthCalledWith(1, { firstName: "Marie", lastName: "Curie" });
    expect(dependencies.updateMetadata).toHaveBeenCalledWith({ profileSetupCompleted: true });
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
        void update;
        failOnce("identity");
      });
      const updateMetadata = vi.fn(async () => failOnce("metadata"));
      const updateActiveProfile = vi.fn(async () => failOnce("activeProfile"));
      const saveDisplayMode = vi.fn(() => failOnce("displayMode"));
      const runPersistence = () => persistAccountSetupChanges({
        firstName: "Marie",
        lastName: "Curie",
        metadata: { profileSetupCompleted: true },
        selectedProfile: "scientifique",
        updateUser,
        updateMetadata,
        updateActiveProfile,
        saveDisplayMode,
        completedSteps,
      });

      await expect(runPersistence()).rejects.toThrow(`${failedStep} failed`);
      await expect(runPersistence()).resolves.toBeUndefined();
      expect(completedSteps).toEqual(new Set(["identity", "activeProfile", "metadata", "displayMode"]));
      expect(updateUser).toHaveBeenCalledTimes(failedStep === "identity" ? 2 : 1);
      expect(updateMetadata).toHaveBeenCalledTimes(failedStep === "metadata" ? 2 : 1);
      expect(updateActiveProfile).toHaveBeenCalledTimes(failedStep === "activeProfile" ? 2 : 1);
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
      selectedProfile: "scientifique",
      ...dependencies,
      completedSteps,
    });

    await expect(runPersistence()).rejects.toThrow("displayMode failed");
    expect(dependencies.updateUser).toHaveBeenCalledTimes(1);
    expect(dependencies.updateMetadata).not.toHaveBeenCalled();
    await expect(runPersistence()).resolves.toBeUndefined();
    expect(dependencies.updateUser).toHaveBeenCalledTimes(1);
    expect(dependencies.updateMetadata).toHaveBeenCalledTimes(1);
    expect(dependencies.updateActiveProfile).toHaveBeenCalledTimes(1);
    expect(completedSteps).toEqual(new Set(["identity", "displayMode", "metadata", "activeProfile"]));
  });

  it("runs the terminal Supabase projection when the active profile is unchanged", async () => {
    const dependencies = createPersistenceDependencies();
    await persistAccountSetupChanges({
      firstName: "Marie",
      lastName: "Curie",
      metadata: { profileSetupCompleted: true },
      selectedProfile: "benevole",
      ...dependencies,
    });
    expect(dependencies.updateActiveProfile).toHaveBeenCalledWith("benevole");
    expect(dependencies.updateMetadata.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.updateActiveProfile.mock.invocationCallOrder[0],
    );
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
