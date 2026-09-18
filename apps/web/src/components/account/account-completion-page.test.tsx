import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./account-setup-form", () => ({
  AccountSetupForm: () => <div data-testid="account-setup-form" />,
}));

import { AccountCompletionPage } from "./account-completion-page";

const layoutCss = readFileSync(new URL("../../styles/layout.css", import.meta.url), "utf8");

describe("AccountCompletionPage", () => {
  it("stays in the main document flow instead of covering global chrome", () => {
    const markup = renderToStaticMarkup(
      <AccountCompletionPage
        initialProfile="benevole"
        clerkReachable
      />,
    );

    expect(markup).toContain('data-testid="account-setup-form"');
    expect(markup).not.toContain("fixed inset-0");
    expect(markup).not.toContain("z-[150]");
  });

  it("uses the shared height-responsive onboarding density contract", () => {
    expect(layoutCss).toContain("min-block-size: min(100%, 100dvh)");
    expect(layoutCss).toContain("--cmm-account-setup-page-padding-block: clamp");
    expect(layoutCss).toContain("@media (min-width: 1024px) and (max-height: 900px)");
    expect(layoutCss).toContain("@media (min-width: 1024px) and (max-height: 760px)");
  });
});
