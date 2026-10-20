// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildActionPreparationContext, resolvePreparationSelection, type PreparationSelection } from "@/lib/actions/action-preparation-context";
import { evaluateWeatherRisk, type InterventionWindow } from "@/lib/weather/ops-weather";
import { PreparationForecastBlock, PreparationLocationBlock, PreparationPanel } from "./weather-section.preparation";

type ForecastWeather = React.ComponentProps<typeof PreparationForecastBlock>["weather"];
type ForecastDay = NonNullable<ForecastWeather["selectedForecastDay"]>;
type LocationWeather = React.ComponentProps<typeof PreparationLocationBlock>["weather"];

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const GREEN_RISK = evaluateWeatherRisk({ temperature: 20, rain: 0, wind: 10 });
const ORANGE_RISK = evaluateWeatherRisk({ temperature: 29, rain: 1, wind: 10 });
const RED_RISK = evaluateWeatherRisk({ temperature: 34, rain: 3.2, wind: 50 });

function forecastDay(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: "2026-10-21",
    label: "Mercredi 21 oct.",
    subtitle: "21/10/2026",
    min: 10,
    max: 18,
    rain: 0,
    wind: 12,
    uv: 2,
    weatherCode: 0,
    hours: [],
    ...overrides,
  };
}

function forecastWindow(overrides: Partial<InterventionWindow> = {}): InterventionWindow {
  return {
    from: "2026-10-21T09:00",
    to: "2026-10-21T10:00",
    level: "vert",
    reason: "Fenetre favorable",
    ...overrides,
  };
}

function forecastWeather(overrides: Partial<ForecastWeather> = {}): ForecastWeather {
  const firstDay = forecastDay();
  const secondDay = forecastDay({ date: "2026-10-22", label: "Jeudi 22 oct.", min: 12, max: 20, rain: 1.2, wind: 31 });
  return {
    weatherStatus: "ready",
    currentRisk: GREEN_RISK,
    selectedForecastRisk: GREEN_RISK,
    forecastDays: [firstDay, secondDay],
    forecastSelectionStatus: "selected",
    selectedForecastDay: firstDay,
    selectedForecastDayIndex: 0,
    setSelectedForecastDayIndex: vi.fn(),
    windows: { recommended: [], avoid: [] },
    ...overrides,
  };
}

function locationWeather(overrides: Partial<LocationWeather> = {}): LocationWeather {
  return {
    weatherStatus: "ready",
    locationResolution: "resolved",
    selectedLocation: {
      label: "Lieu météo",
      subtitle: "Lieu géocodé",
      latitude: 48.85,
      longitude: 2.35,
      importance: null,
      resolution: "resolved",
    },
    locationQuery: "Lieu météo",
    setLocationQuery: vi.fn(),
    locationSuggestions: [],
    locationSuggestionsError: null,
    isLocationSuggestionsLoading: false,
    selectLocation: vi.fn(),
    ...overrides,
  };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function unmount(): void {
  if (root) act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
}

function mount(element: React.ReactElement): HTMLDivElement {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(element));
  return host;
}

