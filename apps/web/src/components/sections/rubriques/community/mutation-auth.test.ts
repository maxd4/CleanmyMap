import { describe, expect, it, vi } from "vitest";
import {
  canOpenCommunityCreateForm,
  COMMUNITY_RETURN_PATH,
  redirectToCommunitySignIn,
} from "./mutation-auth";

describe("community mutation authentication", () => {
  it("redirects anonymous protected clicks to Clerk with the community return path", () => {
    const redirectToSignIn = vi.fn();

    redirectToCommunitySignIn(redirectToSignIn);

    expect(redirectToSignIn).toHaveBeenCalledWith({
      redirectUrl: COMMUNITY_RETURN_PATH,
    });
  });

  it("does not open the creation form before a loaded authenticated session", () => {
    expect(canOpenCommunityCreateForm(false, false)).toBe(false);
    expect(canOpenCommunityCreateForm(true, false)).toBe(false);
    expect(canOpenCommunityCreateForm(true, undefined)).toBe(false);
    expect(canOpenCommunityCreateForm(true, true)).toBe(true);
  });
});
