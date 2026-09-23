import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getSectionRubriqueById: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/sections-registry", () => ({
  getSectionRubriqueById: mocks.getSectionRubriqueById,
  getSectionRouteParams: () => [],
}));

vi.mock("@/components/sections/rubriques/section-renderer", () => ({
  SectionRenderer: ({ section }: { section: { id: string } }) =>
    React.createElement("div", { "data-section-id": section.id }),
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({
    children,
    mode,
    signInHref,
  }: {
    children: React.ReactNode;
    mode: string;
    signInHref?: string;
  }) =>
    React.createElement(
      "div",
      { "data-mode": mode, "data-sign-in-href": signInHref },
      children,
    ),
}));

import SectionPage from "./page";

describe("section authentication gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null });
  });

  it.each(["blur", "disabled"] as const)(
    "returns to the canonical section and preserves useful query parameters in %s mode",
    async (mode) => {
      mocks.getSectionRubriqueById.mockReturnValue({
        id: "route",
        anonymousPresentation: mode,
      });

      const markup = renderToStaticMarkup(
        await SectionPage({
          params: Promise.resolve({ sectionId: "route" }),
          searchParams: Promise.resolve({
            tab: "history",
            filter: ["soil", "water"],
            omitted: undefined,
          }),
        }),
      );

      expect(markup).toContain(`data-mode="${mode}"`);
      expect(markup).toContain(
        'data-sign-in-href="/sign-in?redirect_url=%2Fsections%2Froute%3Ftab%3Dhistory%26filter%3Dsoil%26filter%3Dwater"',
      );
    },
  );
});
