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
import { ParisNetwork3DBubble } from "./paris-network-3d-bubble";

const sitePreferencesMock = vi.hoisted(() => vi.fn());
const clerkUseUserMock = vi.hoisted(() => vi.fn(() => ({ user: null })));

vi.mock("@clerk/nextjs", () => ({
  useUser: clerkUseUserMock,
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: sitePreferencesMock,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
}));

import { ParisNetwork3DSection } from "./paris-network-3d-section";
import { computeClampedBubblePosition } from "./paris-network-3d-bubble";

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

    // Second click on Cleanwalk.org preserves the locked bubble
    act(() => {
      cleanwalkOrgBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      "Cleanwalk.org",
    );

    // Hovering Brigade Verte Paris while Cleanwalk.org is locked keeps Cleanwalk.org
    act(() => {
      brigadeBtn?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
      "Cleanwalk.org",
    );

    const officialLink = lockedDialog?.querySelector(
      'a[href="https://www.cleanwalk.org/"]',
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

  it("renders English UI and exercises all 5 filters plus reset", () => {
    sitePreferencesMock.mockReturnValue({
      locale: "en",
      displayMode: "minimaliste",
    });
    const root = createRoot(container);

    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: false }));
    });

    expect(container.textContent).toContain("3D network of Paris cleanwalks");
    expect(container.textContent).toContain("Actor families (3D clusters)");

    const setSelect = (label: string, value: string) => {
      const sel = container.querySelector(
        `select[aria-label="${label}"]`,
      ) as HTMLSelectElement | null;
      expect(sel).not.toBeNull();
      if (!sel) return;
      sel.value = value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    };

    act(() => {
      setSelect("Filter by actor type", "association_locale");
      setSelect("Filter by ecosystem role", "organisateur_direct");
      setSelect("Filter by audience", "benevoles");
      setSelect("Filter by equipment", "incertain");
      setSelect("Filter by relation type", "soutien_rse");
    });

    const resetBtn = container.querySelector(
      'button[aria-label="Reset 3D filters"]',
    );
    expect(resetBtn).not.toBeNull();

    act(() => {
      resetBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('button[aria-label="Reset 3D filters"]'),
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("filters by sensibilisation_prevention role and displays the new prevention actors", () => {
    sitePreferencesMock.mockReturnValue({
      locale: "en",
      displayMode: "complet",
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(<ParisNetwork3DSection />);
    });
    const roleSelect = container.querySelector(
      'select[aria-label="Filter by ecosystem role"]',
    ) as HTMLSelectElement;
    expect(roleSelect).not.toBeNull();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;
      setter?.call(roleSelect, "sensibilisation_prevention");
      roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const text = container.textContent ?? "";
    expect(text).toContain("Gestes Propres");
    expect(text).toContain("Pik Pik Environnement");
    expect(text).toContain("Zero Waste France");
    expect(text).toContain("Maison du Zéro Déchet");
    expect(text).toContain("Syctom");
    expect(text).toContain("Citeo");

    act(() => {
      root.unmount();
    });
  });

  it("renders WebGL toolbar, toggles 3D/HTML view and triggers IntersectionObserver when WebGL is available", () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({} as RenderingContext);

    let observerCallback:
      | ((entries: Array<{ isIntersecting: boolean }>) => void)
      | null = null;
    const originalIO = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class MockIO {
      constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver;

    sitePreferencesMock.mockReturnValue({
      locale: "fr",
      displayMode: "exhaustif",
    });

    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: true }));
    });

    // Trigger viewport entry via IntersectionObserver
    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    expect(
      container.querySelector('button[aria-label="Zoomer sur la scène 3D"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Dézoomer la scène 3D"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Recentrer la caméra 3D"]'),
    ).not.toBeNull();

    // Toggle to HTML view and back to 3D
    const toggleBtn = container.querySelector(
      'button[aria-label="Basculer vers la vue HTML accessible"]',
    );
    expect(toggleBtn).not.toBeNull();
    act(() => {
      toggleBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Vue HTML accessible active");

    // Hover Brigade Verte in English mode to cover English bubble branches
    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: false }));
    });
    const brigadeEnBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Brigade Verte Paris"),
    );
    act(() => {
      brigadeEnBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Join actions");
    expect(container.textContent).toContain("Official website");

    // Trigger offscreen via IntersectionObserver
    act(() => {
      observerCallback?.([{ isIntersecting: false }]);
    });

    act(() => {
      root.unmount();
    });
    getContextSpy.mockRestore();
    globalThis.IntersectionObserver = originalIO;
  });

  it("clamps bubble coordinates to container bounds on 390px and 320px mobile viewports and for tall bubbles", () => {
    // 390px mobile viewport, node near bottom-right edge
    const mobile390 = computeClampedBubblePosition({
      anchorPosition: { leftPercent: 95, topPercent: 95 },
      containerWidth: 390,
      containerHeight: 500,
      bubbleWidth: 336,
      bubbleHeight: 320,
    });
    expect(mobile390.leftPx).toBe(42); // 390 - 336 - 12
    expect(mobile390.leftPx + 336).toBeLessThanOrEqual(390 - 12);
    expect(mobile390.topPx + 320).toBeLessThanOrEqual(500 - 12);

    // 320px mobile viewport, nodes near all 4 edges
    for (const anchorPosition of [
      { leftPercent: 0, topPercent: 0 },
      { leftPercent: 100, topPercent: 0 },
      { leftPercent: 0, topPercent: 100 },
      { leftPercent: 100, topPercent: 100 },
    ]) {
      const pos = computeClampedBubblePosition({
        anchorPosition,
        containerWidth: 320,
        containerHeight: 500,
        bubbleWidth: 296,
        bubbleHeight: 300,
      });
      expect(pos.leftPx).toBeGreaterThanOrEqual(12);
      expect(pos.topPx).toBeGreaterThanOrEqual(12);
      expect(pos.leftPx + 296).toBeLessThanOrEqual(320 - 12);
      expect(pos.topPx + 300).toBeLessThanOrEqual(500 - 12);
    }

    // Tall bubble exceeding container height clamps topPx and sets maxHeightPx for internal scroll
    const tallBubble = computeClampedBubblePosition({
      anchorPosition: { leftPercent: 50, topPercent: 85 },
      containerWidth: 800,
      containerHeight: 500,
      bubbleWidth: 336,
      bubbleHeight: 490,
    });
    expect(tallBubble.topPx).toBe(12);
    expect(tallBubble.maxHeightPx).toBe(476);
  });

  it("renders funding block for complete, partial/unknown, absent funding and blocks invalid funding URLs", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));
    const container = document.createElement("div");
    const root = createRoot(container);

    // 1. Complete case: Zero Waste France (shares + rounded 99,9 % + safe PDF link)
    const zwf = byId.get("asso-zerowaste-france")!;
    act(() => {
      root.render(
        <ParisNetwork3DBubble
          actor={zwf}
          isLocked={true}
          fr={true}
          anchorPosition={null}
          onClose={() => undefined}
        />,
      );
    });
    expect(container.textContent).toContain("Financement");
    expect(container.textContent).toContain("Particuliers 55,6 %");
    expect(container.textContent).toContain("Total arrondi 99,9 %");
    expect(
      container.querySelector(`a[href="${zwf.funding?.sourceUrl}"]`),
    ).not.toBeNull();

    // 2. Partial/unknown shares: Zero Waste Paris ("Parts non publiées")
    const zwp = byId.get("asso-zerowaste-paris")!;
    act(() => {
      root.render(
        <ParisNetwork3DBubble
          actor={zwp}
          isLocked={true}
          fr={true}
          anchorPosition={null}
          onClose={() => undefined}
        />,
      );
    });
    expect(container.textContent).toContain("Financement");
    expect(container.textContent).toContain("Parts non publiées");

    // 3. Absent funding: Surfrider Paris (no Financement section rendered)
    const surfrider = byId.get("asso-surfrider-paris")!;
    act(() => {
      root.render(
        <ParisNetwork3DBubble
          actor={surfrider}
          isLocked={true}
          fr={true}
          anchorPosition={null}
          onClose={() => undefined}
        />,
      );
    });
    expect(container.textContent).not.toContain("Financement");

    // 4. Invalid URL: javascript: link is never rendered as an <a href>
    act(() => {
      root.render(
        <ParisNetwork3DBubble
          actor={{
            ...zwp,
            funding: {
              ...zwp.funding!,
              sourceUrl: "javascript:alert(1)",
            },
          }}
          isLocked={true}
          fr={true}
          anchorPosition={null}
          onClose={() => undefined}
        />,
      );
    });
    expect(container.textContent).toContain("Financement");
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("filters territories in combobox, displays empty state for non-Paris territory, and prevents late GPS from overwriting manual choice", () => {
    sitePreferencesMock.mockReturnValue({
      locale: "fr",
      displayMode: "complet",
    });

    let deferredGpsSuccess: ((pos: GeolocationPosition) => void) | null = null;
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) => {
          deferredGpsSuccess = success;
        }),
      },
    });

    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(ParisNetwork3DSection, { fr: true }));
    });

    // Initially displays Paris intramuros pilot
    expect(container.textContent).toContain("Pilote : Paris intramuros");

    // Click "Me localiser" to start an async GPS request
    const gpsBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Me localiser"),
    );
    expect(gpsBtn).toBeDefined();
    act(() => {
      gpsBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Open combobox, search "bretagne", select FR:REG:53 via keyboard ArrowDown + Enter
    const combobox = container.querySelector(
      'input[role="combobox"]',
    ) as HTMLInputElement;
    expect(combobox).not.toBeNull();

    act(() => {
      combobox.focus();
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(combobox, "bretagne");
      combobox.dispatchEvent(new Event("input", { bubbles: true }));
      combobox.dispatchEvent(new Event("change", { bubbles: true }));
    });

    act(() => {
      combobox.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    // Empty state is displayed without any canvas or fake network
    expect(container.textContent).toContain(
      "Réseau de ce territoire pas encore renseigné",
    );
    expect(container.querySelector("canvas")).toBeNull();

    // Late async GPS response arrives for Paris -> must NOT overwrite Bretagne
    act(() => {
      deferredGpsSuccess?.({
        coords: { latitude: 48.8566, longitude: 2.3522 },
      } as GeolocationPosition);
    });
    expect(container.textContent).toContain(
      "Réseau de ce territoire pas encore renseigné",
    );

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: originalGeolocation,
    });

    act(() => {
      root.unmount();
    });
  });
});
