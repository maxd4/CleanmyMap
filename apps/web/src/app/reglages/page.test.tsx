import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("/reglages canonical settings contract", () => {
  it("keeps the page protected and redirects anonymous visitors", () => {
    expect(pageSource).toContain("getSafeAuthSession");
    expect(pageSource).toContain("if (!userId)");
    expect(pageSource).toContain('redirect("/sign-in")');
  });

  it("renders the canonical editable preferences and account controls", () => {
    expect(pageSource).toContain("<AccountSettingsEditor");
    expect(pageSource).toContain("extractLocationPreferencesFromMetadata");
    expect(pageSource).not.toContain("Section réservée pour une prochaine phase");
  });

  it("keeps the metadata limited to settings actually managed on the page", () => {
    expect(pageSource).toContain(
      'metadataDescription:\n      "Modifiez vos informations personnelles, votre identité publique, vos localisations et vos préférences CleanMyMap.",',
    );
    expect(pageSource).toContain(
      '"Manage your personal information, public identity, locations and CleanMyMap preferences."',
    );
    expect(pageSource).toMatch(/AccountSettingsEditor/);
  });

  it("keeps the settings surface on the documented sky/slate palette", () => {
    expect(pageSource).toContain("bg-[radial-gradient");
    expect(pageSource).not.toContain("bg-amber-50/70");
  });

  it("keeps localisation editable without redirecting to onboarding", () => {
    expect(pageSource).not.toContain('href="/onboarding/localisation"');
  });
});
