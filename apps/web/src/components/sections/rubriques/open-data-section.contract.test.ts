import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sectionSource = readFileSync(new URL("./open-data-section.tsx", import.meta.url), "utf8");
const pageDocumentation = readFileSync(
  new URL(
    "../../../../../../documentation/pages_site/routes/04-reseau-discussions/open-data/open-data-README.md",
    import.meta.url,
  ),
  "utf8",
);
const detailedPageDocumentation = readFileSync(
  new URL(
    "../../../../../../documentation/pages_site/routes/04-reseau-discussions/open-data/open-data-presentation-detaillee.md",
    import.meta.url,
  ),
  "utf8",
);

describe("Open Data public contract", () => {
  it("describes the exposed JSON API and available formats without inventing OpenAPI docs", () => {
    expect(sectionSource).toContain("Réponse JSON de l’API publique");
    expect(sectionSource).toContain("formats JSON/CSV disponibles");
    expect(sectionSource).not.toMatch(/Swagger\s*\/\s*OpenAPI/i);
    expect(pageDocumentation).toContain("formats JSON/CSV réellement disponibles");
    expect(pageDocumentation).not.toMatch(/documentation API\/OpenAPI/i);
  });

  it("keeps the detailed presentation aligned with the public runtime", () => {
    expect(detailedPageDocumentation).toContain("page publique de présentation");
    expect(detailedPageDocumentation).toContain("`GET /api/actions/map`");
    expect(detailedPageDocumentation).toContain("JSON et CSV");
    expect(detailedPageDocumentation).toContain("surfaces de rapports");
    expect(detailedPageDocumentation).toContain("violet / blanc");
    expect(detailedPageDocumentation).toContain(
      "n’expose actuellement aucun Swagger ni document OpenAPI public",
    );
    expect(detailedPageDocumentation).not.toMatch(
      /(?:Swagger|OpenAPI).{0,30}(?:disponible|exposé|consultable|proposé)/i,
    );
    expect(detailedPageDocumentation).not.toMatch(
      /CTA\s+clairs?\s+pour\s+exporter/i,
    );
    expect(detailedPageDocumentation).not.toMatch(/export direct(?:ement)?/i);
    expect(detailedPageDocumentation).not.toMatch(/\bpink\b/i);
  });
});
