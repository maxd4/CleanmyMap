// @vitest-environment jsdom

import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("framer-motion", async () => {
  const ReactModule = await import("react");
  const MotionDiv = ReactModule.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  }>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => {
      void initial;
      void animate;
      void exit;
      void transition;
      return ReactModule.createElement("div", { ...props, ref }, children);
    },
  );
  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    motion: { div: MotionDiv },
    useReducedMotion: () => false,
  };
});

vi.mock("@/components/ui/cmm-button", async () => {
  const ReactModule = await import("react");
  const CmmButton = ReactModule.forwardRef<HTMLButtonElement, {
    children: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    ariaLabel?: string;
  }>(({ children, asChild, onClick, disabled, ariaLabel }, ref) => {
    if (asChild && ReactModule.isValidElement(children)) {
      const child = children as React.ReactElement<{ "aria-label"?: string; onClick?: () => void }>;
      return ReactModule.cloneElement(child, {
        "aria-label": ariaLabel,
        onClick,
      });
    }
    return ReactModule.createElement(
      "button",
      { ref, onClick, disabled, "aria-label": ariaLabel },
      children,
    );
  });
  return { CmmButton };
});

vi.mock("lucide-react", () => {
  const Icon = () => React.createElement("span");
  return {
    ArrowRight: Icon,
    Building2: Icon,
    Globe: Icon,
    Heart: Icon,
    MapPin: Icon,
    MessageSquare: Icon,
    Quote: Icon,
    Sparkles: Icon,
    Target: Icon,
    X: Icon,
    Zap: Icon,
  };
});

import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";

const seed = INITIAL_ANNUAIRE_ENTRIES.find((entry) => entry.id === "asso-shakirail");
if (!seed) throw new Error("Expected the drawer fixture to exist");

const publishedEntry = {
  ...seed,
  provenance: "published_partner" as const,
  verificationStatus: "verifie" as const,
  qualificationStatus: "partenaire_actif" as const,
  availability: "Sur rendez-vous",
  lastUpdatedAt: "2026-08-26T10:00:00.000Z",
  recentActivityAt: "2026-08-26T10:00:00.000Z",
  websiteUrl: "https://cleanmymap.fr/partners/shakirail",
  primaryChannel: {
    platform: "instagram" as const,
    label: "Contact public",
    url: "https://www.instagram.com/pikpik_environnement/",
  },
  associationProfile: {
    ...seed.associationProfile!,
    impactHistory: {
      actionCount: 2,
      zonesCovered: 1,
      recurrence: "Actions récurrentes",
      provenance: { source: "Bilan terrain vérifié" },
    },
    pastActions: ["Collectes documentées"],
    pastActionsProvenance: { source: "Bilan terrain vérifié" },
  },
  internalAdminContact: {
    referentName: "Coordination privée",
    email: "redacted-email",
    phone: "redacted-phone",
  },
  distanceKm: null,
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function mount(element: React.ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

describe("AnnuairePartnerDrawer interactions", () => {
  it("exposes only the public CTA destination and never a placeholder or private contact", () => {
    mount(
      <AnnuairePartnerDrawer
        entry={publishedEntry}
        isOpen
        onClose={vi.fn()}
        fr
      />,
    );
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog?.querySelector('h2')?.textContent).toBe(publishedEntry.name);
    expect(document.body.querySelector('a[href="#"]')).toBeNull();
    expect(document.body.textContent).not.toContain(publishedEntry.internalAdminContact?.email);
    expect(document.body.textContent).not.toContain(publishedEntry.internalAdminContact?.phone);

    const cta = Array.from(document.body.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("Engager le contact"),
    );
    expect(cta?.getAttribute("href")).toBe(
      "https://www.instagram.com/pikpik_environnement/",
    );
    expect(document.body.textContent).toContain("Bilan terrain vérifié");
  });

  it("closes on Escape and restores focus to the opening control", () => {
    function Harness() {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <>
          <button id="open-drawer" onClick={() => setIsOpen(true)}>
            Ouvrir
          </button>
          <AnnuairePartnerDrawer
            entry={publishedEntry}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            fr
          />
        </>
      );
    }

    const container = mount(<Harness />);
    const trigger = container.querySelector<HTMLButtonElement>("#open-drawer");
    expect(trigger).toBeTruthy();
    act(() => {
      trigger?.focus();
      trigger?.click();
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Fermer la fiche partenaire",
    );

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const lastFocusable = focusable?.[focusable.length - 1];
    expect(lastFocusable).toBeTruthy();
    act(() => {
      lastFocusable?.focus();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Fermer la fiche partenaire",
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("renders an unavailable final action as a disabled control when no public channel exists", () => {
    const unavailable = {
      ...publishedEntry,
      websiteUrl: undefined,
      instagramUrl: undefined,
      facebookUrl: undefined,
      primaryChannel: undefined,
    };
    mount(
      <AnnuairePartnerDrawer
        entry={unavailable}
        isOpen
        onClose={vi.fn()}
        fr
      />,
    );
    const unavailableButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Contact indisponible"),
    );
    expect(unavailableButton).toBeTruthy();
    expect(unavailableButton?.disabled).toBe(true);
  });

  it("does not restore focus to a trigger that disappeared while the drawer was open", () => {
    function Harness() {
      const [isOpen, setIsOpen] = React.useState(false);
      const [showTrigger, setShowTrigger] = React.useState(true);
      return (
        <>
          {showTrigger ? (
            <button id="open-drawer" onClick={() => setIsOpen(true)}>
              Ouvrir
            </button>
          ) : null}
          <button id="remove-trigger" onClick={() => setShowTrigger(false)}>
            Retirer le déclencheur
          </button>
          <AnnuairePartnerDrawer
            entry={publishedEntry}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            fr
          />
        </>
      );
    }

    const container = mount(<Harness />);
    const trigger = container.querySelector<HTMLButtonElement>("#open-drawer");
    const removeTrigger = container.querySelector<HTMLButtonElement>("#remove-trigger");
    act(() => {
      trigger?.focus();
      trigger?.click();
      removeTrigger?.click();
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).not.toBe(trigger);
  });
});
