import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeFooter } from "./accueil-footer";

describe("HomeFooter", () => {
  it("renders the exhaustive composition on every route", () => {
    const html = renderToStaticMarkup(<HomeFooter />);

    expect(html).toContain("Politique cookies");
    expect(html).toContain("Gérer mes cookies");
    expect(html).toContain("Cultivons");
    expect(html).toContain("@cleanmymap.fr");
    expect(html).toContain('type="button"');
    expect(html).toContain("logo-grand-sombre.png");
    expect(html).toContain("cmm-ribbon-frame");
    expect(html).toContain("cmm-ribbon-text");
  });

  it("uses the centralized ribbon frame and no compact variant", () => {
    const html = renderToStaticMarkup(<HomeFooter />);
    const getFooterClass = (html: string) =>
      html.match(/<footer class="([^"]+)"/)?.[1];

    expect(getFooterClass(html)).toContain("cmm-ribbon-frame");
    expect(getFooterClass(html)).toContain("w-full");
    expect(getFooterClass(html)).toContain("min-w-0");
    expect(html).toContain("flex-nowrap");
    expect(html).toContain("basis-0 flex-1");
    expect(html).not.toContain("compact");
  });

  it("keeps contact as a text link without the contact bubble", () => {
    const html = renderToStaticMarkup(<HomeFooter />);

    expect(html).toContain('href="/contact"');
    expect(html).toContain(">Contact</span>");
    expect(html).not.toContain("Une question ? Un partenariat ? Échangeons !");
  });
});
