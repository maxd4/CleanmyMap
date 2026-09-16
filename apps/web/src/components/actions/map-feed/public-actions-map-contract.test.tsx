import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { resolvePointColor } from "@/components/actions/map/map-layers.shared";
import { POLLUTION_SCORE_UNAVAILABLE_COLOR } from "@/components/actions/map/pollution-score-scope";
import {
  ACTIONS_MAP_PUBLIC_FEED_DEFAULTS,
  getActionsMapCurrentYearDays,
} from "@/components/actions/map/actions-map-filters.utils";

const HOMEPAGE_SOURCE = readFileSync(
  new URL("../../accueil/accueil-map-preview.tsx", import.meta.url),
  "utf8",
);
const MAP_PAGE_SOURCE = readFileSync(
  new URL("../../../app/(app)/actions/map/page-client.tsx", import.meta.url),
  "utf8",
);
const FEED_SOURCE = readFileSync(new URL("./actions-map-feed.tsx", import.meta.url), "utf8");

const V6_REFERENCES = {
  global: {
    wastePerVolunteer: 2,
    buttsPerVolunteer: 312.5,
    wasteSourceCount: 2,
    buttsSourceCount: 5,
  },
};

function buildComparableAction(): ActionMapItem {
  return toActionMapItem(
    buildActionDataContract({
      id: "shared-public-action",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-09-01",
      locationLabel: "75001 Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      wasteKg: 1,
      cigaretteButts: 100,
      volunteersCount: 1,
      durationMinutes: 60,
    }),
  );
}

describe("public actions map contract", () => {
  it("uses the same public feed defaults and provider boundary on both surfaces", () => {
    expect(HOMEPAGE_SOURCE).toContain("<ActionsMapFeed");
    expect(HOMEPAGE_SOURCE).toContain("presentation=\"homepage-preview\"");
    expect(HOMEPAGE_SOURCE).toContain("ACTIONS_MAP_PUBLIC_FEED_DEFAULTS");
    expect(MAP_PAGE_SOURCE).toContain("<ActionPollutionScoreReferencesProvider>");
    expect(MAP_PAGE_SOURCE).toContain("<ActionsMapFeedContent");
    expect(FEED_SOURCE).toContain("<ActionPollutionScoreReferencesProvider>");
    expect(HOMEPAGE_SOURCE).toContain("getActionsMapCurrentYearDays()");
    expect(getActionsMapCurrentYearDays(new Date("2026-09-17T12:00:00Z"))).toBe(260);
    expect(ACTIONS_MAP_PUBLIC_FEED_DEFAULTS).toEqual({
      dateScope: "current_year",
      statusFilter: "approved",
      impactFilter: "all",
      qualityMin: 0,
    });
  });

  it("keeps the same valid V6 action score and non-grey color for both surfaces", () => {
    const action = buildComparableAction();
    const now = new Date("2026-09-17T12:00:00Z");
    const homepageColor = resolvePointColor(action, V6_REFERENCES, now);
    const mapColor = resolvePointColor(action, V6_REFERENCES, now);

    expect(homepageColor).toBe(mapColor);
    expect(homepageColor).not.toBe(POLLUTION_SCORE_UNAVAILABLE_COLOR);
  });

  it("keeps grey reserved for missing references and loading distinct", () => {
    const action = buildComparableAction();
    const now = new Date("2026-09-17T12:00:00Z");

    expect(resolvePointColor(action, null, now)).toBe(POLLUTION_SCORE_UNAVAILABLE_COLOR);
    expect(resolvePointColor(action, null, now, "projected_today", null, "global", true)).not.toBe(
      POLLUTION_SCORE_UNAVAILABLE_COLOR,
    );
  });
});
