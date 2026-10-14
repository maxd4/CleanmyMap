import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./account-settings-editor.tsx", import.meta.url), "utf8");

describe("canonical account settings editor", () => {
  it("keeps the five account sections and targeted persistence owners", () => {
    expect(source).toContain("Informations personnelles");
    expect(source).toContain("Identité publique");
    expect(source).toContain("Localisation");
    expect(source).toContain("Préférences");
    expect(source).toContain("Sécurité et données");
    expect(source).toContain("/api/account/identity");
    expect(source).toContain("/api/account/locations");
    expect(source).toContain("/api/users/profile/handle");
    expect(source).toContain("/api/users/profile/display-name-mode");
  });

  it("keeps public identity previews and privacy wording visible", () => {
    expect(source).toContain("Aperçu réellement utilisé");
    expect(source).toContain("ne rend pas automatiquement vos contributions anonymes");
    expect(source).not.toContain("GRANTED_ROLE");
  });

  it("keeps location removal independent and exposes retryable status states", () => {
    expect(source).toContain("setLocations((current) => ({ ...current, [kind]: null }))");
    expect(source).toContain('"pending"');
    expect(source).toContain('role={state === "error" ? "alert" : "status"}');
  });
});
