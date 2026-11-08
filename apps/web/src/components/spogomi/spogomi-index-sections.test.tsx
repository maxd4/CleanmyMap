import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiUnderstanding } from "./spogomi-index-sections";

const copy: Record<string, string> = {
  "understanding.title": "Comprendre SPOGOMI",
  "understanding.description": "Formats des compétitions, règlement et sécurité.",
  "understanding.rulesTitle": "Règlement & sécurité",
  "understanding.rulesDescription": "Une épreuve se déroule dans une zone délimitée.",
  "understanding.rulesCasual": "Format général : équipes de 2 à 5.",
  "understanding.rulesWorldCup": "World Cup : équipes de 3.",
  "understanding.rulesSafety": "Sécurité : marche obligatoire.",
  "understanding.rulesSanctions": "Sanctions : pénalités et disqualification.",
  "understanding.rulesHistoricalExamplesTitle": "Exemples historiques sourcés",
  "understanding.rulesHistoricalExampleNice": "Nice — 16/03/2024 : Casual, 80 participants et 203 kg.",
  "understanding.rulesHistoricalExampleParis": "Paris — 26/04/2025 : collecte de 15 h à 16 h, puis tri et pesée.",
  "understanding.rulesHistoricalExampleBobigny": "Bobigny — 24/05/2025 : 28 équipes, 349,7 kg, victoire de MML.",
  "understanding.rulesPrivacyNote": "Note confidentialité : les données nominatives restent privées.",
};

describe("SpogomiUnderstanding", () => {
  it("renders sourced rules and historical examples inside the existing disclosure", () => {
    const markup = renderToStaticMarkup(<SpogomiUnderstanding t={(key) => copy[key] ?? key} />);

    expect(markup.match(/<details/g)).toHaveLength(3);
    expect(markup).toContain("Format général : équipes de 2 à 5.");
    expect(markup).toContain("World Cup : équipes de 3.");
    expect(markup).toContain("Sécurité : marche obligatoire.");
    expect(markup).toContain("Sanctions : pénalités et disqualification.");
    expect(markup).toContain("Note confidentialité : les données nominatives restent privées.");
    expect(markup).toContain("Exemples historiques sourcés");
    expect(markup).toContain("https://www.artema-network.com/spogomi-nice");
    expect(markup).toContain("https://www.artema-network.com/ja/about-1-1");
    expect(markup).toContain("https://en.nf-spogomiwc.com/country/france/");
    expect(markup).not.toContain(" open");
  });
});
