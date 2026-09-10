import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getNavigationSpacesForProfile } from "../../lib/navigation";

const searchSource = readFileSync(new URL("./global-search.tsx", import.meta.url), "utf8");
const dropdownSource = readFileSync(new URL("../ui/cmm-dropdown.tsx", import.meta.url), "utf8");

describe("GlobalSearch", () => {
  it("uses the shared non-modal dropdown without a viewport overlay", () => {
    expect(searchSource).toContain('import { CmmDropdown } from "@/components/ui/cmm-dropdown"');
    expect(searchSource).toContain('<CmmDropdown');
    expect(searchSource).toContain('panelRole="region"');
    expect(searchSource).toContain('triggerHasPopup="dialog"');
    expect(searchSource).toContain('panelClassName="w-[min(42rem,calc(100vw-1rem))]"');
    expect(searchSource).toContain("verticalGap={8}");
    expect(searchSource).not.toContain("fixed inset-0");
    expect(searchSource).not.toContain("bg-slate-950/88");
    expect(searchSource).not.toContain("pt-[15vh]");
    expect(searchSource).not.toContain("pt-[20vh]");
    expect(searchSource).not.toContain("CmmDialog");
    expect(searchSource).not.toContain("AnimatePresence");
    expect(dropdownSource).toContain("left: triggerCenter");
    expect(dropdownSource).toContain("max-w-[calc(100vw-1rem)]");
  });

  it("keeps the global search keyboard and navigation contract", () => {
    expect(searchSource).toContain("getNavigationSpacesForProfile");
    expect(searchSource).toContain(".slice(0, 8)");
    expect(searchSource).toContain("event.metaKey || event.ctrlKey");
    expect(searchSource).toContain('event.key === "ArrowDown"');
    expect(searchSource).toContain('event.key === "ArrowUp"');
    expect(searchSource).toContain('event.key === "Enter"');
    expect(searchSource).toContain("router.push(filteredItems[selectedIndex].href)");
    expect(searchSource).toContain('setQuery("")');
    expect(dropdownSource).toContain('event.key === "Escape"');
    expect(dropdownSource).toContain("pointerdown");
    expect(dropdownSource).toContain("triggerRef.current?.focus()");
  });

  it("derives empty-state suggestions from the accessible navigation index", () => {
    expect(searchSource).toContain(
      "const suggestedItems = useMemo(() => allItems.slice(0, 5), [allItems]);",
    );
    expect(searchSource).toContain("suggestedItems.map((item)");
    expect(searchSource).toContain("onClick={() => setQuery(item.label[locale])}");
    expect(searchSource).toContain("buildSearchItems(currentProfile, displayMode, locale)");
    expect(searchSource).not.toContain('["Carte", "Impact", "Profil", "Admin", "Aide"]');
    expect(searchSource).not.toContain('title="Rechercher (Ctrl+K)"');
    expect(searchSource).not.toContain("Quick Search System");
  });

  it("keeps profile-specific destinations out of the search index", () => {
    const itemIdsFor = (profile: "benevole" | "admin") =>
      getNavigationSpacesForProfile(profile, "exhaustif", "fr")
        .flatMap((space) => space.items)
        .map((item) => item.id);

    expect(itemIdsFor("benevole")).not.toContain("admin");
    expect(itemIdsFor("admin")).toContain("admin");
  });

  it("keeps the French footer and restrained result interaction", () => {
    expect(searchSource).toContain(">Entrée</span>");
    expect(searchSource).toContain(">Échap</span>");
    expect(searchSource).toContain("Rubrique");
    expect(searchSource).toContain("item.spaceLabel");
    expect(searchSource).toContain("item.description[locale]");
    expect(searchSource).toContain("focus-visible:ring-2 focus-visible:ring-emerald-300");
    expect(searchSource).not.toContain("translate-x-1");
    expect(searchSource).not.toContain("scale-110");
  });
});
