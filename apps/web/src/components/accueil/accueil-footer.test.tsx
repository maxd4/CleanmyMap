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

      expect(html).toContain("Gérer mes cookies");
      expect(html).toContain('type="button"');
    },
  );
});
