import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/account/account-completion-modal", () => ({
  AccountCompletionPage: () => <div data-testid="account-completion-page" />,
}));

import { AccountCompletionGate } from "./account-completion-gate";

const incompleteState = {
  requirement: {
    requiresSetup: true,
    setupCompleted: false,
    createdAt: null,
    setupVersion: null,
    reason: "initial_setup" as const,
  },
  role: "benevole" as const,
  currentProfile: "benevole" as const,
  clerkReachable: true,
  isLocalHost: true,
  initialArrondissement: null,
  initialLocationType: null,
};

describe("AccountCompletionGate", () => {
  it("keeps an unrelated page available and adds a non-blocking reminder", () => {
    const markup = renderToStaticMarkup(
      <AccountCompletionGate state={incompleteState}>
        <main data-testid="business-page">Fonction métier</main>
      </AccountCompletionGate>,
    );

    expect(markup).toContain('data-testid="account-completion-reminder"');
    expect(markup).toContain('data-testid="business-page"');
    expect(markup).not.toContain('data-testid="account-completion-page"');
    expect(markup).toContain('href="/onboarding"');
  });

  it("retains an explicit blocking mode for a proven functional invariant", () => {
    const markup = renderToStaticMarkup(
      <AccountCompletionGate state={incompleteState} mode="required">
        <main data-testid="business-page">Fonction métier</main>
      </AccountCompletionGate>,
    );

    expect(markup).toContain('data-testid="account-completion-page"');
    expect(markup).not.toContain('data-testid="business-page"');
  });
});
