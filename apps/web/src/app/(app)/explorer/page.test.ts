import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("explorer summary presentation contract", () => {
  it("uses the concise bilingual subtitle without a generic card CTA", () => {
    expect(source).toContain("CleanMyMap en un coup d'œil");
    expect(source).toContain("CleanMyMap at a glance");
    expect(source).not.toContain('"Ouvrir"');
    expect(source).not.toContain('"Open"');
    expect(source).not.toContain("firstHref");
    expect(source).not.toContain("ArrowRight");
    expect(source).not.toContain("cta:");
  });

  it("keeps profile-aware navigation items directly clickable", () => {
    expect(source).toContain("getNavigationSpacesForProfile(");
    expect(source).toContain("displayModePreference.displayMode");
    expect(source).toContain("items: space.items.filter((item) => item.href !== EXPLORER_ROUTE)");
    expect(source).toContain('href={item.href}');
    expect(source).toContain("text-[21px]");
    expect(source).toContain("text-[14px] font-semibold");
    expect(source).toContain("grid-cols-1");
    expect(source).toContain("sm:grid-cols-2");
    expect(source).toContain("lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]");
    expect(source).toContain("whitespace-nowrap");
    expect(source).toContain("lg:p-4");
    expect(source).toContain("lg:items-stretch");
    expect(source).toContain("lg:h-full");
    expect(source).toContain("lg:hover:-translate-y-0.5");
    expect(source).toContain("lg:hover:brightness-105");
    expect(source).toContain("motion-reduce:transform-none");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("focus-visible:outline-2");
    expect(source).not.toContain("xl:flex-nowrap");
  });

  it("uses the canonical accueil preview ordering", () => {
    expect(source).toContain('import { sortItemsForPreview } from "@/lib/accueil/navigation";');
    expect(source).toContain("sortItemsForPreview(space.id, space.items)");
    expect(source).not.toContain("const BLOCK_PREVIEW_PRIORITY");
    expect(source).not.toContain("function getOrderedPreviewItems");
  });
});
