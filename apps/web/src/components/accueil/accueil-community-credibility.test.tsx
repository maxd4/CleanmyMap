import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/animations/use-gsap-reveal", () => ({
  useGsapReveal: () => undefined,
}));

import { HomeCommunityCredibility } from "./accueil-community-credibility";

const EMPTY_ACTIVITY = {
  visibleActions: 0,
  distinctLocations: 0,
  items: [],
};

describe("HomeCommunityCredibility action hierarchy", () => {
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
});
