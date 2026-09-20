import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const legalDocumentation = readFileSync(
  new URL("../../../../../documentation/legal/conditions-generales-utilisation.md", import.meta.url),
  "utf8",
);

describe("CGU contribution Stripe contract", () => {
  it("documents voluntary contributions without inventing a tax benefit", () => {
    for (const source of [publicPage, legalDocumentation]) {
      expect(source).toContain("Stripe");
      expect(source).toMatch(/reçu\s+fiscal/iu);
      expect(source).toMatch(/réduction\s+fiscale/iu);
      expect(source).toMatch(/mécénat\s+fiscal/iu);
      expect(source).toMatch(/contribution[\s\S]{0,180}(matériel|développement)/iu);
    }

    expect(publicPage).not.toMatch(/réduction\s+fiscale[^.]{0,80}(possible|disponible|bénéficier)/iu);
    expect(legalDocumentation).not.toMatch(/réduction\s+fiscale[^.]{0,80}(possible|disponible|bénéficier)/iu);
  });

  it("keeps the refund wording aligned with the implemented boundary", () => {
    for (const source of [publicPage, legalDocumentation]) {
      expect(source).toContain("remboursement");
      expect(source).toContain("webhook");
      expect(source).toContain("contact");
    }
  });
});
