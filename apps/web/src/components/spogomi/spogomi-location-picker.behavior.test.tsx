// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => function DynamicLocationMap({ onSelect }: { onSelect: (coordinates: { latitude: number; longitude: number }) => void }) {
    return <button type="button" data-testid="map-select" onClick={() => onSelect({ latitude: 48.85, longitude: 2.35 })}>Sélectionner sur la carte</button>;
  },
}));

vi.mock("@/components/actions/action-declaration/action-address-autocomplete", () => ({
  ActionAddressAutocomplete: ({ onChange }: { onChange: (value: string, coordinates?: { latitude: number; longitude: number } | null) => void }) => (
    <div>
      <button type="button" data-testid="address-select" onClick={() => onChange("12 Rue de Rivoli, 75004 Paris", { latitude: 48.8557, longitude: 2.3562 })}>Sélectionner une adresse</button>
      <button type="button" data-testid="text-only" onClick={() => onChange("Paris", null)}>Saisir un libellé seul</button>
    </div>
  ),
}));

import { SpogomiLocationPicker } from "./spogomi-location-picker";

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

describe("SpogomiLocationPicker", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it("keeps the place label separate from selected coordinates and builds a Google Maps link", async () => {
    let value = "";
    let coordinates: { latitude: number; longitude: number } | null = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const render = () => root?.render(<SpogomiLocationPicker value={value} coordinates={coordinates} onChange={(nextValue, nextCoordinates) => { value = nextValue; coordinates = nextCoordinates; render(); }} />);
    await act(async () => { render(); });
    await act(async () => { (container?.querySelector('[data-testid="address-select"]') as HTMLButtonElement).click(); });

    expect(container?.textContent).toContain("48.8557000");
    const googleMapsLink = container?.querySelector('a[href*="google.com/maps"]') as HTMLAnchorElement | null;
    expect(googleMapsLink?.href).toContain("48.8557,2.3562");

    await act(async () => { (container?.querySelector('[data-testid="map-select"]') as HTMLButtonElement).click(); });
    expect(container?.textContent).toContain("48.8500000");
    expect(container?.textContent).toContain("2.3500000");

    await act(async () => { (container?.querySelector('[data-testid="text-only"]') as HTMLButtonElement).click(); });
    expect(container?.textContent).toContain("À sélectionner");
    expect(container?.querySelector('a[href*="google.com/maps"]')).toBeNull();
  });
});
