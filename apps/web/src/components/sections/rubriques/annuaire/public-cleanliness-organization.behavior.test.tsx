// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicCleanlinessCityDataset } from "@/lib/partners/public-cleanliness-organization";

import { PublicCleanlinessOrganization } from "./public-cleanliness-organization";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(component: ReactNode = <PublicCleanlinessOrganization />): HTMLDivElement {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(component));
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("PublicCleanlinessOrganization behavior", () => {
  it("shows sourced institutional details and excludes individual field identities", () => {
    const view = mount();
    expect(view.textContent).toContain("Direction de la Propreté et de l'Eau (DPE)");
    expect(view.textContent).toContain("Agents de terrain");
    expect(view.textContent).not.toMatch(/Caroline GROS|Delphine THIEFFRY/);
    expect(view.querySelector('aside a[href="https://www.paris.fr/pages/la-proprete-239/"]')?.textContent).toContain("Propreté");
  });

  it("finds REQ by abbreviation and opens its unknown assignment details", () => {
    const view = mount();
    const search = view.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).not.toBeNull();
    act(() => {
      search!.value = "REQ";
      search!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const req = [...view.querySelectorAll("button")].find((button) => button.textContent?.includes("Référents et référentes de l'entretien du quartier"));
    expect(req).toBeDefined();
    act(() => req?.click());
    expect(view.textContent).toContain("Affectation inconnue");
    expect(view.textContent?.toLowerCase()).toContain("les affectations actuelles");
  });

  it("uses canonical city and arrondissement choices and reports missing city evidence", () => {
    const view = mount();
    const city = view.querySelector<HTMLSelectElement>('select[aria-label="Sélectionner une ville"]')!;
    act(() => {
      city.value = "Lyon";
      city.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.textContent).toContain("Aucun référentiel institutionnel n’a encore été validé pour Lyon");
    act(() => {
      city.value = "Paris";
      city.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const district = view.querySelector<HTMLSelectElement>('select[aria-label="Filtrer par arrondissement"]')!;
    expect([...district.options].some((option) => option.textContent === "Paris 17e arrondissement")).toBe(true);
    act(() => {
      district.value = "17";
      district.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.textContent).toContain("Division territoriale 17e");
    expect(view.textContent).not.toContain("Division territoriale 9e–10e");
  });

  it("offers native keyboard-operable collapse and selection buttons", () => {
    const view = mount();
    const rootToggle = [...view.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.getAttribute("aria-label") === "Replier Ville de Paris");
    expect(rootToggle?.type).toBe("button");
    expect(rootToggle?.getAttribute("aria-expanded")).toBe("true");
    act(() => rootToggle?.click());
    expect(rootToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(view.querySelector("#org-children-city-paris")).toBeNull();
  });

  it("progresses through levels, navigates related structures, and exposes relation sources", () => {
    const view = mount();
    expect(view.querySelector('[aria-label="Navigation par niveau"]')).not.toBeNull();
    expect(view.textContent).toContain("Sources de cette relation");
    const reqLink = [...view.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Explorer: Référents et référentes de l'entretien du quartier"));
    expect(reqLink).toBeDefined();
    act(() => reqLink?.click());
    expect(view.querySelector("aside h3")?.textContent).toContain("Référents et référentes de l'entretien du quartier");
    expect(view.textContent).toContain("Affectation inconnue");
    expect(view.querySelector('a[href*="travaillerpourparis.offres.paris.fr/13375"]')).not.toBeNull();
  });

  it("resets a selection excluded by combined filters and provides usable zoom controls", () => {
    const view = mount();
    const service = view.querySelector<HTMLSelectElement>('select[aria-label="Filtrer par service"]')!;
    const district = view.querySelector<HTMLSelectElement>('select[aria-label="Filtrer par arrondissement"]')!;
    act(() => {
      service.value = "coordination";
      service.dispatchEvent(new Event("change", { bubbles: true }));
      district.value = "20";
      district.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.querySelector("aside h3")?.textContent).not.toBe("Direction de la Propreté et de l'Eau (DPE)");
    const zoom = view.querySelector<HTMLButtonElement>('button[aria-label="Augmenter le zoom"]')!;
    act(() => zoom.click());
    expect(view.querySelector<HTMLButtonElement>('button[aria-label="Réinitialiser le zoom"]')?.textContent).toBe("110%");
  });

  it("opens the complete matrix, selects a multi-mandate person and exposes public channels", () => {
    const view = mount();
    const toggle = [...view.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Couverture institutionnelle par arrondissement"))!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(view.querySelector("table")).toBeNull();
    act(() => toggle.click());
    const table = view.querySelector("table")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(table.textContent).toContain("Accueil propreté : 01 55 34 77 17");
    expect(table.textContent).toContain("contact REQ");
    const ekon = [...table.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Carine Ekon")!;
    act(() => ekon.click());
    expect(view.querySelector("aside h3")?.textContent).toBe("Carine Ekon");
    expect(view.querySelector("aside")?.textContent).toContain("Mandat politique");
    expect(view.querySelector("aside")?.textContent).toContain("Vice-présidence de la 8e commission");
    expect(view.querySelector("aside")?.textContent).toContain("Conseil de Paris");
    expect(document.activeElement).toBe(view.querySelector("aside"));
    expect(view.querySelector("table tbody")?.children).toHaveLength(20);
    act(() => toggle.click());
    expect(view.querySelector("table")).toBeNull();
  });

  it("translates the matrix controls in English", () => {
    const view = mount(<PublicCleanlinessOrganization fr={false} />);
    const toggle = [...view.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Institutional coverage by district"))!;
    act(() => toggle.click());
    expect(view.querySelector("table")?.textContent).toContain("Town hall / mayor");
    expect(view.querySelector("table")?.textContent).toContain("REQ contact");
  });

  it("changes district and need, exposes conditions and navigates from public results", () => {
    const view = mount();
    const panel = view.querySelector('section[aria-labelledby="cleanliness-need-heading"]')!;
    expect(panel.textContent).toContain("Qui contacter ?");
    const district = view.querySelector<HTMLSelectElement>('select[aria-label="Filtrer par arrondissement"]')!;
    const need = panel.querySelector<HTMLSelectElement>("select")!;
    expect(district.options).toHaveLength(21);
    expect(need.options).toHaveLength(8);
    expect(panel.querySelectorAll("select")).toHaveLength(1);
    expect(panel.textContent).toContain("Sélectionnez un arrondissement");
    act(() => {
      district.value = "20";
      district.dispatchEvent(new Event("change", { bubbles: true }));
      need.value = "removal";
      need.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(panel.textContent).toContain("Collecte municipale en régie");
    expect(panel.textContent).not.toContain("Prestataires privés de collecte");
    expect(panel.textContent).toContain("sans consigne explicite");
    act(() => {
      need.value = "storage";
      need.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(panel.textContent).toContain("demande préalable");
    const link = [...panel.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Déchèteries et Espaces tri municipaux")!;
    act(() => link.click());
    expect(view.querySelector("aside h3")?.textContent).toBe("Déchèteries et Espaces tri municipaux");
    expect(document.activeElement).toBe(view.querySelector("aside"));
  });

  it("translates the full interface and renders an injected non-Paris dataset", () => {
    const dataset: PublicCleanlinessCityDataset = {
      city: "Lyon",
      territoryIds: ["Lyon:1"],
      sources: [{ id: "lyon-source", label: "Fiche officielle fictive", url: "https://example.test/lyon", verifiedAt: "2026-11-25", evidence: "official_current" }],
      nodes: [
        { id: "lyon-city", name: "Ville de Lyon", kind: "city", territoryIds: ["Lyon:1"], service: "governance", assignment: "confirmed", description: "Fiche municipale synthétique.", sourceIds: ["lyon-source"] },
        { id: "lyon-service", name: "Service de propreté", kind: "service", legalEmployerId: "lyon-city", unitId: "lyon-city", territoryIds: ["Lyon:1"], service: "cleaning", assignment: "confirmed", description: "Unité synthétique.", sourceIds: ["lyon-source"] },
      ],
      relations: [{ id: "lyon-link", from: "lyon-city", to: "lyon-service", kind: "hierarchy", status: "confirmed", sourceIds: ["lyon-source"] }],
    };
    const view = mount(<PublicCleanlinessOrganization fr={false} datasets={{ Lyon: dataset }} />);
    expect((view.querySelector('select[aria-label="Select a city"]') as HTMLSelectElement | null)?.value).toBe("Lyon");
    expect(view.textContent).toContain("Public services organization");
    expect(view.textContent).toContain("Legal employer");
    expect(view.textContent).toContain("Street cleaning");
    expect(view.textContent).toContain("Service de propreté");
  });

  it("opens details of an ancestor node under combined filters via tree and breadcrumb navigation", () => {
    const view = mount(<PublicCleanlinessOrganization fr />);
    const search = view.querySelector<HTMLInputElement>('input[type="search"]')!;
    const setSearch = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const rootToggle = view.querySelector<HTMLButtonElement>('button[aria-label="Replier Ville de Paris"]')!;
    act(() => rootToggle.click());
    expect(view.querySelector("#org-children-city-paris")).toBeNull();
    act(() => {
      setSearch.call(search, "Division 17");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(view.querySelector("#org-children-city-paris")).not.toBeNull();
    expect(search.value).toBe("Division 17");
    // Ancestor "Direction de la Propreté et de l'Eau (DPE)" is rendered in the tree even when excluded by search
    const dpeBtn = [...view.querySelectorAll<HTMLButtonElement>("ul button")].find(
      (btn) => btn.textContent?.includes("Direction de la Propreté et de l'Eau"),
    );
    expect(dpeBtn).toBeDefined();
    act(() => dpeBtn!.click());
    expect(view.querySelector("aside h3")?.textContent).toContain("Direction de la Propreté et de l'Eau");

    expect(search.value).toBe("Division 17");

    // Breadcrumb navigation to root ancestor "Ville de Paris"
    const breadcrumbNav = view.querySelector('nav[aria-label="Navigation par niveau"]');
    const parisBtn = [...(breadcrumbNav?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find(
      (btn) => btn.textContent?.includes("Ville de Paris"),
    );
    expect(parisBtn).toBeDefined();
    act(() => parisBtn!.click());
    expect(view.querySelector("aside h3")?.textContent).toContain("Ville de Paris");
    expect(search.value).toBe("Division 17");
    act(() => {
      setSearch.call(search, "");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.querySelector("#org-children-city-paris")).toBeNull();
  });

  it("defaults to the graphical 2D org chart, distinguishes hierarchy connector statuses, and switches to the alternative list view", () => {
    const view = mount(<PublicCleanlinessOrganization fr />);
    const chartBtn = [...view.querySelectorAll<HTMLButtonElement>("button")].find(
      (btn) => btn.textContent?.trim() === "Organigramme",
    );
    const listBtn = [...view.querySelectorAll<HTMLButtonElement>("button")].find(
      (btn) => btn.textContent?.trim() === "Liste",
    );
    expect(chartBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(listBtn?.getAttribute("aria-pressed")).toBe("false");

    // Hierarchy connectors distinguish confirmed and historical statuses
    expect(view.querySelector('[data-connector-status="confirmed"]')).not.toBeNull();
    expect(view.querySelector('[data-connector-status="historical"]')).not.toBeNull();

    // Zoom and Cadrer reset
    const zoomIn = view.querySelector<HTMLButtonElement>('button[aria-label="Augmenter le zoom"]')!;
    act(() => zoomIn.click());
    expect(view.querySelector<HTMLButtonElement>('button[aria-label="Réinitialiser le zoom"]')?.textContent).toBe("110%");
    const fitBtn = [...view.querySelectorAll<HTMLButtonElement>("button")].find(
      (btn) => btn.textContent?.trim() === "Cadrer",
    )!;
    act(() => fitBtn.click());
    expect(view.querySelector<HTMLButtonElement>('button[aria-label="Réinitialiser le zoom"]')?.textContent).toBe("100%");

    // Switch to alternative List view while preserving selection
    act(() => listBtn!.click());
    expect(listBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(chartBtn?.getAttribute("aria-pressed")).toBe("false");
    expect(view.querySelector("aside h3")?.textContent).toContain("Direction de la Propreté et de l'Eau");
  });
});
