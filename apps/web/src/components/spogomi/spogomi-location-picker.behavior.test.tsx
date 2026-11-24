// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionLocationCoordinates } from "@/lib/actions/types";

const mapCallbacks = vi.hoisted(() => ({
  onSelect: null as ((coordinates: ActionLocationCoordinates) => void) | null,
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicLocationMap({
    onSelect,
  }: {
    onSelect: (coordinates: ActionLocationCoordinates) => void;
  }) {
    mapCallbacks.onSelect = onSelect;
    return (
      <div>
        <button
          type="button"
          data-testid="map-click-b"
          onClick={() => onSelect({ latitude: 48.85, longitude: 2.35 })}
        >
          Cliquer point B
        </button>
        <button
          type="button"
          data-testid="map-drag-c"
          onClick={() => onSelect({ latitude: 48.86123, longitude: 2.34123 })}
        >
          Déplacer épingle C
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/actions/action-declaration/action-address-autocomplete.model", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/components/actions/action-declaration/action-address-autocomplete.model")
  >();
  const defaultSuggestions = [
    {
      label: "12 Rue de Rivoli, 75004 Paris",
      subtitle: "75004 Paris",
      latitude: 48.8557,
      longitude: 2.3562,
    },
    {
      label: "20 Avenue de l'Opéra, 75001 Paris",
      subtitle: "75001 Paris",
      latitude: 48.8662,
      longitude: 2.3338,
    },
  ];
  return {
    ...actual,
    loadRemoteAddressSuggestions: vi.fn(async () => defaultSuggestions),
    loadRemoteAddressSuggestionsWithStatus: vi.fn(async () => ({
      status: "ok",
      items: defaultSuggestions,
    })),
  };
});

import { formatSpogomiMapPointLabel, SpogomiLocationPicker } from "./spogomi-location-picker";

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, nextValue: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("SpogomiLocationPicker", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    vi.useRealTimers();
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    mapCallbacks.onSelect = null;
  });

  function mountPicker() {
    let value = "";
    let coordinates: ActionLocationCoordinates | null = null;
    const onChangeSpy = vi.fn((nextValue: string, nextCoordinates: ActionLocationCoordinates | null) => {
      value = nextValue;
      coordinates = nextCoordinates;
      render();
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const render = () =>
      root?.render(
        <form>
          <SpogomiLocationPicker value={value} coordinates={coordinates} onChange={onChangeSpy} />
        </form>,
      );

    return {
      render,
      getState: () => ({ value, coordinates }),
      onChangeSpy,
    };
  }

  it("fills both locationLabel and coordinates on blank-form map click and enables form validity", async () => {
    const { render, getState, onChangeSpy } = mountPicker();
    await act(async () => {
      render();
    });

    const form = container!.querySelector("form")!;
    const input = container!.querySelector<HTMLInputElement>("#spogomi-create-locationLabel")!;
    expect(input.required).toBe(true);
    expect(form.checkValidity()).toBe(false);

    await act(async () => {
      container!.querySelector<HTMLButtonElement>('[data-testid="map-click-b"]')!.click();
    });

    const expectedLabel = formatSpogomiMapPointLabel({ latitude: 48.85, longitude: 2.35 });
    expect(expectedLabel).toBe("Point choisi sur la carte (48.85000, 2.35000)");
    expect(onChangeSpy).toHaveBeenLastCalledWith(expectedLabel, { latitude: 48.85, longitude: 2.35 });
    expect(getState()).toEqual({
      value: expectedLabel,
      coordinates: { latitude: 48.85, longitude: 2.35 },
    });
    expect(input.value).toBe(expectedLabel);
    expect(form.checkValidity()).toBe(true);
    expect(container!.textContent).toContain("48.8500000");
    expect(container!.textContent).toContain("2.3500000");
    expect(container!.querySelector('[data-testid="spogomi-location-source"]')?.textContent).toContain(
      "point choisi manuellement sur la carte",
    );
    const googleMapsLink = container!.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]');
    expect(googleMapsLink?.href).toContain("48.85,2.35");
  });

  it("replaces an autocomplete address label on map click/drag, restores real label on new suggestion, and clears coordinates on invalid text or parses Google Maps links", async () => {
    vi.useFakeTimers();
    const { render, getState, onChangeSpy } = mountPicker();
    await act(async () => {
      render();
    });

    const input = container!.querySelector<HTMLInputElement>("#spogomi-create-locationLabel")!;

    // 1. Select address A via autocomplete
    await act(async () => {
      input.focus();
      setInputValue(input, "12 Rue de Rivoli");
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const firstSuggestion = Array.from(container!.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((btn) =>
      btn.textContent?.includes("12 Rue de Rivoli, 75004 Paris"),
    );
    expect(firstSuggestion).toBeDefined();
    await act(async () => {
      firstSuggestion!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(getState()).toEqual({
      value: "12 Rue de Rivoli, 75004 Paris",
      coordinates: { latitude: 48.8557, longitude: 2.3562 },
    });
    expect(container!.querySelector('[data-testid="spogomi-location-source"]')?.textContent).toContain(
      "adresse ou lien Google Maps géolocalisé",
    );

    // 2. Click on map at B -> overwrites A's label with non-misleading map label
    await act(async () => {
      container!.querySelector<HTMLButtonElement>('[data-testid="map-click-b"]')!.click();
    });
    expect(getState()).toEqual({
      value: "Point choisi sur la carte (48.85000, 2.35000)",
      coordinates: { latitude: 48.85, longitude: 2.35 },
    });
    expect(input.value).toBe("Point choisi sur la carte (48.85000, 2.35000)");
    expect(container!.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]')?.href).toContain("48.85,2.35");

    // 3. Drag marker to C -> updates both label and coordinates simultaneously
    await act(async () => {
      container!.querySelector<HTMLButtonElement>('[data-testid="map-drag-c"]')!.click();
    });
    expect(getState()).toEqual({
      value: "Point choisi sur la carte (48.86123, 2.34123)",
      coordinates: { latitude: 48.86123, longitude: 2.34123 },
    });
    expect(container!.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]')?.href).toContain(
      "48.86123,2.34123",
    );

    // 4. Select new address suggestion -> recovers real address label
    await act(async () => {
      input.focus();
      setInputValue(input, "20 Avenue de l'Opéra");
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });
    const secondSuggestion = Array.from(container!.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((btn) =>
      btn.textContent?.includes("20 Avenue de l'Opéra, 75001 Paris"),
    );
    expect(secondSuggestion).toBeDefined();
    await act(async () => {
      secondSuggestion!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(getState()).toEqual({
      value: "20 Avenue de l'Opéra, 75001 Paris",
      coordinates: { latitude: 48.8662, longitude: 2.3338 },
    });
    expect(container!.querySelector('[data-testid="spogomi-location-source"]')?.textContent).toContain(
      "adresse ou lien Google Maps géolocalisé",
    );

    // 5. Free invalid text edit -> clears coordinates and removes Google Maps link
    await act(async () => {
      setInputValue(input, "Paris centre");
    });
    expect(getState()).toEqual({
      value: "Paris centre",
      coordinates: null,
    });
    expect(container!.textContent).toContain("À sélectionner");
    expect(container!.querySelector('a[href*="google.com/maps"]')).toBeNull();
    expect(container!.querySelector('[data-testid="spogomi-location-source"]')).toBeNull();

    // 6. Paste a Google Maps link -> parses coordinates accurately
    await act(async () => {
      setInputValue(input, "https://www.google.com/maps/search/?api=1&query=48.8700,2.3100");
    });
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      "https://www.google.com/maps/search/?api=1&query=48.8700,2.3100",
      { latitude: 48.87, longitude: 2.31 },
    );
    expect(container!.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]')?.href).toContain("48.87,2.31");
  });
});
