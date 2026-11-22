/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";
import { PreparationEquipmentFields } from "./preparation-equipment-fields";
import { buildPlannerWeatherRequest, type PlannerWeatherContext, type PlannerWeatherContextRequest } from "@/lib/weather/planner-weather";

type WeatherHookState = {
  weatherContext: PlannerWeatherContext | null;
  weatherRequest: PlannerWeatherContextRequest | null;
  weatherState: "idle" | "loading" | "success" | "unavailable" | "error";
  requestWeather: () => void;
};

const weatherState = vi.hoisted(() => ({
  value: {
    weatherContext: null,
    weatherRequest: null,
    weatherState: "idle",
    requestWeather: vi.fn(),
  } as WeatherHookState,
}));

vi.mock("../../use-action-preparation-weather", () => ({
  createActionPreparationWeatherRequest: vi.fn(() => null),
  useActionPreparationWeather: () => weatherState.value,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let host: HTMLDivElement;
let root: Root;

function renderEquipment(form: FormState) {
  act(() => {
    root.render(<PreparationEquipmentFields form={form} updateField={vi.fn()} />);
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  weatherState.value = {
    weatherContext: null,
    weatherRequest: null,
    weatherState: "idle",
    requestWeather: vi.fn(),
  };
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("PreparationEquipmentFields", () => {
  it("groups the four material areas and keeps an empty inventory unknown", () => {
    renderEquipment(createInitialFormState("Organisateur", "action"));

    expect(host.querySelector("#before-materials-bring-title")?.textContent).toBe("À apporter");
    expect(host.querySelector("#before-materials-provided-title")?.textContent).toBe("Fourni sur place");
    expect(host.querySelector("#before-equipment-inventory-title")?.textContent).toBe("Inventaire");
    expect(host.querySelector("#before-refreshments-title")?.textContent).toBe("Convivialité");
    expect(host.querySelector<HTMLInputElement>("#before-equipment-glovesPairs")?.value).toBe("");
    expect(host.querySelector("[data-testid='preparation-equipment-summary']")?.textContent).toContain("Effectif prévuNon renseigné");
    expect(host.textContent).toContain("Valeur vide = inconnu · 0 = absence déclarée · quantité positive = stock annoncé");
    expect(host.textContent).toContain("Aucune insuffisance calculable actuellement");
  });

  it.each([
    ["zéro", 0, "3", "aucune unité annoncée", "Prévoir 3 paire(s) complémentaire(s)"],
    ["insuffisant", 1, "3", "Paires de gants : 1", "Prévoir 2 paire(s) complémentaire(s)"],
  ])("shows a calculable %s glove shortage", (_label, stock, headcount, inventoryLabel, shortage) => {
    const form = createInitialFormState("Organisateur", "action");
    form.volunteersCount = headcount;
    form.equipmentInventory = { glovesPairs: stock };
    renderEquipment(form);

    expect(host.querySelector("[data-testid='preparation-equipment-summary']")?.textContent).toContain("Prévision saisie");
    expect(host.querySelector("[data-testid='preparation-equipment-summary']")?.textContent).toContain(inventoryLabel);
    expect(host.textContent).toContain(shortage);
  });

  it("does not infer a shortage from unknown headcount and distinguishes sufficient declared stock", () => {
    const form = createInitialFormState("Organisateur", "action");
    form.equipmentInventory = { glovesPairs: 4 };
    renderEquipment(form);

    const summary = host.querySelector("[data-testid='preparation-equipment-summary']")?.textContent ?? "";
    expect(summary).toContain("Effectif prévuNon renseigné");
    expect(summary).toContain("Paires de gants : 4");
    expect(summary).toContain("Aucune insuffisance calculable actuellement");
    expect(summary).not.toContain("Prévoir");

    form.volunteersCount = "4";
    renderEquipment(form);
    const sufficientSummary = host.querySelector("[data-testid='preparation-equipment-summary']")?.textContent ?? "";
    expect(sufficientSummary).toContain("Prévision saisie : 4 bénévole(s)");
    expect(sufficientSummary).toContain("Aucune insuffisance calculable actuellement");
    expect(sufficientSummary).not.toContain("Prévoir");
  });

  it("keeps Waste recommendations attributed to the catalog and allows unavailable weather", () => {
    const form = createInitialFormState("Organisateur", "action");
    form.wasteCategories = ["glass"];
    weatherState.value = {
      weatherContext: null,
      weatherRequest: null,
      weatherState: "unavailable",
      requestWeather: vi.fn(),
    };
    renderEquipment(form);

    const wasteAdvice = host.querySelector("[data-testid='preparation-waste-recommendations']")?.textContent ?? "";
    expect(wasteAdvice).toContain("Source : catalogue Waste");
    expect(host.querySelector("[data-testid='preparation-weather-recommendations']")?.textContent).toContain("Prévisions indisponibles ; cela ne bloque pas la préparation.");
    expect(host.querySelector<HTMLButtonElement>("[data-testid='preparation-weather-recommendations'] button")?.disabled).toBe(false);
  });

  it("shows successful weather advice with forecast provenance", () => {
    const form = createInitialFormState("Organisateur", "action");
    const request = buildPlannerWeatherRequest({
      latitude: 48.85,
      longitude: 2.35,
      actionDate: "2026-10-20",
      scheduledStartTime: "09:00",
      scheduledEndTime: "11:00",
      now: new Date("2026-10-19T09:00:00.000Z"),
    });
    weatherState.value = {
      weatherContext: {
        version: "planner-weather-snapshot-v1",
        provider: "open-meteo",
        source: "forecast",
        fetchedAt: "2026-10-19T08:00:00.000Z",
        coveredWindow: { startAt: "2026-10-20T09:00", endAt: "2026-10-20T11:00" },
        status: "available",
        weatherStatus: "available",
        location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
        hourly: ["09:00", "10:00"].map((time) => ({
          time: `2026-10-20T${time}`,
          temperatureC: 2,
          apparentTemperatureC: 1,
          precipitationMm: 4,
          precipitationProbabilityPct: 70,
          windKmh: 40,
          gustKmh: 45,
          weatherCode: 61,
        })),
        summary: null,
      },
      weatherRequest: request,
      weatherState: "success",
      requestWeather: vi.fn(),
    };
    renderEquipment(form);

    const weatherAdvice = host.querySelector("[data-testid='preparation-weather-recommendations']")?.textContent ?? "";
    expect(weatherAdvice).toContain("Source : prévision météo");
    expect(weatherAdvice).toContain("Prévoir une veste imperméable");
  });
});
