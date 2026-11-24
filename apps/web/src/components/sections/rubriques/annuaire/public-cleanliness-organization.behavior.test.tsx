// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./paris-network-3d-section", () => ({ ParisNetwork3DSection: () => null }));
import { PublicCleanlinessOrganization } from "./public-cleanliness-organization";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(): HTMLDivElement {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<PublicCleanlinessOrganization />));
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
    expect(view.querySelector('a[href="https://www.paris.fr/pages/la-proprete-239/"]')?.textContent).toContain("Propreté");
  });

  it("finds REQ by abbreviation and opens its unknown assignment details", () => {
    const view = mount();
    const search = view.querySelector<HTMLInputElement>('input[aria-label="Rechercher dans l\'organigramme"]');
    expect(search).not.toBeNull();
    act(() => {
      search!.value = "REQ";
      search!.dispatchEvent(new Event("change", { bubbles: true }));
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
    expect(view.textContent).toContain("Aucun référentiel institutionnel n'a encore été validé pour Lyon");
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
    expect([...view.querySelectorAll("button")].some((button) => button.textContent?.includes("Direction de la Propreté et de l'Eau (DPE)"))).toBe(false);
  });
});
