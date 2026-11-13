import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GreaterParisSelect } from "./greater-paris-select";

describe("GreaterParisSelect", () => {
  it("preserves the public selector façade and arrondissement choices", () => {
    const markup = renderToStaticMarkup(
      <GreaterParisSelect
        value={{
          country: "FR",
          level: "arrondissement",
          label: "Marseille 1er arrondissement",
          subtitle: "Mairie de secteur",
          arrondissement: 1,
          arrondissementCity: "Marseille",
        }}
        onChange={vi.fn()}
        appearance="light"
      />,
    );

    expect(markup).toContain("Territoire");
    expect(markup).toContain("Paris");
    expect(markup).toContain("Lyon");
    expect(markup).toContain("Marseille");
    expect(markup).toContain("Marseille 1er arrondissement");
  });

  it("keeps compact mode as a single search control", () => {
    const markup = renderToStaticMarkup(
      <GreaterParisSelect
        value={null}
        onChange={vi.fn()}
        compact
        placeholder="Rechercher une commune"
      />,
    );

    expect(markup).toContain('placeholder="Rechercher une commune"');
    expect(markup).not.toContain("Niveau de territoire");
  });

  it("exposes an ISO country control and keeps a foreign selection", () => {
    const markup = renderToStaticMarkup(
      <GreaterParisSelect
        value={{
          country: "CA",
          level: "province",
          label: "Québec",
          subtitle: "Canada",
          arrondissement: null,
          arrondissementCity: null,
        }}
        onChange={vi.fn()}
        appearance="light"
      />,
    );

    expect(markup).toContain("Code pays ISO 3166-1");
    expect(markup).toContain('value="CA"');
    expect(markup).toContain("Localité");
    expect(markup).toContain("Québec");
  });
});