function clickButton(label: string): void {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
  expect(button, `button containing ${label}`).toBeTruthy();
  act(() => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function panel(overrides: Partial<React.ComponentProps<typeof PreparationPanel>> = {}) {
  return <PreparationPanel selectedForecastRisk={null} weatherStatus="empty" fr={true} {...overrides} />;
}

afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

describe("PreparationPanel", () => {
  it("uses the action checklist and material contract without global progress checklists", () => {
    const context = buildActionPreparationContext({
      draft: {
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel prévu", checked: true },
          { key: "meeting_point_confirmed", label: "Point confirmé", checked: false },
        ],
        suggestedMaterials: ["gloves"],
        materialsProvided: "Pinces au départ",
        recommendedMaterials: "Eau",
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(PreparationPanel, {
        selectedForecastRisk: null,
        weatherStatus: "empty",
        preparationContext: context,
        fr: true,
      }),
    );

    expect(html).toContain("Checklist unique de préparation");
    expect(html).toContain("Matériel prévu");
    expect(html).toContain("Matériel fourni");
    expect(html).toContain("À prévoir");
    expect(html).toContain("Aucune recommandation météo affichée");
    expect(html).not.toContain("kit-main");
    expect(html).not.toContain("guide-main");
    expect(html).not.toContain("Progression du kit");
    expect(html).not.toContain("x1");
  });

  it("compares weather and action locations by coordinates when labels differ", () => {
    const weather = {
      weatherStatus: "ready" as const,
      locationResolution: "resolved" as const,
      selectedLocation: {
        label: "Nom différent",
        subtitle: "Lieu géocodé",
        latitude: 48.85,
        longitude: 2.35,
        importance: null,
        resolution: "resolved" as const,
      },
      locationQuery: "Nom différent",
      setLocationQuery: () => undefined,
      locationSuggestions: [],
      locationSuggestionsError: null,
      isLocationSuggestionsLoading: false,
      selectLocation: () => undefined,
    };

    const html = renderToStaticMarkup(
      React.createElement(PreparationLocationBlock, {
        actionLocation: "Adresse canonique",
        actionLatitude: "48.85",
        actionLongitude: "2.35",
        actionDate: "2026-10-12",
        weather,
        fr: true,
      }),
    );

    expect(html).not.toContain("Lieu météo différent");
  });

  it("distinguishes a local preparation draft from an action already saved", () => {
    const context = buildActionPreparationContext({ draft: { materialsProvided: "Pinces" } });
    const html = renderToStaticMarkup(
      React.createElement(PreparationPanel, {
        selectedForecastRisk: null,
        weatherStatus: "empty",
        preparationContext: context,
        preparationPersistenceStatus: "draft",
        fr: true,
      }),
    );

    expect(html).toContain('data-testid="preparation-persistence-status"');
    expect(html).toContain("Brouillon conservé localement");
    expect(html).toContain("Enregistrez la préparation");
  });

  it.each([
    ["saved", "Préparation enregistrée dans l’action."],
    ["draft", "Brouillon conservé localement."],
    ["error", "Erreur : le brouillon local n’a pas pu être conservé."],
  ] as const)("renders the real persistence status %s", (status, expected) => {
    const html = renderToStaticMarkup(panel({ preparationPersistenceStatus: status }));

    expect(html).toContain(expected);
    expect(html).toContain('data-testid="preparation-persistence-status"');
    expect(html).toContain(status === "error" ? 'role="alert"' : 'role="status"');
  });

  it.each([
    ["vert", GREEN_RISK, null, "Aucune consigne météo prioritaire calculée"],
    ["orange", ORANGE_RISK, "note", "Consignes météo prioritaires du jour sélectionné"],
    ["rouge", RED_RISK, "alert", "Consignes météo prioritaires du jour sélectionné"],
  ] as const)("renders %s risk guidance with its real constraints", (_level, risk, role, expected) => {
    const mounted = mount(panel({ selectedForecastRisk: risk, weatherStatus: "ready" }));

    expect(mounted.textContent).toContain(expected);
    if (role) {
      expect(mounted.querySelector(`[role="${role}"]`)?.textContent).toContain("Consignes météo prioritaires");
    } else {
      expect(mounted.querySelector('[role="alert"]')).toBeNull();
      expect(mounted.querySelector('[role="note"]')).toBeNull();
    }
  });

  it("keeps the empty-constraint state explicit and validates only a non-empty completed checklist", () => {
    const onValidated = vi.fn();
    const onChange = vi.fn();
    const context = buildActionPreparationContext({
      draft: {
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel prévu", checked: true },
          { key: "meeting_point_confirmed", label: "Point confirmé", checked: false },
        ],
      },
    });
    const mounted = mount(panel({ selectedForecastRisk: { ...ORANGE_RISK, constraints: [] }, weatherStatus: "ready", preparationContext: context, onPreparationValidated: onValidated, onPreparationContextChange: onChange }));

    expect(mounted.textContent).toContain("Aucune consigne météo prioritaire calculée");
    const unchecked = mounted.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:checked)');
    expect(unchecked).toBeTruthy();
    act(() => unchecked?.click());

    expect(onChange).toHaveBeenCalledWith({ preparationChecklist: [
      { key: "materials_checked", label: "Matériel prévu", checked: true },
      { key: "meeting_point_confirmed", label: "Point confirmé", checked: true },
    ] });
    expect(onValidated).toHaveBeenCalledWith(true);
  });

  it("shows the verified state only when every checklist item is already checked", () => {
    const context = buildActionPreparationContext({
      draft: {
        preparationChecklist: [
          { key: "materials_checked", label: "Matériel prévu", checked: true },
          { key: "meeting_point_confirmed", label: "Point confirmé", checked: true },
        ],
      },
    });

    const html = renderToStaticMarkup(panel({ preparationContext: context }));

    expect(html).toContain("Vérifié");
    expect(html).not.toContain("À revoir");
  });

  it("does not validate an empty checklist and does not require modification callbacks", () => {
    const onValidated = vi.fn();
    const onChange = vi.fn();
    const context = buildActionPreparationContext({ draft: { preparationChecklist: [] } });
    const mounted = mount(panel({ preparationContext: context, onPreparationValidated: onValidated, onPreparationContextChange: onChange }));

    expect(mounted.querySelector('[data-testid="preparation-checklist"]')?.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(onValidated).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("PreparationLocationBlock", () => {
  it("does not warn when GPS coordinates identify the same place despite different labels", () => {
    const html = renderToStaticMarkup(
      <PreparationLocationBlock
        actionLocation="Adresse canonique"
        actionLatitude="48.85"
        actionLongitude="2.35"
        actionDate="2026-10-12"
        weather={locationWeather()}
        fr={true}
      />,
    );

    expect(html).not.toContain("Lieu météo différent");
  });

  it("warns when weather GPS coordinates differ from the action", () => {
    const mounted = mount(
      <PreparationLocationBlock
        actionLocation="Adresse canonique"
        actionLatitude="48.85"
        actionLongitude="2.35"
        actionDate="2026-10-12"
        weather={locationWeather({ selectedLocation: { ...locationWeather().selectedLocation, label: "Lieu éloigné", latitude: 48.86 } })}
        fr={true}
      />,
    );

    expect(mounted.querySelector('[role="note"]')?.textContent).toContain("Lieu météo différent");
  });

  it.each([
    ["same label", "Adresse canonique", false],
    ["different label", "Autre lieu", true],
  ] as const)("falls back to %s when GPS coordinates are unavailable", (_case, weatherLabel, differs) => {
    const mounted = mount(
      <PreparationLocationBlock
        actionLocation="Adresse canonique"
        actionDate="2026-10-12"
        weather={locationWeather({ selectedLocation: { ...locationWeather().selectedLocation, label: weatherLabel, latitude: Number.NaN, longitude: Number.NaN } })}
        fr={true}
      />,
    );

    expect(Boolean(mounted.querySelector('[role="note"]'))).toBe(differs);
  });
});

describe("PreparationForecastBlock", () => {
  it("renders an available forecast, metrics, the recommended window and French actions", () => {
    const setDay = vi.fn();
    const onSelection = vi.fn();
    const mounted = mount(
      <PreparationForecastBlock
        weather={forecastWeather({ setSelectedForecastDayIndex: setDay, windows: { recommended: [forecastWindow()], avoid: [] } })}
        actionDate="2026-10-20"
        onPreparationSelection={onSelection}
        fr={true}
      />,
    );

    expect(mounted.textContent).toContain("Prévisions et créneau conseillé");
    expect(mounted.textContent).toContain("10° / 18°");
    expect(mounted.textContent).toContain("Créneau favorable selon les heures disponibles");
    expect(mounted.textContent).toContain("21/10 09:00 → 21/10 10:00");
    expect(mounted.querySelector('button[aria-pressed="true"]')?.textContent).toContain("Mercredi 21 oct.");
    expect(mounted.textContent).toContain("Retenir ce créneau");
  });

  it("renders unavailable and partial forecast states without inventing metric values", () => {
    const unavailable = mount(
      <PreparationForecastBlock
        weather={forecastWeather({ weatherStatus: "empty", forecastDays: [], selectedForecastDay: null, selectedForecastRisk: null, forecastSelectionStatus: "unavailable" })}
        actionDate="2026-10-20"
        fr={true}
      />,
    );
    expect(unavailable.textContent).toContain("Prévision indisponible pour cette date");
    expect(unavailable.textContent).toContain("La date de l’action dépasse l’horizon prévisionnel");
    expect(unavailable.textContent).toContain("—");
    expect(unavailable.textContent).not.toContain("Utiliser cette date");
    unmount();

    const partialDay = forecastDay({ min: null, max: null, rain: null, wind: null });
    const partial = mount(
      <PreparationForecastBlock
        weather={forecastWeather({ forecastDays: [partialDay], selectedForecastDay: partialDay, selectedForecastRisk: null, windows: { recommended: [], avoid: [] } })}
        actionDate=""
        fr={false}
      />,
    );
    expect(partial.textContent).toContain("Unavailable");
    expect(partial.textContent).not.toContain("Favorable slot from available hours");
    expect(partial.textContent).toContain("Temperature");
    expect(partial.textContent).not.toContain("Keep this slot");
  });

  it("changes the selected forecast day without changing preparation or server state", () => {
    const setDay = vi.fn();
    const onSelection = vi.fn();
    const mounted = mount(
      <PreparationForecastBlock weather={forecastWeather({ setSelectedForecastDayIndex: setDay })} actionDate="2026-10-20" onPreparationSelection={onSelection} fr={true} />,
    );

    clickButton("Jeudi 22 oct.");

    expect(setDay).toHaveBeenCalledWith(1);
    expect(onSelection).not.toHaveBeenCalled();
    expect(mounted.textContent).toContain("La consultation ne modifie pas l’action");
  });

  it("applies a date or slot selection with the exact payload when there is no conflict", () => {
    const context = buildActionPreparationContext({ draft: {} });
    const onSelection = vi.fn((selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => resolvePreparationSelection(context, selection, decision));
    mount(
      <PreparationForecastBlock weather={forecastWeather({ windows: { recommended: [forecastWindow()], avoid: [] } })} actionDate="" onPreparationSelection={onSelection} fr={true} />,
    );

    clickButton("Utiliser cette date");
    expect(onSelection).toHaveBeenCalledWith({ actionDate: "2026-10-21", source: "weather-date" });
    expect(document.querySelector('[role="alert"]')).toBeNull();

    clickButton("Retenir ce créneau");
    expect(onSelection).toHaveBeenCalledWith({ actionDate: "2026-10-21", departureTime: "09:00", source: "weather-slot" });
  });

  it.each([
    ["preserve", "Garder la saisie"],
    ["replace", "Utiliser le choix météo"],
  ] as const)("requires an explicit %s decision after a preparation conflict", (decision, confirmationLabel) => {
    const context = buildActionPreparationContext({ draft: { actionDate: "2026-10-20", departureTime: "08:00" } });
    const onSelection = vi.fn((selection: PreparationSelection, selectedDecision?: "ask" | "replace" | "preserve") => resolvePreparationSelection(context, selection, selectedDecision));
    mount(
      <PreparationForecastBlock weather={forecastWeather({ windows: { recommended: [forecastWindow()], avoid: [] } })} actionDate="2026-10-20" onPreparationSelection={onSelection} fr={true} />,
    );

    clickButton("Retenir ce créneau");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Une date ou une heure est déjà renseignée");
    clickButton(confirmationLabel);

    expect(onSelection).toHaveBeenLastCalledWith(
      { actionDate: "2026-10-21", departureTime: "09:00", source: "weather-slot" },
      decision,
    );
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it("does not render modification actions when the selection callback is absent", () => {
    const mounted = mount(
      <PreparationForecastBlock weather={forecastWeather({ windows: { recommended: [forecastWindow()], avoid: [] } })} actionDate="" fr={true} />,
    );

    expect(mounted.textContent).not.toContain("Utiliser cette date");
    expect(mounted.textContent).not.toContain("Retenir ce créneau");
    expect(mounted.textContent).not.toContain("La consultation ne modifie pas l’action");
  });

  it("renders the English variants for forecast, risks and selection controls", () => {
    const mounted = mount(
      <PreparationForecastBlock weather={forecastWeather({ selectedForecastRisk: RED_RISK, windows: { recommended: [forecastWindow({ level: "rouge" })], avoid: [] } })} actionDate="" onPreparationSelection={vi.fn()} fr={false} />,
    );

    expect(mounted.textContent).toContain("Forecast and suggested slot");
    expect(mounted.textContent).toContain("High");
    expect(mounted.textContent).toContain("Use this date");
    expect(mounted.textContent).toContain("Keep this slot");

    unmount();
    const englishPanel = mount(panel({ selectedForecastRisk: RED_RISK, weatherStatus: "ready", fr: false }));
    expect(englishPanel.textContent).toContain("Priority weather guidance for the selected day");
  });
});
