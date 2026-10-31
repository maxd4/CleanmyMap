import { describe, expect, it } from "vitest";

import {
  getCurrentWindowLabel,
  getDurationLabel,
  getForecastConditionLabel,
  getForecastHourLabel,
  getForecastLocalClockTime,
  getReportLabel,
  getWeatherStateCopy,
} from "./weather-section.helpers";
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

  it.each([
    ["2026-10-21T09:05", "2026-10-21T10:35", "21/10 09:05 → 21/10 10:35"],
    [undefined, "2026-10-21T10:35", "Pas de fenêtre horaire claire"],
    ["not-a-date", "also-not-a-date", "not-a-date → also-not-a-date"],
  ] as const)("keeps the current weather window explicit for %s", (from, to, expected) => {
    expect(getCurrentWindowLabel(from, to, "fr")).toBe(expected);
  });

  it("formats forecast hours without inventing a timezone for local values", () => {
    expect(getForecastHourLabel("2026-10-21T09:05")).toBe("09:05");
    expect(getForecastLocalClockTime("2026-10-21T9:05")).toBeNull();
    expect(getForecastLocalClockTime("2026-10-21T09:05")).toBe("09:05");
    expect(getForecastHourLabel("not-a-date")).toBe("not-a-date");
  });

  it.each([
    [95, "Orage"],
    [61, "Pluie"],
    [45, "Brouillard"],
    [0, "Ensoleillé"],
  ] as const)("uses the authoritative weather code %s before fallback heuristics", (weatherCode, expected) => {
    expect(getForecastConditionLabel({
      time: "2026-10-21T10:00",
      temperature: null,
      rain: null,
      precipitationProbability: null,
      wind: null,
      weatherCode,
    }, 4).label).toBe(expected);
  });

  it("uses explicit fallback observations when no weather code is available", () => {
    expect(getForecastConditionLabel({
      time: "2026-10-21T22:00",
      temperature: null,
      rain: null,
      precipitationProbability: null,
      wind: null,
      weatherCode: null,
    }, 2).label).toBe("Ciel clair");
    expect(getForecastConditionLabel({
      time: "2026-10-21T12:00",
      temperature: 12,
      rain: null,
      precipitationProbability: null,
      wind: 18,
      weatherCode: null,
    }, 2).label).toBe("Vent léger");
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
