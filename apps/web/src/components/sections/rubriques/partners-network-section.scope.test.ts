import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./partners-network-section.tsx", import.meta.url), "utf8");

describe("partners network public scope", () => {
  it("keeps the real editorial directory source explicit", () => {
    expect(source).toContain("INITIAL_ANNUAIRE_ENTRIES");
    expect(source).toContain("registre éditorial");
    expect(source).toContain("ne constitue pas une liste exhaustive");
    expect(source).toContain('href="/sections/annuaire"');
  });

  it("does not present hardcoded activity claims or illustrative collaborations", () => {
    for (const forbiddenClaim of [
      "HERO_METRICS",
      "COLLABORATIONS",
      "Partenaires actifs",
      "Actions coordonnées",
      "Impact multiple",
      "Clean Coast Challenge",
      "Mai - Juin 2024",
      "320 participants",
      "2,4x",
    ]) {
      expect(source).not.toContain(forbiddenClaim);
    }
  });

  it("keeps the integrated surface light and free of decorative motion or truncation", () => {
    expect(source).not.toMatch(/framer-motion|animate-pulse|animate-bounce/);
    expect(source).not.toContain("truncate");
    expect(source).not.toMatch(/bg-\[linear-gradient/);
  });
});
