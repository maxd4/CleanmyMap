// @vitest-environment jsdom

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ROUTE_OPTIONS,
} from "./route-draft-storage";
import { RouteOriginControls } from "./route-section.origin-controls";
import type { RouteOptions, RouteOriginMode, RouteRecommendationOrigin } from "./route-types";
import { buildBoundedRouteStartZone } from "@/lib/route/route-start-location";

vi.mock("lucide-react", () => ({ MapPin: () => null }));
vi.mock("@/components/actions/action-declaration/action-address-autocomplete", () => ({
  ActionAddressAutocomplete: ({
    id,
    label,
    onChange,
  }: {
    id: string;
    label: string;
    onChange: (label: string, coordinates?: { latitude: number; longitude: number } | null) => void;
  }) => createElement(
    "button",
    {
      type: "button",
      "data-testid": id,
      onClick: () => onChange(label, { latitude: 48.85705, longitude: 2.3509 }),
    },
    label,
  ),
}));

const preciseAddress: RouteOptions = {
  ...DEFAULT_ROUTE_OPTIONS,
  startLocation: {
    mode: "precise",
    label: "Adresse enregistrée",
    origin: { latitude: 48.8566, longitude: 2.3522, source: "address" },
  },
};

const preciseGps: RouteOptions = {
  ...DEFAULT_ROUTE_OPTIONS,
  startLocation: {
    mode: "precise",
    label: "GPS 48.856600, 2.352200",
    origin: { latitude: 48.8566, longitude: 2.3522, source: "gps" },
  },
};

const confirmedZone = {
  ...DEFAULT_ROUTE_OPTIONS,
  startLocation: {
    mode: "zone" as const,
    label: "Quartier test",
    zone: {
      ...buildBoundedRouteStartZone(
        "Quartier test",
        { latitude: 48.85705, longitude: 2.3509 },
        2,
      ),
      confirmed: true,
    },
  },
};

function Harness({ initialOptions, initialMode }: { initialOptions: RouteOptions; initialMode: RouteOriginMode }) {
  const [options, setOptions] = useState(initialOptions);
  const [originMode, setOriginModeState] = useState(initialMode);
  const [mapOrigin, setMapOrigin] = useState<RouteRecommendationOrigin | null>(
    initialOptions.startLocation?.mode === "precise" && initialOptions.startLocation.origin.source === "map"
      ? initialOptions.startLocation.origin
      : null,
  );

  const setOriginMode = (mode: RouteOriginMode) => {
    setOriginModeState(mode);
    if (mode !== "map") setMapOrigin(null);
    setOptions((previous) => {
      const selection = previous.startLocation;
      const keepsSelection = mode === "zone"
        ? selection?.mode === "zone"
        : mode === "map"
          ? selection?.mode === "precise" && selection.origin.source === "map"
          : selection?.mode === "precise" && selection.origin.source === mode;
      return keepsSelection ? previous : { ...previous, startLocation: undefined };
    });
  };

  return createElement(
    "div",
    null,
    createElement(RouteOriginControls, {
      fr: true,
      options,
      setOptions,
      originMode,
      setOriginMode,
      mapOrigin,
      clearMapOrigin: () => {
        setMapOrigin(null);
        setOptions((previous) => ({
          ...previous,
          ...(previous.startLocation?.mode === "precise" && previous.startLocation.origin.source === "map"
            ? { startLocation: undefined }
            : {}),
        }));
      },
      originSelectionError: false,
    }),
    createElement("output", { "data-testid": "route-options" }, JSON.stringify(options)),
    createElement("output", { "data-testid": "route-origin-mode" }, originMode),
  );
}

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function renderHarness(initialOptions: RouteOptions, initialMode: RouteOriginMode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root?.render(createElement(Harness, { initialOptions, initialMode })));
}

function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  act(() => element?.click());
}

function currentOptions(): RouteOptions {
  return JSON.parse(document.querySelector("[data-testid='route-options']")?.textContent ?? "{}");
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

describe("RouteOriginControls effective origin selection", () => {
  it("keeps Zone selected before geocoding and confirms the selected area", () => {
    renderHarness(preciseAddress, "address");

    click("input[value='zone']");

    expect(document.querySelector<HTMLInputElement>("input[value='zone']")?.checked).toBe(true);
    expect(document.querySelector("[data-testid='route-start-zone']")).not.toBeNull();
    expect(currentOptions().startLocation).toBeUndefined();

    click("[data-testid='route-start-zone']");
    click("button:not([data-testid])");

    expect(currentOptions().startLocation).toMatchObject({
      mode: "zone",
      label: "Zone de départ",
      zone: { confirmed: true },
    });
  });

  it("moves from a confirmed Zone to precise mode without retaining the zone", () => {
    renderHarness(confirmedZone, "zone");

    click("input[value='precise']");

    expect(document.querySelector<HTMLInputElement>("input[value='precise']")?.checked).toBe(true);
    expect(document.querySelector("[data-testid='route-start-zone']")).toBeNull();
    expect(currentOptions().startLocation).toBeUndefined();
  });

  it.each([
    ["address", preciseAddress],
    ["gps", preciseGps],
  ] as const)("invalidates the previous %s origin when current position is selected", (_source, options) => {
    renderHarness(options, _source);

    click("input[name='route-precise-source']");

    expect(document.querySelector("[data-testid='route-origin-mode']")?.textContent).toBe("browser");
    expect(currentOptions().startLocation).toBeUndefined();
  });

  it("invalidates a map selection explicitly without changing other modes", () => {
    const mapOptions: RouteOptions = {
      ...DEFAULT_ROUTE_OPTIONS,
      startLocation: {
        mode: "precise",
        label: "Point choisi sur la carte",
        origin: { latitude: 48.857, longitude: 2.35, source: "map" },
      },
    };
    renderHarness(mapOptions, "map");

    click("button:not([data-testid])");

    expect(currentOptions().startLocation).toBeUndefined();
    expect(document.querySelector("[data-testid='route-origin-mode']")?.textContent).toBe("map");
  });
});
