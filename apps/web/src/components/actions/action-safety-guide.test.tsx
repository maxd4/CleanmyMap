import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionSafetyGuide, buildActionSafetyGuideText } from "./action-safety-guide";

describe("action safety guide", () => {
  it("keeps essential rules visible and the accessible full guide in a native disclosure", () => {
    const html = renderToStaticMarkup(<ActionSafetyGuide categories={[]} />);

    expect(html).toContain("Guide de sécurité et de collecte");
    expect(html).toContain("Rester avec le groupe");
    expect(html).toContain("ne jamais aller sur la chaussée");
    expect(html).toContain("<details");
    expect(html).toContain("Consulter le guide complet");
    expect(html).toContain("Déchets ramassables");
    expect(html).toContain("bonbonnes et récipients sous pression");
    expect(html).not.toContain("adultes référents identifiés");
    expect(html).not.toContain("pas des obligations légales universelles");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).not.toContain('open=""');
  });

  it("can show shared essentials outside a panel and category guidance inside it", () => {
    const essentials = renderToStaticMarkup(
      <ActionSafetyGuide categories={["plastic"]} displayMode="essentials" />,
    );
    const details = renderToStaticMarkup(
      <ActionSafetyGuide categories={["plastic"]} displayMode="details" />,
    );

    expect(essentials).toContain("Consignes essentielles de sécurité et de collecte");
    expect(essentials).toContain("Ne pas toucher aux objets dangereux");
    expect(essentials).not.toContain("Consulter le guide complet");
    expect(details).toContain("Consulter le guide complet");
    expect(details).toContain("Bouteille et emballage plastique");
    expect(details).not.toContain("Ne pas toucher aux objets dangereux");
  });

  it("does not infer a school group from an organizer label alone", () => {
    const html = renderToStaticMarkup(<ActionSafetyGuide categories={[]} />);
    const confirmedSchoolHtml = renderToStaticMarkup(
      <ActionSafetyGuide categories={[]} schoolContextConfirmed />,
    );

    expect(html).not.toContain("Pour un contexte scolaire confirmé");
    expect(confirmedSchoolHtml).toContain("Pour un contexte scolaire confirmé");
    expect(confirmedSchoolHtml).toContain("pas des obligations légales universelles");
  });

  it("uses catalog pickup policies for ordinary, trained-only and no-pickup categories", () => {
    const html = renderToStaticMarkup(<ActionSafetyGuide categories={["plastic", "broken_glass", "sharps"]} />);

    expect(html).toContain("Plastique : Bouteille et emballage plastique");
    expect(html).toContain("Verre cassé : réservé aux personnes formées et équipées");
    expect(html).toContain("Seringue ou aiguille à risque : ne pas ramasser.");
    expect(html).toContain("Gants anti-coupure et contenant rigide adapté");
    expect(html).toContain("Ne pas toucher, recapuchonner ou mettre dans un sac ordinaire.");
  });

  it("keeps legacy and copied briefings useful without expected categories", () => {
    const text = buildActionSafetyGuideText(undefined);

    expect(text).toContain("Aucune catégorie sûre n’est déclarée");
    expect(text).toContain("Un objet inconnu ou suspect reste sur place");
    expect(text).toContain("règles locales restent prioritaires");
  });

  it("localizes the public guide and expands only when explicitly requested", () => {
    const closed = renderToStaticMarkup(<ActionSafetyGuide categories={["plastic"]} locale="en" />);
    const open = renderToStaticMarkup(<ActionSafetyGuide categories={["plastic"]} defaultOpen />);

    expect(closed).toContain("Safety and collection guide");
    expect(closed).toContain("Plastic : Plastic bottle and packaging");
    expect(closed).not.toContain('open=""');
    expect(open).toContain('<details open=""');
  });

  it("keeps section names independently associated when several actions appear together", () => {
    const html = renderToStaticMarkup(
      <>
        <ActionSafetyGuide categories={["plastic"]} />
        <ActionSafetyGuide categories={["sharps"]} />
      </>,
    );
    const titleIds = [...html.matchAll(/<h3 id="([^"]+)"/g)].map((match) => match[1]);

    expect(titleIds).toHaveLength(2);
    expect(new Set(titleIds).size).toBe(2);
    for (const id of titleIds) expect(html).toContain(`aria-labelledby="${id}"`);
  });
});
