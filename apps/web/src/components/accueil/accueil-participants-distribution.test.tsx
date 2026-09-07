import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParticipantsDistribution } from "./accueil-participants-distribution";

describe("ParticipantsDistribution", () => {
  it("renders only positive canonical action categories and their action counts", () => {
    const html = renderToStaticMarkup(
      <ParticipantsDistribution
        distribution={[
          { key: "spontaneous:1", category: "Solo", count: 2 },
          { key: "association", category: "Association", count: 1 },
          {
            key: "student_association",
            category: "Association étudiante",
            count: 3,
          },
          { key: "other", category: "Autres", count: 2 },
          { key: "zero", category: "Sextet", count: 0 },
          { key: "company", category: "Entreprise", count: 4 },
        ]}
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain("12 actions");
    expect(html).toContain("Association");
    expect(html).toContain("Association étudiante");
    expect(html).toContain("Autres");
    expect(html).toContain("Entreprise");
    expect(html).not.toContain(">Sextet<");
    expect(html).not.toContain("Organisateur");
    expect(html).not.toContain("CleanMyMap");
  });

  it("renders an explicit neutral state without inventing categories", () => {
    const html = renderToStaticMarkup(
      <ParticipantsDistribution distribution={[]} />,
    );

    expect(html).toContain("Répartition des actions indisponible");
    expect(html).not.toContain("role=\"img\"");
    expect(html).not.toContain("Solo");
  });
});
