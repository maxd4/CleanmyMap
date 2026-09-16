import { describe, expect, it, vi } from "vitest";
import {
  buildAccountSetupIdentityUpdate,
  clearAccountSetupDeferralMetadata,
  createAccountSetupDeferralMetadata,
  persistAccountSetupChanges,
  type AccountSetupPersistenceStep,
  type AccountSetupUserUpdate,
} from "./account-setup-save";

describe("account setup persistence", () => {
  it("omits username when the normalized pseudo is unchanged", () => {
    const result = buildAccountSetupIdentityUpdate({
      currentUsername: "  Vert_Tige ",
      pseudo: "Vert_Tige",
      firstName: "Marie",
      lastName: "Curie",
      displayNameMode: "full_name",
    });

    expect(result.usernameChanged).toBe(false);
    expect(result.update).toEqual({ firstName: "Marie", lastName: "Curie" });
  });

  it("uses the reverification wrapper only when the pseudo changes", async () => {
    const calls: string[] = [];
    const updateUser = vi.fn(async () => {
      calls.push("identity");
    });
    const updateUserWithReverification = vi.fn(async () => {
      calls.push("reverification");
    });
    const updateActiveProfile = vi.fn(async () => {
      calls.push("activeProfile");
    });
    const saveDisplayMode = vi.fn(() => {
      calls.push("displayMode");
    });

    await persistAccountSetupChanges({
      currentUsername: "old-pseudo",
      pseudo: "new-pseudo",
      firstName: "Marie",
      lastName: "Curie",
      displayNameMode: "full_name",
      metadata: { profileSetupCompleted: true },
      initialProfile: "benevole",
      selectedProfile: "scientifique",
      updateUser,
      updateUserWithReverification,
      updateActiveProfile,
      saveDisplayMode,
    });

    expect(updateUserWithReverification).toHaveBeenCalledWith({
      username: "new-pseudo",
      firstName: "Marie",
      lastName: "Curie",
    });
    expect(updateUser).toHaveBeenCalledWith({
      unsafeMetadata: { profileSetupCompleted: true },
    });
    expect(updateUser).not.toHaveBeenCalledWith(
      expect.objectContaining({ username: expect.any(String) }),
    );
    expect(updateActiveProfile).toHaveBeenCalledWith("scientifique");
    expect(calls).toEqual([
      "reverification",
      "activeProfile",
      "displayMode",
      "identity",
    ]);
  });

  it("does not require reverification when only identity/preferences metadata change", async () => {
    const updateUser = vi.fn(async () => undefined);
    const updateUserWithReverification = vi.fn(async () => undefined);
    const updateActiveProfile = vi.fn(async () => undefined);
    const saveDisplayMode = vi.fn();

    await persistAccountSetupChanges({
      currentUsername: "same-pseudo",
      pseudo: " same-pseudo ",
      firstName: "Marie",
      lastName: "Curie",
      displayNameMode: "full_name",
      metadata: { display_name_mode: "full_name" },
      initialProfile: "benevole",
      selectedProfile: "benevole",
      updateUser,
      updateUserWithReverification,
      updateActiveProfile,
      saveDisplayMode,
    });

    expect(updateUserWithReverification).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenNthCalledWith(1, {
      firstName: "Marie",
      lastName: "Curie",
    });
    expect(updateUser).toHaveBeenNthCalledWith(2, {
      unsafeMetadata: { display_name_mode: "full_name" },
    });
  });

  it.each([
    "identity",
    "activeProfile",
    "metadata",
    "displayMode",
  ] as const)("resumes after a partial %s success without replaying completed steps", async (failedStep) => {
    const completedSteps = new Set<AccountSetupPersistenceStep>();
    let failureRaised = false;
    const failOnce = (step: AccountSetupPersistenceStep) => {
      if (failedStep === step && !failureRaised) {
        failureRaised = true;
        throw new Error(`${step} failed`);
      }
    };
    const updateUser = vi.fn(async (update: AccountSetupUserUpdate) => {
      if ("unsafeMetadata" in update) {
        failOnce("metadata");
      }
    });
    const updateUserWithReverification = vi.fn(async () => {
      failOnce("identity");
    });
    const updateActiveProfile = vi.fn(async () => {
      failOnce("activeProfile");
    });
    const saveDisplayMode = vi.fn(() => {
      failOnce("displayMode");
    });
    const runPersistence = () => persistAccountSetupChanges({
      currentUsername: failedStep === "identity" ? "old-pseudo" : "same-pseudo",
      pseudo: failedStep === "identity" ? "new-pseudo" : "same-pseudo",
      firstName: "Marie",
      lastName: "Curie",
      displayNameMode: "full_name",
      metadata: { profileSetupCompleted: true },
      initialProfile: "benevole",
      selectedProfile: failedStep === "activeProfile" ? "scientifique" : "benevole",
      updateUser,
      updateUserWithReverification,
      updateActiveProfile,
      saveDisplayMode,
      completedSteps,
    });

    await expect(runPersistence()).rejects.toThrow(`${failedStep} failed`);
    await expect(runPersistence()).resolves.toBeUndefined();

    expect(completedSteps).toEqual(new Set([
      "identity",
      "activeProfile",
      "metadata",
      "displayMode",
    ]));
    expect(updateUserWithReverification).toHaveBeenCalledTimes(failedStep === "identity" ? 2 : 0);
    expect(updateActiveProfile).toHaveBeenCalledTimes(failedStep === "activeProfile" ? 2 : 0);
    expect(updateUser.mock.calls.filter(([update]) => "unsafeMetadata" in update)).toHaveLength(
      failedStep === "metadata" ? 2 : 1,
    );
    expect(saveDisplayMode).toHaveBeenCalledTimes(failedStep === "displayMode" ? 2 : 1);
  });

  it("writes completion metadata only after display mode succeeds", async () => {
    const calls: string[] = [];
    const completedSteps = new Set<AccountSetupPersistenceStep>();
    let shouldFailDisplayMode = true;
    const updateUser = vi.fn(async (update: AccountSetupUserUpdate) => {
      calls.push("unsafeMetadata" in update ? "metadata" : "identity");
    });
    const updateUserWithReverification = vi.fn(async () => {
      calls.push("reverification");
    });
    const updateActiveProfile = vi.fn(async () => {
      calls.push("activeProfile");
    });
    const saveDisplayMode = vi.fn(async () => {
      calls.push("displayMode");
      if (shouldFailDisplayMode) {
        shouldFailDisplayMode = false;
        throw new Error("displayMode failed");
      }
    });
    const runPersistence = () => persistAccountSetupChanges({
      currentUsername: "same-pseudo",
      pseudo: "same-pseudo",
      firstName: "Marie",
      lastName: "Curie",
      displayNameMode: "full_name",
      metadata: { profileSetupCompleted: true },
      initialProfile: "benevole",
      selectedProfile: "scientifique",
      updateUser,
      updateUserWithReverification,
      updateActiveProfile,
      saveDisplayMode,
      completedSteps,
    });

    await expect(runPersistence()).rejects.toThrow("displayMode failed");
    expect(updateUser.mock.calls.filter(([update]) => "unsafeMetadata" in update)).toHaveLength(0);
    expect(completedSteps).toEqual(new Set(["identity", "activeProfile"]));

    await expect(runPersistence()).resolves.toBeUndefined();
    expect(updateUser.mock.calls.filter(([update]) => "unsafeMetadata" in update)).toHaveLength(1);
    expect(calls).toEqual([
      "identity",
      "activeProfile",
      "displayMode",
      "displayMode",
      "metadata",
    ]);
    expect(completedSteps).toEqual(new Set([
      "identity",
      "activeProfile",
      "displayMode",
      "metadata",
    ]));
  });

  it("leaves the pseudonymous user's existing names untouched", () => {
    const result = buildAccountSetupIdentityUpdate({
      currentUsername: "Vert_Tige",
      pseudo: "Vert_Tige",
      firstName: "",
      lastName: "",
      displayNameMode: "pseudo",
    });

    expect(result.update).toEqual({});
    expect(result.usernameChanged).toBe(false);
  });

  it("preserves unrelated metadata when deferring and clears it on completion", () => {
    const deferred = createAccountSetupDeferralMetadata(
      { activeProfile: "benevole", display_name_mode: "full_name" },
      3,
      "2026-09-05T12:00:00.000Z",
    );

    expect(deferred).toMatchObject({
      activeProfile: "benevole",
      profileSetupDeferred: true,
      profileSetupDeferredVersion: 3,
      profileSetupDeferredAt: "2026-09-05T12:00:00.000Z",
    });
    expect(clearAccountSetupDeferralMetadata(deferred)).toEqual({
      activeProfile: "benevole",
      display_name_mode: "full_name",
    });
  });
});
