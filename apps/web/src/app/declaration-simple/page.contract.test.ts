import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("declaration simple UI contract", () => {
  it("keeps the page focused on the main review card and action panel", () => {
    expect(source).toContain("<PageHeader");
    expect(source).toContain('tone="emerald"');
    expect(source).toContain('href: "/form-comparison"');
    expect(source).toContain('href: "/preview/actions/new"');
    expect(source).not.toContain("Surface de support, pas de surcharge");
    expect(source).not.toContain("<LayoutGrid");
  });
});
