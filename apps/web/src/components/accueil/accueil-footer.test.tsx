import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
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
    expect(html).toContain('aria-label="Pied de page"');
    expect(html).toContain("Informations");
    expect(html).toContain('aria-label="Contacter CleanMyMap"');
    expect(html).toContain('aria-label="Instagram CleanMyMap"');
    expect(html).toContain('aria-label="GitHub CleanMyMap"');
    expect(html).not.toMatch(/<footer[^>]*role="region"/);
    expect(html).not.toContain("cmm-footer-scroll");
    expect(html).not.toContain("tabindex=");
  });

  it("uses one desktop/tablet row with a container-driven compact contract", () => {
    const html = renderToStaticMarkup(<HomeFooter />);
    const getFooterClass = (html: string) =>
      html.match(/<footer[^>]*class="([^"]+)"/)?.[1];
    const layoutCss = readFileSync(
      new URL("../../styles/layout.css", import.meta.url),
      "utf8",
    );

    expect(getFooterClass(html)).toContain("cmm-ribbon-frame");
    expect(getFooterClass(html)).toContain("w-full");
    expect(getFooterClass(html)).toContain("min-w-0");
    expect(html).toContain("cmm-footer-row");
    expect(html).toContain("cmm-footer-contact-actions");
    expect(html).toContain("cmm-footer-legal-links");
    expect(html).toContain("cmm-footer-signature");
    expect(html.match(/cmm-footer-contact-link/g)).toHaveLength(3);
    expect(html).toContain('href="https://github.com/maxd4/CleanMyMap"');
    expect(layoutCss).toContain(".cmm-footer-row");
    expect(layoutCss).toContain("flex-wrap: nowrap");
    expect(layoutCss).toContain("container-type: inline-size");
    expect(layoutCss).toContain("@container (max-width: 90rem)");
    expect(layoutCss).toContain(".cmm-footer-information");
    expect(layoutCss).toContain("list-style: none");
    expect(layoutCss).toContain("@media (max-width: 639px)");
    expect(layoutCss).not.toContain("min-width: max-content");
    expect(layoutCss).not.toContain("overflow-x: auto");
    expect(layoutCss).not.toContain(".cmm-footer-scroll");
  });

  it("preserves the complete legal and contact navigation", () => {
    const html = renderToStaticMarkup(<HomeFooter />);

    expect(html).toContain('href="/contact"');
    expect(html).toMatch(/href="mailto:[^"]+"/);
    expect(html).toContain('href="https://instagram.com/cleanmymap.fr"');
    expect(html).toContain('href="https://github.com/maxd4/CleanMyMap"');
    expect(html).toContain('href="/mentions-legales"');
    expect(html).toContain('href="/conditions-generales-utilisation"');
    expect(html).toContain('href="/politique-confidentialite"');
    expect(html).toContain('href="/politique-cookies"');
    expect(html).toContain("Gérer mes cookies");
  });

  it("keeps contact as a text link without the contact bubble", () => {
    const html = renderToStaticMarkup(<HomeFooter />);

    expect(html).toContain('href="/contact"');
    expect(html).toContain(">Contact</span>");
    expect(html).not.toContain("Une question ? Un partenariat ? Échangeons !");
  });
});
