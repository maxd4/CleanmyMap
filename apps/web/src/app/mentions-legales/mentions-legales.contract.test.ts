import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const legalDocumentation = readFileSync(
  new URL("../../../../../documentation/legal/README.md", import.meta.url),
  "utf8",
);
const pageSheet = readFileSync(
  new URL(
    "../../../../../documentation/pages_site/routes/07-legal/mentions-legales/mentions-legales-README.md",
    import.meta.url,
  ),
  "utf8",
);
const privacyPage = readFileSync(
  new URL("../politique-confidentialite/page.tsx", import.meta.url),
  "utf8",
);
const privacyDocumentation = readFileSync(
  new URL("../../../../../documentation/legal/politique-confidentialite.md", import.meta.url),
  "utf8",
);

const legalSurfaces = [publicPage, legalDocumentation, pageSheet];

describe("mentions légales contract", () => {
  it("keeps the confirmed non-professional publisher status aligned", () => {
    for (const source of legalSurfaces) {
      expect(source).toContain("Maxence Deroome");
      expect(source).toMatch(/personne physique éditant à titre\s+non professionnel/iu);
      expect(source).toContain("projet étudiant");
      expect(source).not.toMatch(/association loi 1901/iu);
      expect(source).not.toMatch(/association en cours de constitution/iu);
      expect(source).not.toMatch(/CleanMyMap\s+est\s+(?:une\s+)?(?:société|entreprise|association)/iu);
    }
  });

  it("separates publication, hosting and technical services without inventing a phone", () => {
    expect(publicPage).toContain("Édition et publication");
    expect(publicPage).toContain("Hébergement");
    expect(publicPage).toContain("Services techniques");
    expect(publicPage).toContain("Directeur de la publication");
    expect(publicPage).toContain("article 93-2");
    expect(publicPage).toContain("Vercel Inc.");
    expect(publicPage).toContain("440 N Barranca Avenue #4133");
    expect(publicPage).toContain("Covina, CA 91723");
    expect(publicPage).toContain("United States");
    expect(publicPage).not.toContain("Hébergement et services techniques");
    expect(publicPage).not.toMatch(/\b\d{10}\b/u);

    for (const service of ["Supabase", "Clerk", "Resend", "PostHog", "Sentry"]) {
      expect(publicPage).toContain(service);
    }
  });

  it("propagates the confirmed publisher status to the privacy surfaces", () => {
    for (const source of [privacyPage, privacyDocumentation]) {
      expect(source).toContain("Maxence Deroome");
      expect(source).toMatch(/personne physique éditant[\s\S]{0,120}non professionnel/iu);
      expect(source).toMatch(/Aucune\s+société,\s*entreprise,\s*association ou autre personne morale/iu);
      expect(source).not.toContain("identité juridique dépendante de LEGAL-02");
      expect(source).not.toContain("identité juridique non résolue factuellement");
    }
  });
});
