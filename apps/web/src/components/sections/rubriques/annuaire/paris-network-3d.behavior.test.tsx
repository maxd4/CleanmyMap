// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
} from "@/lib/partners/paris-cleanwalk-network";
import {
  DEFAULT_PARIS_NETWORK_3D_FILTERS,
  computeParisNetwork3DLayout,
  filterParisNetwork,
} from "./paris-network-3d.model";

const sitePreferencesMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: sitePreferencesMock,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

import { ParisNetwork3DSection } from "./paris-network-3d-section";

describe("paris-network-3d model", () => {
  it("computes deterministic 3D cluster positions with non-zero depth", () => {
    const layoutA = computeParisNetwork3DLayout(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
    );
    const layoutB = computeParisNetwork3DLayout(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
    );

    expect(layoutA).toEqual(layoutB);
    expect(layoutA.nodes).toHaveLength(PARIS_CLEANWALK_ACTORS.length);
    expect(layoutA.edges).toHaveLength(PARIS_CLEANWALK_RELATIONS.length);
    expect(layoutA.nodes.some((n) => n.position[2] !== 0)).toBe(true);
  });

  it("filters by actor category, participation, arrondissement, equipment and relation type", () => {
    const byCategory = filterParisNetwork(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      { ...DEFAULT_PARIS_NETWORK_3D_FILTERS, category: "collectivite_mairie" },
    );
    expect(byCategory.actors.every((a) => a.category === "collectivite_mairie")).toBe(
      true,
    );

    const byArrondissement = filterParisNetwork(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      { ...DEFAULT_PARIS_NETWORK_3D_FILTERS, arrondissement: 5 },
    );
    expect(byArrondissement.actors.some((a) => a.id === "mairie-paris-5")).toBe(
      true,
    );
    expect(byArrondissement.actors.some((a) => a.id === "mairie-paris-6")).toBe(
      false,
    );

    const byEquipment = filterParisNetwork(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      { ...DEFAULT_PARIS_NETWORK_3D_FILTERS, equipment: "fournit_materiel" },
    );
    expect(byEquipment.actors.map((a) => a.id)).toEqual(["evt-paris-nettoyages"]);

    const byRelation = filterParisNetwork(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      { ...DEFAULT_PARIS_NETWORK_3D_FILTERS, relationType: "soutien_rse" },
    );
    expect(byRelation.relations.map((r) => r.id)).toEqual([
      "rel-brigade-verte-mylegitech",
    ]);
    expect(byRelation.actors.map((a) => a.id).sort()).toEqual([
      "asso-featured-1",
      "mylegitech",
    ]);

    const byPlatformRole = filterParisNetwork(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      { ...DEFAULT_PARIS_NETWORK_3D_FILTERS, ecosystemRole: "plateforme_publication" },
    );
    expect(byPlatformRole.actors.map((a) => a.id).sort()).toEqual([
      "cleanwalk-org",
      "evt-j-agis-nature",
      "evt-je-veux-aider",
    ]);
  });
});

describe("ParisNetwork3DSection UI & WebGL fallback", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    sitePreferencesMock.mockReturnValue({
      locale: "fr",
      displayMode: "exhaustif",
    });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it("renders only names at rest and opens an interactive contextual bubble on hover, click and Escape", () => {
    vi.useFakeTimers();
    const root = createRoot(container);

    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: true }));
    });

    expect(container.textContent).toContain("Réseau 3D des cleanwalks à Paris");
    expect(container.textContent).toContain(
      "WebGL indisponible sur cet appareil : affichage du repli HTML interactif complet.",
    );
    expect(container.textContent).toContain("Familles d'acteurs (clusters 3D)");
    expect(container.textContent).toContain("Brigade Verte Paris");

    // At rest: no contextual bubble dialog is open
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    // Hovering Brigade Verte Paris opens the bubble
    const allButtons = Array.from(container.querySelectorAll("button"));
    const brigadeBtn = allButtons.find((btn) =>
      btn.textContent?.includes("Brigade Verte Paris"),
    );
    expect(brigadeBtn).toBeDefined();

    act(() => {
      brigadeBtn?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    const hoverDialog = container.querySelector('[role="dialog"]');
    expect(hoverDialog).not.toBeNull();
    expect(hoverDialog?.textContent).toContain("Thomas Saint-Aubin");
    expect(hoverDialog?.textContent).toContain("Participer aux actions");
    expect(hoverDialog?.textContent).toContain("Rejoindre la communauté");

    // Moving pointer from node into the bubble keeps it open
    act(() => {
      brigadeBtn?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      hoverDialog?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(250);
    });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Leaving the bubble closes it after grace delay
    act(() => {
      hoverDialog?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      vi.advanceTimersByTime(250);
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    // Clicking Cleanwalk.org locks the bubble and omits missing public leader
    const cleanwalkOrgBtn = allButtons.find((btn) =>
      btn.textContent?.includes("Cleanwalk.org"),
    );
    expect(cleanwalkOrgBtn).toBeDefined();

    act(() => {
      cleanwalkOrgBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const lockedDialog = container.querySelector('[role="dialog"]');
    expect(lockedDialog).not.toBeNull();
    expect(lockedDialog?.textContent).toContain("Épinglé");
    expect(lockedDialog?.textContent).toContain("V2");
    expect(lockedDialog?.textContent).toContain("Plateforme de publication");
    expect(lockedDialog?.textContent).not.toContain("Référent public :");

    const officialLink = lockedDialog?.querySelector(
      'a[href="https://www.helloasso.com/associations/cleanwalk-org"]',
    );
    expect(officialLink?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(officialLink?.getAttribute("target")).toBe("_blank");

    // Escape closes the locked bubble
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    // Filter by arrondissement 5
    const arrSelect = container.querySelector(
      'select[aria-label="Filtrer par arrondissement"]',
    ) as HTMLSelectElement | null;
    expect(arrSelect).not.toBeNull();

    act(() => {
      if (arrSelect) {
        arrSelect.value = "5";
        arrSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(container.textContent).toContain(
      "Mairie du 5e arrondissement de Paris",
    );
    expect(container.textContent).not.toContain(
      "Mairie du 6e arrondissement de Paris",
    );

    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it("supports sobre display mode cleanly", () => {
    sitePreferencesMock.mockReturnValue({
      locale: "fr",
      displayMode: "sobre",
    });
    const root = createRoot(container);

    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: true }));
    });

    const section = container.querySelector("#paris-cleanwalk-network-3d");
    expect(section?.className).toContain("bg-slate-950");

    act(() => {
      root.unmount();
    });
  });
});
