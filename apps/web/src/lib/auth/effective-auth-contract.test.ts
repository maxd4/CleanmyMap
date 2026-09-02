import { describe, expect, it } from "vitest";
import {
  INACTIVE_LOCAL_DEV_AUTH,
  mergeEffectiveAuthState,
} from "./effective-auth-contract";

describe("mergeEffectiveAuthState", () => {
  it("treats the official local bypass as signed in without Clerk session data", () => {
    const state = mergeEffectiveAuthState(
      { isLoaded: true, isSignedIn: false },
      { active: true, role: "benevole" },
    );

    expect(state).toEqual({
      isLoaded: true,
      isSignedIn: true,
      isDevBypass: true,
    });
    expect(state).not.toHaveProperty("token");
    expect(state).not.toHaveProperty("userId");
  });

  it("keeps Clerk as the only authority when the local bypass is inactive", () => {
    expect(
      mergeEffectiveAuthState(
        { isLoaded: false, isSignedIn: false },
        INACTIVE_LOCAL_DEV_AUTH,
      ),
    ).toEqual({
      isLoaded: false,
      isSignedIn: false,
      isDevBypass: false,
    });

    expect(
      mergeEffectiveAuthState(
        { isLoaded: true, isSignedIn: true },
        INACTIVE_LOCAL_DEV_AUTH,
      ),
    ).toEqual({
      isLoaded: true,
      isSignedIn: true,
      isDevBypass: false,
    });
  });
});
