import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getSectionRubriqueById: vi.fn(),
  getServerLocale: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/sections-registry", () => ({
  getSectionRubriqueById: mocks.getSectionRubriqueById,
  getSectionRouteParams: () => [],
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/lib/sections/public-section-snapshots", () => ({
  loadPublicSectionInitialData: vi.fn().mockResolvedValue(undefined),
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

import SectionPage, { generateMetadata } from "./page";

async function expectPublicNoindexMetadata(sectionId: string) {
  mocks.getSectionRubriqueById.mockReturnValue({
    id: sectionId,
    label: { fr: "Page publique", en: "Public page" },
    description: { fr: "Page", en: "Page" },
  });

  const metadata = await generateMetadata({
    params: Promise.resolve({ sectionId }),
    searchParams: Promise.resolve({}),
  });

  expect(metadata.robots).toEqual({ index: false, follow: true, nocache: true });
  expect(metadata).not.toHaveProperty("alternates");
}

describe("section authentication gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null });
    mocks.getServerLocale.mockResolvedValue("fr");
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
      expect(mocks.getSafeAuthSession).toHaveBeenCalledTimes(1);
    },
  );

  it("renders visible sections without reading search params or Clerk session", async () => {
    mocks.getSectionRubriqueById.mockReturnValue({
      id: "community",
      anonymousPresentation: "visible",
    });
    const searchParams = {
      then: vi.fn(() => {
        throw new Error("visible sections must not await searchParams");
      }),
    } as unknown as Promise<Record<string, string | string[] | undefined>>;

    const markup = renderToStaticMarkup(
      await SectionPage({
        params: Promise.resolve({ sectionId: "community" }),
        searchParams,
      }),
    );

    expect(markup).toContain('data-section-id="community"');
    expect(mocks.getSafeAuthSession).not.toHaveBeenCalled();
    expect(searchParams.then).not.toHaveBeenCalled();
  });

  it("renders the public leaderboard without Clerk or the private gamification gate", async () => {
    mocks.getSectionRubriqueById.mockReturnValue({
      id: "leaderboard",
      anonymousPresentation: "visible",
      label: { fr: "Classement public", en: "Public leaderboard" },
      description: { fr: "Classement", en: "Leaderboard" },
    });
    const markup = renderToStaticMarkup(
      await SectionPage({
        params: Promise.resolve({ sectionId: "leaderboard" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain('data-section-id="leaderboard"');
    expect(markup).not.toContain("gamification-me");
    expect(mocks.getSafeAuthSession).not.toHaveBeenCalled();
  });

  it("keeps Feedback public and noindex without a canonical URL", async () => {
    await expectPublicNoindexMetadata("feedback");
  });

  it("keeps the public leaderboard noindex without a canonical URL", async () => {
    await expectPublicNoindexMetadata("leaderboard");
  });

  it("keeps public section metadata deterministic and French", async () => {
    mocks.getSectionRubriqueById.mockReturnValue({
      id: "community",
      label: { fr: "Communauté", en: "Community" },
      description: { fr: "La vie collective", en: "Community life" },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ sectionId: "community" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("Communauté");
    expect(metadata.description).toBe("La vie collective");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "/sections/community" });
    expect(mocks.getServerLocale).not.toHaveBeenCalled();
  });
});
