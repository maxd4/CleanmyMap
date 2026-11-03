// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WasteCharacterizationSelector, type WasteCharacterizationFormValues } from "./waste-characterization-selector";
import { ACTION_WASTE_CHARACTERIZATION_SLUGS } from "@/lib/waste";
import type { WasteCategorySlug } from "@/lib/waste";

function renderSelector(overrides: Partial<React.ComponentProps<typeof WasteCharacterizationSelector>> = {}) {
  return renderToStaticMarkup(
    <WasteCharacterizationSelector
      categories={[]}
      characterizationKg={{}}
      totalWasteKg={12}
      onCategoriesChange={() => undefined}
      onCharacterizationChange={() => undefined}
      {...overrides}
    />,
  );
}

function InteractiveSelector() {
  const [categories, setCategories] = React.useState<WasteCategorySlug[]>([]);
  const [characterizationKg, setCharacterizationKg] = React.useState<WasteCharacterizationFormValues>({});
  return (
    <WasteCharacterizationSelector
      categories={categories}
      characterizationKg={characterizationKg}
      totalWasteKg={12}
      onCategoriesChange={setCategories}
      onCharacterizationChange={setCharacterizationKg}
    />
  );
}

describe("WasteCharacterizationSelector", () => {
  it("starts collapsed and does not expose categories or mass fields", () => {
    const markup = renderSelector();

    expect(markup).toContain("Caractériser les déchets (facultatif)");
    expect(markup).not.toContain("Rechercher une catégorie");
    expect(markup).not.toContain("Plastiques et polystyrène");
    expect(markup).not.toContain("-kg");
  });

  it("exposes exactly the nine characterization rows without cigarette or nicotine categories", () => {
    const markup = renderSelector({
      categories: ["plastic", "glass", "sanitary_medical"],
      characterizationKg: { plastic: "2.5", glass: "0", sanitary_medical: "0.1" },
    });

    for (const slug of ACTION_WASTE_CHARACTERIZATION_SLUGS) {
      expect(markup).toContain(`harvest-waste-characterization-${slug}`);
    }
    expect(markup).toContain("Masse de Plastiques et polystyrène en kg");
    expect(markup).toContain("2.5");
    expect(markup).not.toContain("Mégot de cigarette");
    expect(markup).not.toContain("Sachet de nicotine");
    expect(markup).toContain("Seringues et aiguilles trouvées : ne pas ramasser, signaler.");
  });

  describe("interaction", () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      act(() => {
        root = createRoot(container);
        root.render(<InteractiveSelector />);
      });
    });

    afterEach(() => {
      act(() => root.unmount());
      document.body.replaceChildren();
      vi.restoreAllMocks();
    });

    it("keeps a selected mass through close and reopen, then removes it only after confirmation", () => {
      const panelToggle = () => container.querySelector("#harvest-waste-characterization-toggle") as HTMLInputElement;
      const plasticToggle = () => container.querySelector("#harvest-waste-characterization-plastic") as HTMLInputElement;
      const plasticMass = () => container.querySelector("#harvest-waste-characterization-plastic-kg") as HTMLInputElement;

      act(() => { panelToggle().click(); });
      act(() => { plasticToggle().click(); });
      expect(plasticMass()).not.toBeNull();
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(plasticMass()), "value")?.set;
        setter?.call(plasticMass(), "2.5");
        plasticMass().dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(plasticMass().value).toBe("2.5");

      act(() => { panelToggle().click(); });
      expect(container.querySelector("#harvest-waste-characterization-plastic-kg")).toBeNull();
      act(() => { panelToggle().click(); });
      expect(plasticMass().value).toBe("2.5");

      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      act(() => { plasticToggle().click(); });
      expect(confirm).toHaveBeenCalledOnce();
      expect(plasticMass()).not.toBeNull();

      confirm.mockReturnValue(true);
      act(() => { plasticToggle().click(); });
      expect(container.querySelector("#harvest-waste-characterization-plastic-kg")).toBeNull();
      expect(container.textContent).not.toContain("2.5");
    });
  });
});
