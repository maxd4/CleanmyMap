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
  it("keeps the root main as the only main landmark on public descendants", () => {
    expect(countMainElements(rootLayout)).toBe(1);

    for (const relativePath of publicDescendantFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      expect(countMainElements(source), relativePath).toBe(0);
    }
  });
});
