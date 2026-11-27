// @vitest-environment jsdom

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "fr" as "fr" | "en",
  displayMode: "exhaustif" as "exhaustif" | "minimaliste" | "sobre",
  trackRoleCtaClick: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({
    locale: mocks.locale,
    displayMode: mocks.displayMode,
  }),
}));

vi.mock("@/lib/analytics/navigation-client", () => ({
  trackRoleCtaClick: mocks.trackRoleCtaClick,
}));

import { RolePrimaryActions } from "./role-primary-actions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("RolePrimaryActions behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.locale = "fr";
    mocks.displayMode = "exhaustif";
    mocks.trackRoleCtaClick.mockReset();
  });

  function render(profile: React.ComponentProps<typeof RolePrimaryActions>["profile"], props = {}) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<RolePrimaryActions profile={profile} {...props} />);
    });
  }

  it("renders every allowed volunteer action and tracks its semantic slot", () => {
    render("benevole");

    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>("a"));
    expect(links).toHaveLength(4);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/actions/new",
      "/sections/rejoindre-une-action",
      "/actions/map",
      "/learn/comprendre",
    ]);
    expect(host.textContent).toContain("Faire maintenant");
    expect(host.textContent).toContain("Prioritaire");
    expect(host.textContent).toContain("Vérifier la carte");
    expect(host.textContent).toContain("Vulgarisation");
    expect(host.textContent).toContain("Rapide");

    act(() => {
      links.forEach((link) => link.click());
    });

    expect(mocks.trackRoleCtaClick.mock.calls.map(([payload]) => payload.ctaType)).toEqual([
      "primary",
      "secondary",
      "additional",
      "additional",
    ]);
    expect(mocks.trackRoleCtaClick).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "benevole",
        href: "/actions/new",
        label: "Créer une action",
      }),
    );
  });

  it("preserves English labels and dark theme styling for a privileged profile", () => {
    mocks.locale = "en";
    render("admin", { tone: "dark", title: "Admin actions" });

    const section = host.querySelector("section")!;
    expect(section.className).toContain("bg-black/25");
    expect(host.querySelector("h2")?.textContent).toBe("Admin actions");
    expect(host.textContent).toContain("Act now");
    expect(host.textContent).toContain("Priority");
    expect(host.textContent).toContain("Creator inbox");
    expect(host.textContent).toContain("System control");

    const links = host.querySelectorAll<HTMLAnchorElement>("a");
    act(() => links[1]?.click());
    expect(mocks.trackRoleCtaClick).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "admin",
        ctaType: "secondary",
        label: "Export data",
      }),
    );
  });

  it("reduces the surface to the primary action in minimal display mode", () => {
    mocks.locale = "en";
    mocks.displayMode = "minimaliste";
    render("scientifique");

    const section = host.querySelector("section")!;
    const grid = section.querySelector("div.mt-4")!;
    const link = host.querySelector<HTMLAnchorElement>("a")!;

    expect(host.querySelector("h2")?.textContent).toBe("Actions principales");
    expect(grid.className).toContain("grid-cols-1");
    expect(link.className).toContain("scale-105");
    expect(host.querySelectorAll("a")).toHaveLength(1);
    expect(link.getAttribute("href")).toBe("/reports");
    expect(host.textContent).toContain("Analyze impact");
    expect(host.textContent).toContain("Priority");
  });

  it("keeps warm presentation and the explicit display mode for the business profile", () => {
    mocks.displayMode = "sobre";
    render("entreprise", { tone: "warm", title: "Partenariats" });

    expect(host.querySelector("section")?.className).toContain("bg-[linear-gradient");
    expect(host.querySelector("h2")?.textContent).toBe("Partenariats");
    expect(host.querySelectorAll("a")).toHaveLength(4);
    expect(host.textContent).toContain("Ouvrir l’espace entreprise");
  });
});
