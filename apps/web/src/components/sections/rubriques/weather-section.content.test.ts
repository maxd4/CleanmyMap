import { describe, expect, it } from "vitest";

import {
  buildPreparationHeroStats,
  buildPreparationKitSections,
  buildQuickActions,
  buildUsefulBlocks,
} from "./weather-section.preparation.data";
import { getDurationLabel, getReportLabel, getWeatherStateCopy } from "./weather-section.helpers";
import { evaluateWeatherRisk } from "@/lib/weather/ops-weather";

describe("Weather content contract", () => {
  it.each(["vert", "orange", "rouge"] as const)(
    "describes %s duration as indicative rather than as a hard limit",
    (level) => {
      const label = getDurationLabel(
        evaluateWeatherRisk(
          level === "rouge"
            ? { temperature: 34, rain: 3.2, wind: 50 }
            : level === "orange"
              ? { temperature: 29, rain: 1, wind: 10 }
              : { temperature: 20, rain: 0, wind: 10 },
        ),
        true,
      );

      expect(label.toLowerCase()).toContain("durée indicative");
      expect(label.toLowerCase()).not.toContain("max");
    },
  );

  it("keeps the weather report decision as contextual guidance", () => {
    const label = getReportLabel("rouge", true).toLowerCase();

    expect(label).toContain("conditions");
    expect(label).not.toContain("report recommandé");
  });

  it("does not present fallback coordinates as the user's weather locale", () => {
    const state = getWeatherStateCopy({
      weatherStatus: "empty",
      locationResolution: "unresolved",
      selectedZoneLabel: "Lieu introuvable",
      fr: true,
    });

    expect(state.title).toBe("Localisation à préciser");
    expect(String(state.description)).toContain("géocodé");
  });

  it("does not turn risk calculations into mandatory prescriptions", () => {
    const riskText = [
      ...evaluateWeatherRisk({ temperature: 34, rain: 3.2, wind: 50 }).equipment,
      ...evaluateWeatherRisk({ temperature: 34, rain: 3.2, wind: 50 }).constraints,
      ...evaluateWeatherRisk({ temperature: 20, rain: 0, wind: 10 }).equipment,
      ...evaluateWeatherRisk({ temperature: 20, rain: 0, wind: 10 }).constraints,
    ].join(" ").toLowerCase();

    expect(riskText).not.toMatch(/obligatoire|obligatoires/);
    expect(riskText).not.toContain("<=");
  });

  it("keeps preparation copy contextual and avoids universal water quantities", () => {
    const heroStats = buildPreparationHeroStats(true, "1 h", "Gants", "Modéré");
    const kit = buildPreparationKitSections(true);
    const usefulBlocks = buildUsefulBlocks(true);
    const copy = JSON.stringify({ heroStats, kit, usefulBlocks }).toLowerCase();

    expect(copy).not.toContain("adapté à tous");
    expect(copy).not.toContain("1 l+");
    expect(copy).not.toContain("merci la nature");
  });

  it("keeps only quick actions with a real non-weather destination", () => {
    const actions = buildQuickActions(true);
    const hrefs = actions.map((action) => action.href);

    expect(hrefs).toEqual(["/sections/recycling"]);
    expect(hrefs).not.toContain("/sections/reports");
    expect(hrefs).not.toContain("/sections/weather");
    expect(actions.map((action) => action.title)).not.toContain("Partager la fiche");
  });
});
