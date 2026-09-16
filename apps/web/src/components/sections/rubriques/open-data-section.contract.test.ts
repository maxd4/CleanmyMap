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

describe("Open Data public contract", () => {
  it("describes the exposed JSON API and available formats without inventing OpenAPI docs", () => {
    expect(sectionSource).toContain("Réponse JSON de l’API publique");
    expect(sectionSource).toContain("formats JSON/CSV disponibles");
    expect(sectionSource).not.toMatch(/Swagger\s*\/\s*OpenAPI/i);
    expect(pageDocumentation).toContain("formats JSON/CSV réellement disponibles");
    expect(pageDocumentation).not.toMatch(/documentation API\/OpenAPI/i);
  });
});
