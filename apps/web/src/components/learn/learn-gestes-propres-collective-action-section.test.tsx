import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnGestesPropresCollectiveActionSection } from "./learn-gestes-propres-collective-action-section";

describe("LearnGestesPropresCollectiveActionSection", () => {
  it("renders the collective action block with real destinations", () => {
    const markup = renderToStaticMarkup(<LearnGestesPropresCollectiveActionSection locale="fr" />);

    expect(markup).toContain("Le bon geste devient visible et collectif");
    expect(markup).toContain("Action collective");
    expect(markup).toContain("Rendre le geste visible");
    expect(markup).toContain("Montrer la bonne filière");
    expect(markup).toContain("Agir avant le déchet");
    expect(markup).toContain("/sections/trash-spotter");
    expect(markup).toContain("/actions/map");
    expect(markup).toContain("/actions/new");
    expect(markup).toContain("Aucune promesse d’impact n’est avancée");
  });
});
