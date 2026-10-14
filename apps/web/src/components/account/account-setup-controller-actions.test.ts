import { describe, expect, it, vi } from "vitest";
import { deferAccountSetup, submitAccountSetup } from "./account-setup-controller-actions";

type TestUser = {
  unsafeMetadata?: unknown;
  update: (update: { firstName?: string; lastName?: string }) => Promise<unknown>;
  updateMetadata: (update: { unsafeMetadata: Record<string, unknown> }) => Promise<unknown>;
};

function createActionState(user: TestUser) {
  return {
    user,
    saveInFlight: { current: false },
    setError: vi.fn(),
    setIsSaving: vi.fn(),
    navigateAfterSetup: vi.fn(),
  };
}

describe("account setup controller actions", () => {
  it("persists deferral metadata before navigating", async () => {
    const user = {
      unsafeMetadata: { existing: true },
      update: vi.fn(),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as TestUser;
    const state = createActionState(user);
    const completedPersistenceSteps = new Set<"identity" | "activeProfile" | "metadata" | "displayMode">();

    await deferAccountSetup({
      ...state,
      isDirty: false,
      completedPersistenceSteps,
      confirmDeferral: () => true,
    });

    expect(user.updateMetadata).toHaveBeenCalledWith({
      unsafeMetadata: {
        profileSetupDeferred: true,
        profileSetupDeferredVersion: expect.any(Number),
        profileSetupDeferredAt: expect.any(String),
      },
    });
    expect(state.navigateAfterSetup).toHaveBeenCalledOnce();
  });

  it("keeps the completed submission order and clears dirty state", async () => {
    const user = {
      unsafeMetadata: { legacy: true },
      update: vi.fn().mockResolvedValue(undefined),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as unknown as TestUser;
    const state = createActionState(user);
    const completedPersistenceSteps = new Set<"identity" | "activeProfile" | "metadata" | "displayMode">();
    const updateActiveProfile = vi.fn().mockResolvedValue(undefined);
    const saveDisplayMode = vi.fn();

    await submitAccountSetup({
      ...state,
      event: undefined,
      isSaving: false,
      currentStep: "location",
      onAdvance: vi.fn(),
      setSubmitAttempted: vi.fn(),
      formIsValid: true,
      selectedProfile: "benevole",
      displayNameMode: "full_name",
      activeResidence: false,
      activeWork: false,
      residence: null,
      work: null,
      trimmedFirstName: "Marie",
      trimmedLastName: "Curie",
      completedPersistenceSteps,
      setIsDirty: vi.fn(),
      updateActiveProfile,
      saveDisplayMode,
      onRetry: vi.fn(),
      onRefresh: vi.fn(),
    });

    expect(user.update).toHaveBeenCalledWith({ firstName: "Marie", lastName: "Curie" });
    expect(saveDisplayMode).toHaveBeenCalledOnce();
    expect(user.updateMetadata).toHaveBeenCalledOnce();
    expect(updateActiveProfile).toHaveBeenCalledWith("benevole");
    expect(state.navigateAfterSetup).toHaveBeenCalledOnce();
  });
});
