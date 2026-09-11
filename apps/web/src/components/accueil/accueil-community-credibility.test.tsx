import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";

vi.mock("@/lib/animations/use-gsap-reveal", () => ({
  useGsapReveal: () => undefined,
}));

import {
  fetchHomepageActivity,
  HomeCommunityCredibility,
  HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE,
} from "./accueil-community-credibility";

const EMPTY_ACTIVITY = {
  visibleActions: 0,
  distinctLocations: 0,
  items: [],
};

const ONE_ITEM_ACTIVITY: HomeCommunityActivitySummary = {
  visibleActions: 1,
  distinctLocations: 1,
  items: [
    {
      id: "action-1",
      actor: "La Brigade Verte",
      initials: "LB",
      action: "Action terrain",
      title: "La Brigade Verte a réuni 10 bénévoles le 14/04/2026",
      summary: "Action vérifiée",
      location: "Canal Saint-Martin, Paris",
      timeLabel: "Il y a 2 j",
      dateLabel: "2026-04-14",
      statusLabel: "Vérifiée",
      volunteersCount: 10,
      cigaretteButts: 320,
      wasteKg: 18,
      image: { source: "none", url: null, alt: "", isFallback: false },
      tone: "emerald" as const,
    },
  ],
};

const ACTIVITY_RESPONSE = {
  activity: ONE_ITEM_ACTIVITY,
  errorMessage: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeCommunityCredibility action hierarchy", () => {
  it("combines the credibility content into one responsive card", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityCredibility activity={EMPTY_ACTIVITY} />,
    );

    expect(markup.match(/data-credibility-combined-card/g)).toHaveLength(1);
    expect(markup.match(/data-credibility-ecosystem-step/g)).toHaveLength(4);
    expect(markup).toContain("Des partenariats progressifs");
    expect(markup).toContain("Le terrain nourrit la carte");
    expect(markup).not.toContain("Étapes de construction de l'écosystème");
  });

  it("puts the gold impact report first in the community actions", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityCredibility activity={EMPTY_ACTIVITY} />,
    );

    const reportIndex = markup.indexOf('href="/reports"');
    const declarationIndex = markup.indexOf('href="/actions/new"');
    const joinIndex = markup.indexOf(
      'href="/sections/rejoindre-un-formulaire"',
    );

    expect(reportIndex).toBeGreaterThan(-1);
    expect(reportIndex).toBeLessThan(declarationIndex);
    expect(declarationIndex).toBeLessThan(joinIndex);
    expect(markup).toContain('data-cmm-button-tone="critical"');
  });

  it("puts the violet discussion link first in the partner actions", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityCredibility activity={EMPTY_ACTIVITY} />,
    );

    const discussionIndex = markup.indexOf('href="/sections/messagerie"');
    const mapIndex = markup.indexOf('href="/actions/map"');
    const partnersIndex = markup.indexOf(
      'href="/sections/community?tab=partners"',
    );

    expect(discussionIndex).toBeGreaterThan(-1);
    expect(discussionIndex).toBeLessThan(mapIndex);
    expect(mapIndex).toBeLessThan(partnersIndex);
    expect(markup).toContain(">Discuter<");
    expect(markup).toContain('data-cmm-button-tone="important"');
  });

  it("keeps three clickable action slots and reserves empty structures", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityCredibility activity={ONE_ITEM_ACTIVITY} />,
    );

    expect(markup.match(/data-home-community-action-card/g)).toHaveLength(3);
    expect(markup.match(/data-home-community-action-placeholder/g)).toHaveLength(2);
    expect(markup).toContain(
      'href="/actions/map?actionId=action-1"',
    );
    expect(markup).toContain(
      'aria-label="Voir l&#x27;action La Brigade Verte a réuni 10 bénévoles le 14/04/2026"',
    );
  });

  it("parses a valid JSON activity response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ACTIVITY_RESPONSE), { status: 200 }),
      ),
    );

    await expect(fetchHomepageActivity("/api/homepage/activity")).resolves.toEqual(
      ACTIVITY_RESPONSE,
    );
  });

  it("normalizes a JSON 503 response to the stable public error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            activity: { visibleActions: 0, distinctLocations: 0, items: [] },
            errorMessage: "Database timeout",
          }),
          { status: 503 },
        ),
      ),
    );

    await expect(fetchHomepageActivity("/api/homepage/activity")).rejects.toMatchObject({
      message: HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE,
    });
  });

  it.each([
    ["an empty body", ""],
    ["a non-JSON body", "Service unavailable"],
    ["invalid JSON", "{"],
  ])("normalizes %s to the stable public error", async (_description, body) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status: 200 })),
    );

    await expect(fetchHomepageActivity("/api/homepage/activity")).rejects.toMatchObject({
      message: HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE,
    });
  });

  it("never renders technical activity errors in the public HTML", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityCredibility
        activity={ONE_ITEM_ACTIVITY}
        errorMessage="Unexpected end of JSON input"
      />,
    );

    expect(markup).toContain(HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE);
    expect(markup).toContain("La Brigade Verte a réuni 10 bénévoles le 14/04/2026");
    expect(markup).not.toContain("Unexpected end of JSON input");
    expect(markup).not.toContain("Supabase");
  });
});
