import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { HomeFooter } from "./accueil-footer";

describe("HomeFooter cookie preferences", () => {
  it.each(["compact", "full"] as const)(
    "renders a permanent manage-cookies control in the %s footer",
    (variant) => {
      const html = renderToStaticMarkup(<HomeFooter variant={variant} />);

      expect(html).toContain("Politique cookies");
      expect(html).toContain("Gérer mes cookies");
      expect(html).toContain('type="button"');
      expect(html).toContain("logo-grand-sombre.png");
    },
  );

  it("uses the same full-width ribbon for both footer variants", () => {
    const compactHtml = renderToStaticMarkup(<HomeFooter variant="compact" />);
    const fullHtml = renderToStaticMarkup(<HomeFooter variant="full" />);
    const getFooterClass = (html: string) =>
      html.match(/<footer class="([^"]+)"/)?.[1];

    expect(getFooterClass(compactHtml)).toBe(getFooterClass(fullHtml));
    expect(getFooterClass(fullHtml)).toContain("w-full");
    expect(getFooterClass(fullHtml)).toContain("max-w-full");
    expect(getFooterClass(fullHtml)).toContain("min-w-0");
  });

  it("keeps contact as a text link without the contact bubble", () => {
    const html = renderToStaticMarkup(<HomeFooter variant="full" />);

    expect(html).toContain('href="/contact"');
    expect(html).toContain(">Contact</span>");
    expect(html).not.toContain("Une question ? Un partenariat ? Échangeons !");
  });
});
