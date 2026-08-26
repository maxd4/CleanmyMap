import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const seedFiles = [
  "./annuaire/seed-associations.ts",
  "./annuaire/seed-entreprises.ts",
  "./annuaire/seed-evenements.ts",
  "./annuaire/seed-groupes-parole.ts",
];

const forbiddenSeedKeys =
  /\b(?:verificationStatus|qualificationStatus|recentActivityAt|impactHistory|structureStatus)\s*:/;

describe("annuaire editorial seed contract", () => {
  it("keeps validation, activity and measured-impact keys out of seed sources", () => {
    for (const relativePath of seedFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(source, relativePath).not.toMatch(forbiddenSeedKeys);
    }
  });
});
