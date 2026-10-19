import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rootLayout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

const publicDescendantFiles = [
  "./page.tsx",
  "./contact/page.tsx",
  "./mentions-legales/page.tsx",
  "./conditions-generales-utilisation/page.tsx",
  "./politique-confidentialite/page.tsx",
  "./politique-cookies/page.tsx",
  "./signaler-contenu-illicite/page.tsx",
  "./(app)/actions/map/page.tsx",
  "./(app)/actions/map/page-client.tsx",
  "./(app)/actions/map/loading.tsx",
  "../components/layout/app-shell-surface.tsx",
] as const;

function countMainElements(source: string): number {
  return source.match(/<main\b/g)?.length ?? 0;
}

describe("public HTML landmarks", () => {
  it("provides a keyboard skip link targeting the stable root main", () => {
    const skipLinkPosition = rootLayout.indexOf('<a\n                href="#main-content"');
    const rootLayoutChromePosition = rootLayout.indexOf("<RootLayoutChrome />");
    const mainPosition = rootLayout.indexOf('<main\n                id="main-content"');

    expect(skipLinkPosition).toBeGreaterThanOrEqual(0);
    expect(rootLayoutChromePosition).toBeGreaterThan(skipLinkPosition);
    expect(mainPosition).toBeGreaterThan(rootLayoutChromePosition);
    expect(rootLayout).toContain('href="#main-content"');
    expect(rootLayout).toContain("Aller au contenu principal");
    expect(rootLayout).toContain('id="main-content"');
    expect(rootLayout).toContain("tabIndex={-1}");
    expect(rootLayout).toContain("focus-visible:translate-y-0");
    expect(rootLayout).toContain("focus-visible:outline-2");
  });

  it("keeps the root main as the only main landmark on public descendants", () => {
    expect(countMainElements(rootLayout)).toBe(1);

    for (const relativePath of publicDescendantFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(countMainElements(source), relativePath).toBe(0);
    }
  });
});
