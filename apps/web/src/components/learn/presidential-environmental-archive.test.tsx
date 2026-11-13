/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const testLocale = vi.hoisted(() => ({ value: "fr" as "fr" | "en" }));

vi.mock("server-only", () => ({}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: testLocale.value }),
}));

import { PresidentialEnvironmentalArchive } from "./presidential-environmental-archive";
import { getPublicPresidentialArchive, PRESIDENTIAL_ENVIRONMENTAL_CORPUS, type PresidentialEnvironmentalClassification, type PresidentialPublicCommitment } from "@/lib/learning/policies/presidential-environmental-corpus";

const presidentialArchive = getPublicPresidentialArchive();
const classifiedArchive = {
  ...presidentialArchive,
  validatedCommitments: (["favorable", "unfavorable", "mixed", "neutral", "undetermined"] as PresidentialEnvironmentalClassification[]).map((classification, index) => {
    const publicCommitment = { ...PRESIDENTIAL_ENVIRONMENTAL_CORPUS.commitments[index] };
    Reflect.deleteProperty(publicCommitment, "validation");
    return {
      ...publicCommitment,
      id: `${publicCommitment.id}-classified-${classification}`,
      deduplicationKey: `${publicCommitment.deduplicationKey}-classified-${classification}`,
      environmentalAssessment: {
        overallClassification: classification,
        intent: { fr: "Intention revue", en: "Reviewed intent" },
        expectedEffect: { fr: "Effet attendu documenté", en: "Documented expected effect" },
        observedEffect: null,
        reviewedAt: "2026-11-13",
        reviewedBy: "Human editor",
        domains: {},
      },
    } as PresidentialPublicCommitment;
  }),
};

describe("PresidentialEnvironmentalArchive", () => {
  it("shows both official rosters and their source origin without leaking unreviewed measures", () => {
    const markup = renderToStaticMarkup(<PresidentialEnvironmentalArchive {...presidentialArchive} />);

    expect(markup).toContain("Archives présidentielles");
    expect(markup).toContain("2012");
    expect(markup).toContain("2017");
    expect(markup).toContain("2022");
    expect(markup).toContain("2027");
    expect(markup).toContain("Source de la liste officielle");
    expect(markup).toContain("Résultat officiel et mandat");
    expect(markup).toContain("Mandat 2012–2017 · Mandat terminé");
    expect(markup).toContain("Élu");
    expect(markup).toContain("border-blue-400");
    expect(markup.indexOf("François Hollande")).toBeLessThan(markup.indexOf("Nicolas Sarkozy"));
    expect(markup).toContain("Ministère de l’Intérieur");
    expect(markup).toContain("Filtrer les engagements par candidat");
    expect(markup).toContain("Filtrer par niveau de documentation");
    expect(markup).toContain("Par thème");
    expect(markup).toContain("Par candidature");
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Année du scrutin"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain("sm:grid-cols-2");
    expect(markup).toContain("Corpus non encore collecté");
    expect(markup).toContain("Aucun engagement validé n’est affiché");
    expect(markup).toContain("ne signifie pas l’absence de position");
    expect(markup).not.toContain("Porter la part du nucléaire à 50 % en 2025");
    expect(markup).not.toContain("100 % d’énergies renouvelables dès que possible");
  });

  it("keeps elected labels and mandate status localized", () => {
    testLocale.value = "en";
    const markup = renderToStaticMarkup(<PresidentialEnvironmentalArchive {...presidentialArchive} />);

    expect(markup).toContain("Official result and term");
    expect(markup).toContain("Term 2012–2017 · Term completed");
    expect(markup).toContain("Elected");
    expect(markup).not.toContain("Élu");
    testLocale.value = "fr";
  });

  it("renders transparent classification sections without merging the five categories", () => {
    const markup = renderToStaticMarkup(<PresidentialEnvironmentalArchive {...classifiedArchive} />);

    expect(markup).toContain("Effets favorables");
    expect(markup).toContain("Effets défavorables");
    expect(markup).toContain("Effets mixtes");
    expect(markup).toContain("Effets neutres");
    expect(markup).toContain("Effets non déterminés");
    expect(markup).toContain("Effet favorable");
    expect(markup).toContain("Effet défavorable");
    expect(markup).toContain("Effets mixtes");
    expect(markup).toContain("Effet neutre");
    expect(markup).toContain("Effet non déterminé");
    expect(markup).toContain("Méthodologie et analyse environnementale");
  });

  it("keeps 2027 empty and explicitly preparatory", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PresidentialEnvironmentalArchive {...presidentialArchive} />);
    });
    const yearButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "2027");
    expect(yearButton).toBeDefined();

    await act(async () => {
      yearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Présidentielle 2027 : dossier en préparation");
    expect(container.textContent).toContain("0 candidats recensés");
    expect(container.textContent).toContain("Aucun engagement validé n’est affiché pour ce millésime.");
    root.unmount();
    container.remove();
  });

  it("moves the elected candidate first for 2017 and 2022", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PresidentialEnvironmentalArchive {...presidentialArchive} />);
    });

    for (const [year, electedName, mandate] of [["2017", "Emmanuel Macron", "Mandat 2017–2022 · Mandat terminé"], ["2022", "Emmanuel Macron", "Mandat 2022–2027 · Mandat en cours"]] as const) {
      const yearButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === year);
      await act(async () => {
        yearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(container.textContent).toContain(`${electedName}`);
      expect(container.textContent).toContain(mandate);
      expect(container.querySelector("ol[aria-label^='Candidats officiels'] li")?.textContent).toContain("Élu");
    }

    root.unmount();
    container.remove();
  });

  it("does not import the complete corpus or select publication in the client component", () => {
    const source = readFileSync(join(process.cwd(), "src/components/learn/presidential-environmental-archive.tsx"), "utf8");

    expect(source).not.toContain("PRESIDENTIAL_ENVIRONMENTAL_CORPUS");
    expect(source).not.toContain("getPresidentialCandidates");
    expect(source).not.toContain("getPresidentialElection");
    expect(source).not.toContain("getValidatedPresidentialCommitments");
  });
});
