import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionRouteEntryPanel } from "./action-route-entry-panel";

describe("ActionRouteEntryPanel", () => {
  it("renders the three entry methods and the controlled description", () => {
    const markup = renderToStaticMarkup(<ActionRouteEntryPanel intent="planned" description="Boucle du parc" onDescriptionChange={vi.fn()} gpxContent={<p>Import GPX</p>} imageContent={<p>Référence privée</p>} />);
    expect(markup).toContain("Décrire");
    expect(markup).toContain("Importer GPX");
    expect(markup).toContain("Ajouter une image");
    expect(markup).toContain("Boucle du parc");
  });
});
