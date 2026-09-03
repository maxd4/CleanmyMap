import { describe, expect, it, vi } from "vitest";
import {
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
});
