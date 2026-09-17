import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UserIdentity } from "@/lib/authz";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
  useUser: () => ({ user: null }),
}));

import { AccountUserBubble } from "./app-navigation-ribbon-account";

describe("AccountUserBubble", () => {
  it("shows the application handle when Clerk username is absent", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AccountUserBubble, {
        user: {
          username: null,
          firstName: null,
          lastName: null,
        } as never,
        identity: {
          username: null,
          handle: "user_public",
          displayName: "Membre",
          currentLevel: 1,
        } as UserIdentity,
        activityStatus: "active",
        isUpdatingActivityStatus: false,
        activityStatusError: null,
        onActivityStatusChange: () => undefined,
      }),
    );

    expect(markup).toContain("user_public");
    expect(markup).not.toContain("private@example.org");
  });
});
