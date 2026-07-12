import { describe, expect, it } from "vitest";
import {
  resolveBasePageFamilyId,
  resolvePageFamily,
} from "@/lib/ui/page-families";
import {
  ADMIN_ROUTE,
  DASHBOARD_ROUTE,
  EXPLORER_ROUTE,
  PROFIL_ROUTE,
} from "@/lib/accueil-pilotage-routes";

describe("page-families resolver", () => {
  it("maps direct routes to the expected families", () => {
    expect(resolveBasePageFamilyId("/")).toBe("homepage");

    expect(resolveBasePageFamilyId(DASHBOARD_ROUTE)).toBe("accueil-pilotage");
    expect(resolveBasePageFamilyId(`${PROFIL_ROUTE}/benevole`)).toBe(
      "accueil-pilotage",
    );

    expect(resolveBasePageFamilyId("/actions/new")).toBe("agir");
    expect(resolveBasePageFamilyId("/signalement")).toBe("agir");
    expect(resolveBasePageFamilyId("/actions/map")).toBe(
      "cartographie-impact",
    );
    expect(resolveBasePageFamilyId("/reports")).toBe("cartographie-impact");
    expect(resolveBasePageFamilyId("/gamification")).toBe(
      "cartographie-impact",
    );

    expect(resolveBasePageFamilyId("/community")).toBe(
      "reseau-discussions",
    );
    expect(resolveBasePageFamilyId("/messagerie")).toBe(
      "reseau-discussions",
    );
    expect(resolveBasePageFamilyId("/open-data")).toBe(
      "reseau-discussions",
    );

    expect(resolveBasePageFamilyId("/learn/comprendre")).toBe("apprendre");
    expect(resolveBasePageFamilyId("/sign-in")).toBe("authentification");
    expect(resolveBasePageFamilyId("/conditions-utilisation")).toBe(
      "juridique",
    );
    expect(resolveBasePageFamilyId("/form-comparison")).toBe("systeme");
    expect(resolveBasePageFamilyId(ADMIN_ROUTE)).toBe("administration");
    expect(resolveBasePageFamilyId("/prints/report")).toBe("impression");
  });

  it("maps documented section routes to their real families", () => {
    expect(resolveBasePageFamilyId("/sections/elus")).toBe(
      "accueil-pilotage",
    );

    expect(resolveBasePageFamilyId("/sections/route")).toBe("agir");
    expect(resolveBasePageFamilyId("/sections/weather")).toBe("agir");
    expect(
      resolveBasePageFamilyId("/sections/rejoindre-un-formulaire"),
    ).toBe("agir");

    expect(resolveBasePageFamilyId("/sections/gamification")).toBe(
      "cartographie-impact",
    );

    for (const route of [
      "/sections/community",
      "/sections/feedback",
      "/sections/actors",
      "/sections/annuaire",
      "/sections/messagerie",
      "/sections/open-data",
      "/sections/funding",
      "/sections/trash-spotter",
    ]) {
      expect(resolveBasePageFamilyId(route)).toBe("reseau-discussions");
    }
  });

  it("keeps unresolved runtime sections explicit until product classification", () => {
    expect(resolveBasePageFamilyId("/sections/recycling")).toBe("secours");
    expect(resolveBasePageFamilyId("/sections/compost")).toBe("secours");
    expect(resolveBasePageFamilyId("/sections/climate")).toBe("secours");
  });

  it("falls back to the secours family for unknown routes", () => {
    expect(resolveBasePageFamilyId("/unknown-route")).toBe("secours");
  });

  it("keeps documented exceptions explicit", () => {
    expect(resolvePageFamily(EXPLORER_ROUTE)).toMatchObject({
      id: "apprendre",
      exceptionId: "explorer-sommaire",
    });

    expect(resolvePageFamily("/methodologie")).toMatchObject({
      id: "cartographie-impact",
      backdropToneKey: "sky",
      exceptionId: "methodologie-impact",
    });

    expect(resolvePageFamily("/sections/weather")).toMatchObject({
      id: "agir",
      exceptionId: "weather-operations",
    });

    expect(
      resolvePageFamily("/sections/rejoindre-un-formulaire"),
    ).toMatchObject({
      id: "agir",
      exceptionId: "join-group-form",
    });

    expect(resolvePageFamily("/reports")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "reports-impact",
    });

    expect(resolvePageFamily("/gamification")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "reports-impact",
    });

    expect(resolvePageFamily("/sections/gamification")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "reports-impact",
    });
  });
});
