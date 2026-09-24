import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from(
    "local-dev.clerk.accounts.dev$",
  ).toString("base64")}`;
  process.env.CLERK_SECRET_KEY = "sk_test_local_dev_secret";
});

import {
  RUBRIQUE_REGISTRY,
  getVisibleRubriquesByCategory,
} from "@/lib/sections-registry";
import { getNavigationSpacesForProfile } from "@/lib/navigation";
import { isProtectedAppPage } from "@/proxy";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const detailedPresentation = readFileSync(
  new URL(
    "../../../../../../../documentation/pages_site/routes/02-agir/actions-history/actions-history-presentation-detaillee.md",
    import.meta.url,
  ),
  "utf8",
);
const historyRoute = RUBRIQUE_REGISTRY.find((item) => item.route === "/actions/history");

describe("actions history route contract", () => {
  it("remains a protected hidden workflow with a coherent public label", () => {
    expect(historyRoute).toMatchObject({
      label: { fr: "Historique terrain", en: "Field history" },
      description: {
        fr: "Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.",
        en: "Review accessible records, their quality, and corrections to make.",
      },
      availability: "hidden",
    });
    expect(historyRoute?.route).toBe("/actions/history");
    expect(existsSync(new URL("./page.tsx", import.meta.url))).toBe(true);
  });

  it("keeps Clerk protection distinct from hidden navigation availability", () => {
    expect(isProtectedAppPage("/actions/history")).toBe(true);
    expect(isProtectedAppPage("/actions/history/details")).toBe(true);
    expect(historyRoute?.availability).toBe("hidden");
    expect(detailedPresentation).toContain("route protégée par le proxy Clerk");
    expect(detailedPresentation).not.toContain("aperçu public flouté avant authentification");
  });

  it("keeps the route out of the primary Agir navigation for every profile", () => {
    for (const profile of ["benevole", "coordinateur", "scientifique", "entreprise", "elu", "admin", "max"] as const) {
      const spaces = getNavigationSpacesForProfile(profile, "exhaustif");
      expect(spaces.flatMap((space) => space.items).map((item) => item.routeId)).not.toContain(
        "history",
      );
    }

    expect(
      getVisibleRubriquesByCategory("terrain", "fr").map((item) => item.route),
    ).not.toContain("/actions/history");
  });

  it("keeps the page links on existing internal destinations", () => {
    expect(pageSource).toContain('href:"/actions/new"');
    expect(pageSource).toContain('href:"/reports"');
    expect(existsSync(new URL("../new/page.tsx", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../../reports/page.tsx", import.meta.url))).toBe(true);
  });

  it("uses the canonical title, description and action CTA in both page templates", () => {
    expect(pageSource).toContain('title: "Historique terrain"');
    expect(pageSource).toContain('title="Historique terrain"');
    expect(pageSource).toContain(
      "Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.",
    );
    expect(pageSource).not.toContain('label:"Déclarer"');
    expect(pageSource).not.toContain('label:"Nouvelle déclaration"');
    expect(pageSource).toContain('label:"Créer une action"');
  });
});
