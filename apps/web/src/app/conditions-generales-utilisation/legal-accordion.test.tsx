import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalAccordion } from "./legal-accordion";

describe("LegalAccordion", () => {
  it("keeps the public wrapper on the canonical native disclosure", () => {
    const markup = renderToStaticMarkup(
      <LegalAccordion title="Article 1">
        <p>Contenu légal conservé.</p>
      </LegalAccordion>,
    );

    expect(markup).toContain("<details");
    expect(markup).toContain('data-disclosure-tone="slate"');
    expect(markup).toContain('data-disclosure-size="lg"');
    expect(markup).toContain("Article 1");
    expect(markup).toContain("Contenu légal conservé.");
    expect(markup).not.toContain("data-hover-toggle");
    expect(markup).not.toContain("Plus");
    expect(markup).not.toContain("Minus");
  });
});
