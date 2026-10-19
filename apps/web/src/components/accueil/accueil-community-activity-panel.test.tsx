import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => createElement("img", props),
}));

import { HomeCommunityActivityPanel } from "./accueil-community-activity-panel";

function buildActivity(
  image: HomeCommunityActivitySummary["items"][number]["image"],
): HomeCommunityActivitySummary {
  return {
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
        image,
        tone: "emerald",
      },
    ],
  };
}

describe("HomeCommunityActivityPanel image boundaries", () => {
  it("uses responsive lazy Next images only for canonical local fallbacks", () => {
    const markup = renderToStaticMarkup(
      <HomeCommunityActivityPanel
        activity={buildActivity({
          source: "fallbackImage",
          url: "/images/action-fallbacks/cleanup-park-01.webp",
          alt: "Nettoyage participatif dans un parc",
          isFallback: true,
          syntheticImage: true,
          mustNeverBePresentedAsFieldEvidence: true,
        })}
        hasActivityError={false}
      />,
    );

    expect(markup).toContain('src="/images/action-fallbacks/cleanup-park-01.webp"');
    expect(markup).toContain('alt="Nettoyage participatif dans un parc"');
    expect(markup).toContain('sizes="(min-width: 640px) 136px, 96px"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).not.toContain("background-image");
  });

  it("keeps user-provided URLs on the existing background-image path", () => {
    const userUrl = "https://images.example.test/action-1.webp";
    const markup = renderToStaticMarkup(
      <HomeCommunityActivityPanel
        activity={buildActivity({
          source: "userProvidedImage",
          url: userUrl,
          alt: "Photo fournie par l'utilisateur pour l'action",
          isFallback: false,
        })}
        hasActivityError={false}
      />,
    );

    expect(markup).toContain("background-image");
    expect(markup).toContain(userUrl);
    expect(markup).not.toContain('loading="lazy"');
  });
});
