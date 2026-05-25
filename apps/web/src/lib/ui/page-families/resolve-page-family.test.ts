import { describe, expect, it } from "vitest";
import { resolveBasePageFamilyId, resolvePageFamily } from "@/lib/ui/page-families";

describe("page-families resolver", () => {
  it("maps the documented direct routes and section aliases to the expected families", () => {
    expect(resolveBasePageFamilyId("/")).toBe("homepage");
    expect(resolveBasePageFamilyId("/accueil")).toBe("homepage");

    expect(resolveBasePageFamilyId("/dashboard")).toBe("accueil-pilotage");
    expect(resolveBasePageFamilyId("/profil/benevole")).toBe("accueil-pilotage");

    expect(resolveBasePageFamilyId("/actions/new")).toBe("agir");
    expect(resolveBasePageFamilyId("/actions/map")).toBe("cartographie-impact");
    expect(resolveBasePageFamilyId("/sandbox")).toBe("cartographie-impact");
    expect(resolveBasePageFamilyId("/sections/sandbox")).toBe("cartographie-impact");
    expect(resolveBasePageFamilyId("/gamification")).toBe("cartographie-impact");
    expect(resolveBasePageFamilyId("/sections/gamification")).toBe("cartographie-impact");

    expect(resolveBasePageFamilyId("/community")).toBe("reseau-discussions");
    expect(resolveBasePageFamilyId("/sections/community")).toBe("reseau-discussions");
    expect(resolveBasePageFamilyId("/messagerie")).toBe("reseau-discussions");
    expect(resolveBasePageFamilyId("/sections/messagerie")).toBe("reseau-discussions");
    expect(resolveBasePageFamilyId("/open-data")).toBe("reseau-discussions");
    expect(resolveBasePageFamilyId("/sections/open-data")).toBe("reseau-discussions");

    expect(resolveBasePageFamilyId("/learn/hub")).toBe("apprendre");
    expect(resolveBasePageFamilyId("/sign-in")).toBe("auth");
    expect(resolveBasePageFamilyId("/conditions-utilisation")).toBe("legal");
    expect(resolveBasePageFamilyId("/form-comparison")).toBe("system");
    expect(resolveBasePageFamilyId("/admin")).toBe("admin");
    expect(resolveBasePageFamilyId("/prints/report")).toBe("print");
  });

  it("keeps the documented exceptions explicit", () => {
    expect(resolvePageFamily("/explorer")).toMatchObject({
      id: "apprendre",
      exceptionId: "explorer-sommaire",
    });

    expect(resolvePageFamily("/methodologie")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "methodologie-impact",
    });

    expect(resolvePageFamily("/reports")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "reports-impact",
    });

    expect(resolvePageFamily("/sections/gamification")).toMatchObject({
      id: "cartographie-impact",
      exceptionId: "reports-impact",
    });
  });
});
