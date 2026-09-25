import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveSignalementCoordinate } from "./signalement-page.utils";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("canonical Trash Spotter entry coordinates", () => {
  it("accepts valid map coordinates and ignores invalid values", () => {
    expect(resolveSignalementCoordinate("48.8566", -90, 90)).toBe(48.8566);
    expect(resolveSignalementCoordinate(["2.3522"], -180, 180)).toBe(2.3522);
    expect(resolveSignalementCoordinate("not-a-coordinate", -90, 90)).toBeNull();
    expect(resolveSignalementCoordinate("181", -180, 180)).toBeNull();
  });

  it("publishes the public signalement intent in the primary heading", () => {
    expect(pageSource).toContain('title="Signaler un déchet ou l’état d’un lieu"');
    expect(pageSource).toContain(
      'subtitle="Décrivez l’état observé : pollution constatée ou lieu constaté propre. Votre observation alimente la cartographie citoyenne."',
    );
    expect(pageSource).toContain('href="/sections/trash-spotter"');
    expect(pageSource).toContain("Consulter les signalements");
  });
});
