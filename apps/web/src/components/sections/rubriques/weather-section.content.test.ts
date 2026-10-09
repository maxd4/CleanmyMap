import { describe, expect, it } from "vitest";

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

  it.each([
    ["loading", "Chargement météo"],
    ["ready", "Conditions disponibles"],
    ["empty", "Aucune donnée météo"],
    ["error", "Météo indisponible"],
  ] as const)("keeps the %s weather state explicit", (weatherStatus, title) => {
    expect(getWeatherStateCopy({
      weatherStatus,
      locationResolution: "resolved",
      selectedZoneLabel: "Lyon",
      fr: true,
    }).title).toBe(title);
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

  it("does not use the retired pedagogical preparation blocks", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("./weather-section.tsx", import.meta.url), "utf8");
    expect(source).toContain("PreparationLocationBlock");
    expect(source).toContain("PreparationForecastBlock");
    expect(source).toContain("CmmDisclosure");
    expect(source).not.toContain("PreparationGuide");
    expect(source).not.toContain("Bien cadrer la cleanwalk");
  });
});
