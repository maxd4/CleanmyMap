import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeNavigationSchema } from "./accueil-navigation-schema";

describe("HomeNavigationSchema", () => {
  it("keeps the compact navigation section readable without numbered controls", () => {
    const html = renderToStaticMarkup(<HomeNavigationSchema />);

    expect(html).toContain('data-homepage-section="navigation"');
    expect(html).toContain("bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-600 bg-clip-text");
    expect(html).toContain("L&#x27;union fait la force");
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("text-black");
    expect(html).toContain("text-[var(--action-critical-bg)]");
    expect(html).not.toMatch(/>\s*[1-4]\s*<\/span>/);

    for (const href of [
      "/actions/map",
      "/sections/route",
      "/methodologie",
      "/sections/open-data",
      "https://github.com/maxd4/CleanMyMap",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
