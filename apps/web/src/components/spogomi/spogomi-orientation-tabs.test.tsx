import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import type { KeyboardEvent, MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { buildSpogomiActionInfo, SpogomiOrientationTabs } from "./spogomi-orientation-tabs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function findTabs(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "button" && node.props.role === "tab");
}

function links(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => node.type === "a");
}

function infoButtons(root: ReactTestRenderer | ReactTestInstance) {
  const instance = "root" in root ? root.root : root;
  return instance.findAll((node) => node.type === "button" && typeof node.props["aria-label"] === "string" && node.props["aria-label"].startsWith("Informations sur"));
}

describe("SpogomiOrientationTabs", () => {
  it("renders the volunteer entry point, three phases and private catalog intent", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });

    expect(findTabs(renderer)).toHaveLength(3);
    expect(findTabs(renderer).map((tab) => tab.props.children)).toEqual([
      "Bénévoles",
      "Arbitres & modération",
      "Organisateurs",
    ]);
    const volunteerPanel = renderer.root.findAllByProps({ role: "tabpanel" })[0];
    expect(volunteerPanel?.findAllByType("h4").map((heading) => heading.props.children).filter((children): children is string => typeof children === "string")).toEqual([
      "Avant la compétition",
      "Pendant la compétition",
      "Après la compétition",
    ]);
    const primaryLink = links(renderer).find((link) => link.props.href === "#spogomi-events" && link.props["aria-label"] === "Voir les compétitions");
    expect(primaryLink).toBeTruthy();
    expect(primaryLink?.props["data-cmm-button-width"]).toBe("auto");
    expect(infoButtons(volunteerPanel)).toHaveLength(10);
    expect(infoButtons(volunteerPanel).every((button) => button.props["aria-expanded"] === false && button.props["aria-haspopup"] === "dialog" && button.props["aria-controls"] && typeof button.props.onKeyDown === "function" && typeof button.props.onMouseEnter === "function")).toBe(true);
    for (const panel of renderer.root.findAllByProps({ role: "tabpanel" })) {
      expect(panel.props.id).toBeTruthy();
      expect(panel.props["aria-labelledby"]).toBeTruthy();
      expect(panel.findAllByProps({ role: "tab" })).toHaveLength(0);
    }
    for (const tab of findTabs(renderer)) {
      expect(renderer.root.findAllByProps({ id: tab.props["aria-controls"] })).toHaveLength(1);
    }
    expect(links(renderer).some((link) => link.props.href === "/spogomi#spogomi-registration")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/spogomi#spogomi-assistance")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dvolunteers")).toBe(true);
    expect(buildSpogomiActionInfo({
      label: "Télécharger mes attestations",
      description: "Télécharger une attestation depuis la section personnelle après certification. Une présence ou une demande seule ne suffit pas.",
      accessCondition: "Connexion requise ; mission certifiée et attestation disponible.",
      href: "/spogomi#spogomi-attestations",
      requiresAuthentication: false,
    })).toMatchObject({
      purpose: "Télécharger une attestation depuis la section personnelle après certification. Une présence ou une demande seule ne suffit pas.",
      where: expect.stringContaining("section personnelle"),
      access: "Connexion requise ; mission certifiée et attestation disponible.",
    });
    const attestationInfo = infoButtons(volunteerPanel).find((button) => button.props["aria-label"] === "Informations sur Télécharger mes attestations");
    expect(attestationInfo).toBeTruthy();
    vi.stubGlobal("document", { fonts: undefined, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal("window", { setTimeout, clearTimeout, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    act(() => {
      attestationInfo?.props.onClick({ defaultPrevented: false });
    });
    expect(attestationInfo?.props["aria-expanded"]).toBe(true);
    const attestationPanel = renderer.root.findByProps({ id: attestationInfo?.props["aria-controls"] });
    const attestationPanelText = attestationPanel.findAllByType("p").map((paragraph) => paragraph.props.children).join(" ");
    expect(attestationPanelText).toContain("Une présence ou une demande seule ne suffit pas");
    expect(attestationPanelText).toContain("Connexion requise ; mission certifiée et attestation disponible.");
    vi.unstubAllGlobals();
    expect(JSON.stringify(renderer.toJSON())).not.toContain(">Ouvrir<");
  });

  it("exposes referee actions before authentication without granting a global access", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });

    const tabs = findTabs(renderer);
    act(() => {
      tabs[1]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });

    expect(renderer.root.findAllByType("h3").map((node) => node.props.children)).toContain("Arbitres & modération");
    expect(links(renderer).some((link) => link.props["aria-label"] === "Mes événements habilités")).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain("Mes événements habilités");
    expect(infoButtons(renderer).some((button) => button.props["aria-label"] === "Informations sur Mes événements habilités")).toBe(true);
    expect(JSON.stringify(renderer.toJSON())).toContain("Avant l’épreuve");
    expect(links(renderer).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dreferees%26section%3Darbitration")).toBe(true);
    expect(links(renderer).some((link) => link.props.href === "/spogomi")).toBe(false);
  });

  it("keeps organizer actions discoverable anonymously and opens them directly when authenticated", () => {
    let anonymous!: ReactTestRenderer;
    act(() => {
      anonymous = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });
    const anonymousTabs = findTabs(anonymous);
    act(() => {
      anonymousTabs[2]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });
    expect(links(anonymous).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fnouveau")).toBe(true);
    expect(links(anonymous).some((link) => link.props.href === "/sign-in?redirect_url=%2Fspogomi%2Fmes-evenements%3Fparcours%3Dorganizers%26section%3Dteams")).toBe(true);

    let authenticated!: ReactTestRenderer;
    act(() => {
      authenticated = create(<SpogomiOrientationTabs isAuthenticated />);
    });
    const authenticatedTabs = findTabs(authenticated);
    act(() => {
      authenticatedTabs[2]?.props.onClick({} as MouseEvent<HTMLButtonElement>);
    });
    expect(links(authenticated).some((link) => link.props.href === "/spogomi/nouveau")).toBe(true);
    expect(links(authenticated).some((link) => link.props.href === "/spogomi/mes-evenements?parcours=organizers&section=teams")).toBe(true);
    expect(JSON.stringify(authenticated.toJSON())).toContain("Mes compétitions");
    expect(JSON.stringify(authenticated.toJSON())).toContain("Publier l’événement");
    expect(JSON.stringify(authenticated.toJSON())).toContain("Publier les résultats");
    expect(JSON.stringify(authenticated.toJSON())).toContain("Consolider le bilan");
    expect(infoButtons(authenticated).some((button) => button.props["aria-label"] === "Informations sur Mes compétitions")).toBe(true);
  });

  it("keeps keyboard tab navigation and panel relationships accessible", () => {
    vi.stubGlobal("document", { getElementById: vi.fn().mockReturnValue({ focus: vi.fn() }) });
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SpogomiOrientationTabs isAuthenticated={false} />);
    });

    const tabs = findTabs(renderer);
    const preventDefault = vi.fn();
    act(() => {
      tabs[0]?.props.onKeyDown({ key: "End", preventDefault } as unknown as KeyboardEvent<HTMLButtonElement>);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(findTabs(renderer).map((tab) => tab.props["aria-selected"])).toEqual([false, false, true]);
    for (const tab of findTabs(renderer)) {
      expect(renderer.root.findAllByProps({ id: tab.props["aria-controls"] })).toHaveLength(1);
    }
    vi.unstubAllGlobals();
  });
});
