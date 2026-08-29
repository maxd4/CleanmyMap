import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cguPage = readFileSync(
  new URL("../../../app/conditions-generales-utilisation/page.tsx", import.meta.url),
  "utf8",
);
const cguDocumentation = readFileSync(
  new URL("../../../../../../documentation/legal/conditions-generales-utilisation.md", import.meta.url),
  "utf8",
);
const volunteerCharter = readFileSync(
  new URL("../../../../../../documentation/legal/charte-benevole.md", import.meta.url),
  "utf8",
);
const legalDocumentation = readFileSync(
  new URL("../../../../../../documentation/legal/README.md", import.meta.url),
  "utf8",
);
const legalSection = readFileSync(new URL("./legal-section.tsx", import.meta.url), "utf8");
const rootReadme = readFileSync(new URL("../../../../../../README.md", import.meta.url), "utf8");
const packageJson = JSON.parse(
  readFileSync(new URL("../../../../../../package.json", import.meta.url), "utf8"),
) as { license?: string };

const publicLegalSurfaces = [cguPage, cguDocumentation, volunteerCharter, legalDocumentation];

describe("contrat documentaire LEGAL-04", () => {
  it("rejette les engagements juridiques et URLs historiques", () => {
    const obsoletePatterns = [
      /association loi 1901/iu,
      /privacy shield/iu,
      /responsabilité civile professionnelle de l'association/iu,
      /bouton.{0,60}signaler.{0,60}chaque contenu/iu,
      /le projet reste distribué en open source/iu,
      /licence définitive.{0,40}choisie/iu,
    ];

    for (const source of publicLegalSurfaces) {
      expect(source.toLowerCase()).not.toContain("cleanmymap.com");
      for (const pattern of obsoletePatterns) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("conserve le domaine et les liens du service actuels", () => {
    expect(cguDocumentation).toContain("https://cleanmymap.fr");
    expect(cguPage).toContain('href="/politique-confidentialite"');
    expect(cguPage).toContain('href="/politique-cookies"');
    expect(cguPage).toContain('href="/signaler-contenu-illicite"');
    expect(cguPage).toContain('href="/contact"');
    expect(cguDocumentation).toContain("dans les limites permises par la loi");
  });

  it("décrit la charte comme un cadre de sécurité sans garanties fictives", () => {
    expect(volunteerCharter).toContain("Action créée par un utilisateur ou un organisateur tiers");
    expect(volunteerCharter).toContain("Action éventuellement organisée par CleanMyMap");
    expect(volunteerCharter).toContain("n'organise pas actuellement");
    expect(volunteerCharter).toContain("ne promet par avance");
    expect(volunteerCharter).not.toContain("responsabilité civile professionnelle");
  });

  it("ne laisse aucune carte légale sans contenu réel", () => {
    expect(legalSection).not.toContain("En cours de rédaction");
    expect(legalSection).not.toContain("Clause de responsabilité");
    expect(legalSection).not.toContain("Charte du bénévole");

    for (const href of [
      "/mentions-legales",
      "/conditions-generales-utilisation",
      "/politique-confidentialite",
      "/politique-cookies",
    ]) {
      expect(legalSection).toContain(href);
    }
  });

  it("maintient l'absence de licence de réutilisation définitive", () => {
    expect(packageJson.license).toBe("UNLICENSED");

    for (const source of [rootReadme, legalDocumentation]) {
      expect(source).toMatch(/code source est publiquement consultable/iu);
      expect(source).toMatch(/(?:aucun fichier|en l'absence de fichier) `LICENSE`/iu);
      expect(source).toMatch(/aucune licence open source définitive/iu);
      expect(source).toMatch(/aucun droit général de\s+réutilisation/iu);
      expect(source).not.toContain("Le projet reste distribué en open source");
    }
  });
});
