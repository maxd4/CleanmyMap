import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DisplayNameModeSetting } from "./display-name-mode-setting";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("DisplayNameModeSetting", () => {
  it("renders the display-name choices in French", () => {
    const markup = renderToStaticMarkup(
      <DisplayNameModeSetting
        currentMode="full_name"
        displayName="Camille"
        userId="user-1"
        locale="fr"
      />,
    );

    expect(markup).toContain("Nom affiché du compte");
    expect(markup).toContain("Nom et prénom");
    expect(markup).toContain("Aperçu actuel");
    expect(markup).not.toContain("Account display name");
  });

  it("renders the display-name choices in English", () => {
    const markup = renderToStaticMarkup(
      <DisplayNameModeSetting
        currentMode="pseudo"
        displayName="Camille"
        userId="user-1"
        locale="en"
      />,
    );

    expect(markup).toContain("Account display name");
    expect(markup).toContain("Full name");
    expect(markup).toContain("Username");
    expect(markup).toContain("Current preview");
    expect(markup).not.toContain("Nom et prénom");
  });
});
