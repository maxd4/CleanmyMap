import { describe, expect, it, vi } from "vitest";
import {
  buildAccountSetupIdentityUpdate,
  persistAccountSetupChanges,
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
      "identity",
      "displayMode",
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
});
