import { describe, expect, it } from "vitest";
import type { SpogomiPersonalRelation } from "./personal-events-service";
import {
  buildSpogomiCatalogHref,
  buildSpogomiEventHref,
  buildSpogomiEventSignInHref,
  buildSpogomiEventSpaceHref,
  parseSpogomiEventIntent,
  parseSpogomiCatalogIntent,
} from "./navigation-intent";

const space = (relations: SpogomiPersonalRelation[]) => ({
  relations,
  links: { public: null, space: "/spogomi/edition/espace" },
});

describe("SPOGOMI navigation intent", () => {
  it("accepts only known journeys and journey-compatible cockpit sections", () => {
    expect(
      parseSpogomiCatalogIntent({
        parcours: "referees",
        section: "arbitration",
      }),
    ).toEqual({ journey: "referees", focus: "arbitration" });
    expect(
      parseSpogomiCatalogIntent({ parcours: "referees", section: "settings" }),
    ).toEqual({ journey: "referees", focus: null });
    expect(parseSpogomiCatalogIntent({ parcours: ["organizers"] })).toEqual({
      journey: null,
      focus: null,
    });
    expect(
      parseSpogomiCatalogIntent({
        parcours: "unknown",
        section: "javascript:alert(1)",
      }),
    ).toEqual({ journey: null, focus: null });
  });

  it("builds stable catalog paths without allowing arbitrary query values", () => {
    expect(buildSpogomiCatalogHref("organizers", "teams")).toBe(
      "/spogomi/mes-evenements?parcours=organizers&section=teams",
    );
    expect(buildSpogomiCatalogHref("referees", "settings")).toBe(
      "/spogomi/mes-evenements?parcours=referees",
    );
  });

  it("opens a requested section only when the event relation supports it", () => {
    expect(
      buildSpogomiEventSpaceHref(space(["referee"]), "referees", "arbitration"),
    ).toBe("/spogomi/edition/espace#arbitration");
    expect(
      buildSpogomiEventSpaceHref(
        space(["checkin", "referee"]),
        "referees",
        "arbitration",
      ),
    ).toBe("/spogomi/edition/espace#arbitration");
    expect(
      buildSpogomiEventSpaceHref(
        space(["checkin", "observer"]),
        "referees",
        "results",
      ),
    ).toBe("/spogomi/edition/espace#results");
    expect(
      buildSpogomiEventSpaceHref(space(["checkin"]), "referees", "arbitration"),
    ).toBe("/spogomi/edition/espace#attendance");
    expect(
      buildSpogomiEventSpaceHref(
        space(["field_operator"]),
        "referees",
        "operations",
      ),
    ).toBe("/spogomi/edition/espace#operations");
    expect(
      buildSpogomiEventSpaceHref(space(["organizer"]), "organizers", "bilan"),
    ).toBe("/spogomi/edition/espace#bilan");
    expect(
      buildSpogomiEventSpaceHref(
        {
          ...space(["participant"]),
          links: {
            public: "/spogomi/edition",
            space: "/spogomi/edition/espace",
          },
        },
        "volunteers",
      ),
    ).toBeNull();
    expect(
      buildSpogomiEventSpaceHref(
        { ...space(["organizer", "participant"]) },
        "volunteers",
      ),
    ).toBeNull();
  });

  it("keeps only allowlisted event focus and division intent across Clerk", () => {
    expect(
      parseSpogomiEventIntent({ focus: "registration", division: "world_cup" }),
    ).toEqual({
      focus: "registration",
      division: "world_cup",
      tab: "overview",
    });
    expect(
      parseSpogomiEventIntent({
        focus: "javascript:alert(1)",
        division: "division-secret",
      }),
    ).toEqual({ focus: null, division: null, tab: "overview" });
    expect(
      parseSpogomiEventIntent({
        focus: ["team", "identity"],
        division: ["casual"],
      }),
    ).toEqual({ focus: null, division: null, tab: "overview" });
    expect(
      parseSpogomiEventIntent({ tab: "rankings", division: "casual" }),
    ).toEqual({ focus: null, division: "casual", tab: "rankings" });
    expect(
      buildSpogomiEventHref("paris-2026", {
        focus: "registration",
        division: "world_cup",
      }),
    ).toBe(
      "/spogomi/paris-2026?focus=registration&division=world_cup#spogomi-sports-registration",
    );
    expect(
      buildSpogomiEventSignInHref("paris-2026", {
        focus: "team",
        division: "casual",
      }),
    ).toBe(
      "/sign-in?redirect_url=%2Fspogomi%2Fparis-2026%3Ffocus%3Dteam%26division%3Dcasual%23spogomi-teams",
    );
  });
});
