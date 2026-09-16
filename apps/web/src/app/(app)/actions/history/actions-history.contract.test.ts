import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RUBRIQUE_REGISTRY,
  getVisibleRubriquesByCategory,
} from "@/lib/sections-registry";
import { getNavigationSpacesForProfile } from "@/lib/navigation";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
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
    expect(pageSource).toContain('title: "Historique terrain - CleanMyMap"');
    expect(pageSource).toContain('title="Historique terrain"');
    expect(pageSource).toContain(
      "Consulter les enregistrements accessibles, leur qualité et les corrections à effectuer.",
    );
    expect(pageSource).not.toContain('label:"Déclarer"');
    expect(pageSource).not.toContain('label:"Nouvelle déclaration"');
    expect(pageSource).toContain('label:"Créer une action"');
  });
});
