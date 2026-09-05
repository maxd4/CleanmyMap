import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./account-setup-form", () => ({
  AccountSetupForm: () => <div data-testid="account-setup-form" />,
}));

import { AccountCompletionPage } from "./account-completion-modal";

describe("AccountCompletionPage", () => {
  it("stays in the main document flow instead of covering global chrome", () => {
    const markup = renderToStaticMarkup(
      <AccountCompletionPage
        initialProfile="benevole"
        clerkReachable
        isLocalHost
      />,
    );

    expect(markup).toContain('data-testid="account-setup-form"');
    expect(markup).not.toContain("fixed inset-0");
    expect(markup).not.toContain("z-[150]");
  });
});
